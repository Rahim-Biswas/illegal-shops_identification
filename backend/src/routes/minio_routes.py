"""
MinIO Street-Data routes.

Endpoints
---------
GET  /api/minio/folders           – full recursive tree of all folders + files
GET  /api/minio/folders/{folder}  – subtree rooted at a specific top-level folder
POST /api/minio/folders/{folder}  – upload one or more files into a folder
DELETE /api/minio/folders/{folder}         – delete an entire folder (all objects)
DELETE /api/minio/folders/{folder}/{file}  – delete a single file
"""

import io
import logging
from datetime import timedelta
from typing import List, Dict, Any

from fastapi import APIRouter, HTTPException, UploadFile, File, Body, status
from fastapi.responses import JSONResponse, StreamingResponse
from minio import Minio
from minio.error import S3Error

from src.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/minio", tags=["MinIO Street Data"])


# ── MinIO client ───────────────────────────────────────────────────────────────

def _get_client() -> Minio:
    url = settings.MINIO_URL.replace("http://", "").replace("https://", "").rstrip("/")
    secure = settings.MINIO_URL.startswith("https://")
    return Minio(
        url,
        access_key=settings.MINIO_ACCESS_KEY,
        secret_key=settings.MINIO_SECRET_KEY,
        secure=secure,
    )


def _ensure_bucket(client: Minio) -> None:
    if not client.bucket_exists(settings.MINIO_BUCKET):
        client.make_bucket(settings.MINIO_BUCKET)


# ── Tree builder ───────────────────────────────────────────────────────────────

def _build_tree(client: Minio, prefix: str = "") -> List[Dict[str, Any]]:
    """
    Scan every object in the bucket (under `prefix`) and build a recursive
    folder → subfolder → file tree.

    Returns a list of top-level folder nodes, each shaped like:
    {
      "name": str,
      "path": str,           # full prefix path in the bucket
      "subfolders": [...],   # recursive same structure
      "files": [...],        # leaf file objects
      "total_files": int,
      "total_size": int,
    }
    """
    # Raw dict tree: each node is {"_children": {}, "_files": []}
    raw: Dict[str, Any] = {"_children": {}, "_files": []}

    for obj in client.list_objects(settings.MINIO_BUCKET, prefix=prefix, recursive=True):
        if obj.is_dir:
            continue  # skip explicit directory markers

        # Strip leading prefix so paths are relative to what we asked for
        key = obj.object_name
        if prefix:
            key = key[len(prefix):]

        parts = key.split("/")
        filename = parts[-1]
        if not filename:        # trailing-slash directory marker
            continue

        # Navigate / create the in-memory tree
        node = raw
        for folder_part in parts[:-1]:
            if folder_part not in node["_children"]:
                node["_children"][folder_part] = {"_children": {}, "_files": []}
            node = node["_children"][folder_part]

        node["_files"].append({
            "name": filename,
            "full_key": obj.object_name,
            "size": obj.size,
            "last_modified": obj.last_modified.isoformat() if obj.last_modified else None,
            "etag": obj.etag,
        })

    def _node_to_dict(name: str, node: dict, parent_path: str) -> Dict[str, Any]:
        path = f"{parent_path}/{name}" if parent_path else name
        subfolders = [
            _node_to_dict(child_name, child_node, path)
            for child_name, child_node in sorted(node["_children"].items())
        ]
        files = sorted(node["_files"], key=lambda f: f["name"])
        total_files = len(files) + sum(sf["total_files"] for sf in subfolders)
        total_size  = (
            sum(f.get("size") or 0 for f in files)
            + sum(sf["total_size"] for sf in subfolders)
        )
        return {
            "name": name,
            "path": path,
            "subfolders": subfolders,
            "files": files,
            "total_files": total_files,
            "total_size": total_size,
        }

    return [
        _node_to_dict(name, node, prefix.rstrip("/") if prefix else "")
        for name, node in sorted(raw["_children"].items())
    ]


