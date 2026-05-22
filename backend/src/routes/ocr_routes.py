import os
import json
import requests
from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException, status
from fastapi.responses import JSONResponse
from minio import Minio
from minio.error import S3Error
from src.config import settings
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/ocr", tags=["OCR Processing"])

load_dotenv()

def _get_minio_client() -> Minio:
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

def _azure_ocr(image_bytes: bytes) -> dict:
    endpoint = os.getenv("AZURE_ENDPOINT")
    key = os.getenv("AZURE_KEY")
    if not endpoint or not key:
        raise HTTPException(status_code=500, detail="Azure credentials not configured")
    url = f"{endpoint}/computervision/imageanalysis:analyze?api-version=2024-02-01&features=read"
    headers = {
        "Ocp-Apim-Subscription-Key": key,
        "Content-Type": "application/octet-stream",
    }
    response = requests.post(url, headers=headers, data=image_bytes)
    response.raise_for_status()
    return response.json()

@router.post("/folder", summary="Run OCR on all images in a MinIO folder", status_code=status.HTTP_200_OK)
async def ocr_folder(payload: dict):
    """Expect JSON body: {"folder": "path/to/folder"}
    Returns list of {"name": <image name>, "text": <extracted text>}
    """
    folder = payload.get("folder", "").strip("/")
    if not folder:
        raise HTTPException(status_code=400, detail="folder is required")
    try:
        client = _get_minio_client()
        _ensure_bucket(client)
        prefix = f"{folder}/" if folder else ""
        objects = client.list_objects(settings.MINIO_BUCKET, prefix=prefix, recursive=False)
        results = []
        for obj in objects:
            if obj.is_dir:
                continue
            ext = obj.object_name.split('.')[-1].lower()
            if ext not in ["jpg", "jpeg", "png", "tif", "tiff", "bmp"]:
                continue
            resp = client.get_object(settings.MINIO_BUCKET, obj.object_name)
            img_bytes = resp.read()
            resp.close()
            resp.release_conn()
            ocr_res = _azure_ocr(img_bytes)
            text = ""
            lines = []
            if "readResult" in ocr_res:
                for block in ocr_res["readResult"]["blocks"]:
                    for line in block["lines"]:
                        text += line["text"] + "\n"
                        line_entry = {"text": line["text"]}
                        if "boundingPolygon" in line:
                            line_entry["boundingPolygon"] = line["boundingPolygon"]
                        lines.append(line_entry)
            results.append({
                "name": obj.object_name[len(prefix):],
                "full_key": obj.object_name,
                "text": text.strip(),
                "lines": lines,
            })
        return JSONResponse(content={"folder": folder, "results": results})
    except S3Error as exc:
        logger.error("MinIO S3Error in OCR folder %s: %s", folder, exc)
        raise HTTPException(status_code=502, detail=str(exc))
    except Exception as exc:
        logger.error("Unexpected error in OCR folder %s: %s", folder, exc)
        raise HTTPException(status_code=500, detail=str(exc))

@router.post("/files", summary="Run OCR on uploaded image files", status_code=status.HTTP_200_OK)
async def ocr_files(files: list = None):
    # This endpoint is a placeholder; frontend will use FormData with files.
    # For simplicity, we handle it via FastAPI's UploadFile in a separate route if needed.
    raise HTTPException(status_code=501, detail="Not implemented")