# ── Routes ─────────────────────────────────────────────────────────────────────

@router.get("/folders", summary="Full recursive tree of all folders and files")
async def list_all_folders():
    """
    Returns the complete folder/file tree for the bucket.
    Every subfolder is nested inside its parent, no flattening.
    """
    try:
        client = _get_client()
        _ensure_bucket(client)
        tree = _build_tree(client, prefix="")
        total_files = sum(f["total_files"] for f in tree)
        total_size  = sum(f["total_size"]  for f in tree)
        return JSONResponse(content={
            "bucket": settings.MINIO_BUCKET,
            "folders": tree,
            "total_folders": len(tree),
            "total_files": total_files,
            "total_size": total_size,
        })
    except S3Error as exc:
        logger.error("MinIO S3Error on list_all_folders: %s", exc)
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc))
    except Exception as exc:
        logger.error("Unexpected error on list_all_folders: %s", exc)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc))


@router.get("/folders/{folder:path}", summary="Subtree rooted at a specific folder")
async def list_folder(folder: str):
    """
    Returns the recursive tree rooted at the given folder path.
    """
    try:
        client = _get_client()
        _ensure_bucket(client)
        prefix = folder.strip("/") + "/"
        subtree = _build_tree(client, prefix=prefix)
        # Wrap in a single root node for the requested folder
        root_files: List[dict] = []
        # Files directly in the folder (depth=0 of the prefix) land in
        # raw["_files"]; _build_tree returns them as children without a
        # parent node, so we collect them separately.
        for obj in client.list_objects(settings.MINIO_BUCKET, prefix=prefix, recursive=False):
            if not obj.is_dir:
                fname = obj.object_name[len(prefix):]
                if fname:
                    root_files.append({
                        "name": fname,
                        "full_key": obj.object_name,
                        "size": obj.size,
                        "last_modified": obj.last_modified.isoformat() if obj.last_modified else None,
                        "etag": obj.etag,
                    })
        total_files = sum(sf["total_files"] for sf in subtree) + len(root_files)
        total_size  = sum(sf["total_size"]  for sf in subtree) + sum(f.get("size") or 0 for f in root_files)
        return JSONResponse(content={
            "bucket": settings.MINIO_BUCKET,
            "folder": folder,
            "subfolders": subtree,
            "files": root_files,
            "total_files": total_files,
            "total_size": total_size,
        })
    except S3Error as exc:
        logger.error("MinIO S3Error on list_folder(%s): %s", folder, exc)
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc))
    except Exception as exc:
        logger.error("Unexpected error on list_folder(%s): %s", folder, exc)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc))


@router.post("/folders/{folder:path}", summary="Upload files into a folder", status_code=status.HTTP_201_CREATED)
async def upload_to_folder(
    folder: str,
    files: List[UploadFile] = File(...),
):
    """
    Upload one or more files into the specified folder (prefix).
    Object key: `<folder>/<original_filename>`.
    """
    try:
        client = _get_client()
        _ensure_bucket(client)
        uploaded = []
        for upload in files:
            data = await upload.read()
            object_name = f"{folder.rstrip('/')}/{upload.filename}"
            client.put_object(
                bucket_name=settings.MINIO_BUCKET,
                object_name=object_name,
                data=io.BytesIO(data),
                length=len(data),
                content_type=upload.content_type or "application/octet-stream",
            )
            uploaded.append({"object_key": object_name, "size": len(data)})
            logger.info("Uploaded %s to bucket %s", object_name, settings.MINIO_BUCKET)
        return JSONResponse(
            status_code=status.HTTP_201_CREATED,
            content={
                "message": f"{len(uploaded)} file(s) uploaded to folder '{folder}'.",
                "uploaded": uploaded,
            },
        )
    except S3Error as exc:
        logger.error("MinIO S3Error on upload_to_folder(%s): %s", folder, exc)
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc))
    except Exception as exc:
        logger.error("Unexpected error on upload_to_folder(%s): %s", folder, exc)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc))


@router.delete("/folders/{folder:path}", summary="Delete an entire folder or a single file")
async def delete_folder_or_file(folder: str):
    """
    If the path matches an object exactly → delete that file.
    Otherwise → delete every object whose key starts with `<folder>/`.
    """
    prefix = folder.strip("/") + "/"
    try:
        client = _get_client()
        # Collect all objects under the prefix
        objects = list(client.list_objects(settings.MINIO_BUCKET, prefix=prefix, recursive=True))
        if not objects:
            # Try exact object key (single-file delete)
            try:
                client.stat_object(settings.MINIO_BUCKET, folder)
                client.remove_object(settings.MINIO_BUCKET, folder)
                logger.info("Deleted file %s", folder)
                return JSONResponse(content={"message": f"File '{folder}' deleted.", "deleted": [folder]})
            except S3Error:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"'{folder}' not found in bucket.",
                )
        deleted_keys = []
        for obj in objects:
            client.remove_object(settings.MINIO_BUCKET, obj.object_name)
            deleted_keys.append(obj.object_name)
            logger.info("Deleted %s", obj.object_name)
        return JSONResponse(content={
            "message": f"Folder '{folder}' deleted ({len(deleted_keys)} object(s) removed).",
            "deleted": deleted_keys,
        })
    except HTTPException:
        raise
    except S3Error as exc:
        logger.error("MinIO S3Error on delete(%s): %s", folder, exc)
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc))
    except Exception as exc:
        logger.error("Unexpected error on delete(%s): %s", folder, exc)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc))


# ── File streaming proxy ───────────────────────────────────────────────────────

@router.get("/stream/{file_path:path}", summary="Stream a file through the backend")
async def stream_file(file_path: str):
    """
    Proxies the raw file bytes from MinIO so the browser never needs direct
    MinIO access.  Supports images, videos (with Accept-Ranges) and any other
    object type.
    """
    try:
        client = _get_client()
        stat   = client.stat_object(settings.MINIO_BUCKET, file_path)
        resp   = client.get_object(settings.MINIO_BUCKET, file_path)

        def _iter():
            try:
                for chunk in resp.stream(65536):
                    yield chunk
            finally:
                resp.close()
                resp.release_conn()

        content_type = stat.content_type or "application/octet-stream"
        filename     = file_path.split("/")[-1]
        return StreamingResponse(
            _iter(),
            media_type=content_type,
            headers={
                "Content-Disposition": f'inline; filename="{filename}"',
                "Content-Length": str(stat.size),
                "Accept-Ranges": "bytes",
                "Cache-Control": "private, max-age=3600",
            },
        )
    except S3Error as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except Exception as exc:
        logger.error("stream_file error (%s): %s", file_path, exc)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc))


# ── Virtual folder creation ────────────────────────────────────────────────────

@router.post("/create-folder", summary="Create a new virtual folder", status_code=status.HTTP_201_CREATED)
async def create_folder(body: dict = Body(...)):
    """
    Object-storage has no real directories.  We create a zero-byte
    `.keep` placeholder so the folder appears in listings immediately.
    """
    folder_path = (body.get("path") or "").strip("/")
    if not folder_path:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="'path' is required.")
    try:
        client      = _get_client()
        _ensure_bucket(client)
        placeholder = f"{folder_path}/.keep"
        client.put_object(
            bucket_name  = settings.MINIO_BUCKET,
            object_name  = placeholder,
            data         = io.BytesIO(b""),
            length       = 0,
            content_type = "application/x-directory",
        )
        logger.info("Created virtual folder %s", folder_path)
        return JSONResponse(
            status_code=status.HTTP_201_CREATED,
            content={"message": f"Folder '{folder_path}' created.", "path": folder_path},
        )
    except S3Error as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc))
    except Exception as exc:
        logger.error("create_folder error (%s): %s", folder_path, exc)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc))
