"""
YOLO Detection Routes — Municipality GeoAI Enforcement Platform.

Endpoints
---------
GET  /api/yolo/status             – model load status & class names
POST /api/yolo/detect             – run detection on MinIO file(s)
GET  /api/yolo/result/{job_id}    – poll async job result
GET  /api/yolo/jobs               – list recent jobs
DELETE /api/yolo/jobs/{job_id}    – clear a job from memory
"""

import io
import uuid
import logging
import time
import threading
from datetime import datetime
from typing import List, Optional, Dict, Any

from fastapi import APIRouter, HTTPException, Body, status, BackgroundTasks
from fastapi.responses import JSONResponse, StreamingResponse
from minio import Minio
from minio.error import S3Error

from src.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/yolo", tags=["YOLO Detection"])

HARDCODED_MODEL_PATH = "trained_models/telecom_tower_18_may/best.pt"

# ── In-memory job store ────────────────────────────────────────────────────────
# { job_id: { status, created_at, files, results, error, conf, iou } }
_JOBS: Dict[str, Dict[str, Any]] = {}
_JOBS_LOCK = threading.Lock()
MAX_JOBS = 50          # keep at most N recent jobs
MODEL_CACHE = {}       # { model_path: YOLO instance }


# ── Helpers ────────────────────────────────────────────────────────────────────

def _get_minio() -> Minio:
    url = settings.MINIO_URL.replace("http://", "").replace("https://", "").rstrip("/")
    secure = settings.MINIO_URL.startswith("https://")
    return Minio(
        url,
        access_key=settings.MINIO_ACCESS_KEY,
        secret_key=settings.MINIO_SECRET_KEY,
        secure=secure,
    )


def _load_model(model_path: str):
    """Load YOLO model (cached per path). Returns model or raises."""
    if model_path in MODEL_CACHE:
        return MODEL_CACHE[model_path]
    try:
        from ultralytics import YOLO
        model = YOLO(model_path)
        MODEL_CACHE[model_path] = model
        logger.info("YOLO model loaded from %s", model_path)
        return model
    except Exception as exc:
        logger.error("Failed to load YOLO model %s: %s", model_path, exc)
        raise


def _file_is_image(name: str) -> bool:
    return name.lower().rsplit(".", 1)[-1] in {"jpg", "jpeg", "png", "bmp", "webp", "tiff", "tif"}


def _file_is_video(name: str) -> bool:
    return name.lower().rsplit(".", 1)[-1] in {"mp4", "mov", "avi", "mkv", "webm"}


def _prune_jobs():
    """Keep only the most recent MAX_JOBS entries."""
    with _JOBS_LOCK:
        if len(_JOBS) > MAX_JOBS:
            sorted_ids = sorted(_JOBS, key=lambda k: _JOBS[k]["created_at"])
            for jid in sorted_ids[: len(_JOBS) - MAX_JOBS]:
                del _JOBS[jid]


def _set_job(job_id: str, **kwargs):
    with _JOBS_LOCK:
        if job_id not in _JOBS:
            _JOBS[job_id] = {}
        _JOBS[job_id].update(kwargs)


# ── Background detection worker ────────────────────────────────────────────────

def _run_detection(job_id: str, file_keys: List[str], conf: float, iou: float, model_path: str):
    """Run YOLO inference on MinIO files (images only for now)."""
    import tempfile, os
    try:
        import cv2
        import numpy as np
    except ImportError as exc:
        _set_job(job_id, status="error", error=f"cv2 not installed: {exc}", finished_at=datetime.utcnow().isoformat())
        return

    _set_job(job_id, status="running", started_at=datetime.utcnow().isoformat())

    try:
        model = _load_model(model_path)
    except Exception as exc:
        _set_job(job_id, status="error", error=str(exc), finished_at=datetime.utcnow().isoformat())
        return

    minio_client = _get_minio()
    results_list = []
    total_detections = 0
    class_counts: Dict[str, int] = {}

    for idx, key in enumerate(file_keys):
        fname = key.split("/")[-1]
        _set_job(job_id, progress={"current": idx, "total": len(file_keys), "file": fname})

        is_image = _file_is_image(fname)
        is_video = _file_is_video(fname)

        if not (is_image or is_video):
            results_list.append({
                "file": fname,
                "key": key,
                "status": "skipped",
                "reason": "Unsupported file type — only images & videos supported.",
            })
            continue

        try:
            # Fetch file from MinIO into memory
            resp = minio_client.get_object(settings.MINIO_BUCKET, key)
            raw_bytes = resp.read()
            resp.close(); resp.release_conn()
        except S3Error as exc:
            results_list.append({"file": fname, "key": key, "status": "error", "reason": str(exc)})
            continue

        if is_image:
            try:
                nparr = np.frombuffer(raw_bytes, np.uint8)
                img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                if img is None:
                    raise ValueError("cv2.imdecode returned None — unsupported image.")

                yolo_res = model(img, conf=conf, iou=iou, device="cpu", verbose=False)[0]

                detections = []
                for box in yolo_res.boxes:
                    x1, y1, x2, y2 = map(int, box.xyxy[0])
                    cls_id   = int(box.cls[0])
                    cls_name = yolo_res.names[cls_id]
                    conf_val = float(box.conf[0])
                    detections.append({
                        "class_id":   cls_id,
                        "class_name": cls_name,
                        "confidence": round(conf_val, 4),
                        "bbox": [x1, y1, x2, y2],
                    })
                    class_counts[cls_name] = class_counts.get(cls_name, 0) + 1
                    total_detections += 1

                # Draw annotations
                for det in detections:
                    x1, y1, x2, y2 = det["bbox"]
                    label = f"{det['class_name']} {det['confidence']:.2f}"
                    cv2.rectangle(img, (x1, y1), (x2, y2), (0, 212, 255), 2)
                    (tw, th), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.65, 2)
                    cv2.rectangle(img, (x1, y1 - th - 10), (x1 + tw + 6, y1), (0, 212, 255), -1)
                    cv2.putText(img, label, (x1 + 3, y1 - 5),
                                cv2.FONT_HERSHEY_SIMPLEX, 0.65, (15, 17, 23), 2)

                # Encode annotated image as JPEG bytes → store in job
                _, buf = cv2.imencode(".jpg", img, [cv2.IMWRITE_JPEG_QUALITY, 88])
                annotated_bytes = buf.tobytes()

                # Save annotated image back to MinIO under yolo-results/
                result_key = f"yolo-results/{job_id}/{fname}"
                minio_client.put_object(
                    bucket_name=settings.MINIO_BUCKET,
                    object_name=result_key,
                    data=io.BytesIO(annotated_bytes),
                    length=len(annotated_bytes),
                    content_type="image/jpeg",
                )

                results_list.append({
                    "file":        fname,
                    "key":         key,
                    "result_key":  result_key,
                    "status":      "ok",
                    "detections":  detections,
                    "detection_count": len(detections),
                    "width":  img.shape[1],
                    "height": img.shape[0],
                })

            except Exception as exc:
                logger.error("Detection error for %s: %s", fname, exc)
                results_list.append({"file": fname, "key": key, "status": "error", "reason": str(exc)})

        elif is_video:
            # For video: extract frames, run detection, report stats (no re-upload to keep it light)
            try:
                with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as tmp:
                    tmp.write(raw_bytes)
                    tmp_path = tmp.name

                cap = cv2.VideoCapture(tmp_path)
                fps = cap.get(cv2.CAP_PROP_FPS) or 25
                frame_total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
                sample_every = max(1, int(fps))  # 1 frame per second

                frame_results = []
                frame_idx = 0
                vid_detections = 0
                vid_class_counts: Dict[str, int] = {}

                while True:
                    ret, frame = cap.read()
                    if not ret:
                        break
                    if frame_idx % sample_every == 0:
                        yolo_res = model(frame, conf=conf, iou=iou, device="cpu", verbose=False)[0]
                        dets = []
                        for box in yolo_res.boxes:
                            x1, y1, x2, y2 = map(int, box.xyxy[0])
                            cls_id   = int(box.cls[0])
                            cls_name = yolo_res.names[cls_id]
                            conf_val = float(box.conf[0])
                            dets.append({"class_name": cls_name, "confidence": round(conf_val, 4), "bbox": [x1, y1, x2, y2]})
                            vid_class_counts[cls_name] = vid_class_counts.get(cls_name, 0) + 1
                            class_counts[cls_name]     = class_counts.get(cls_name, 0) + 1
                            vid_detections += 1
                            total_detections += 1
                        if dets:
                            frame_results.append({"frame": frame_idx, "detections": dets})
                    frame_idx += 1

                cap.release()
                os.unlink(tmp_path)

                results_list.append({
                    "file":             fname,
                    "key":              key,
                    "status":           "ok",
                    "type":             "video",
                    "frames_total":     frame_total,
                    "frames_sampled":   len(frame_results),
                    "detection_count":  vid_detections,
                    "class_counts":     vid_class_counts,
                    "sample_frames":    frame_results[:20],   # first 20 for UI preview
                })

            except Exception as exc:
                logger.error("Video detection error for %s: %s", fname, exc)
                results_list.append({"file": fname, "key": key, "status": "error", "reason": str(exc)})

    summary = {
        "total_files":      len(file_keys),
        "processed":        sum(1 for r in results_list if r.get("status") == "ok"),
        "skipped":          sum(1 for r in results_list if r.get("status") == "skipped"),
        "errors":           sum(1 for r in results_list if r.get("status") == "error"),
        "total_detections": total_detections,
        "class_counts":     class_counts,
        "conf_threshold":   conf,
        "iou_threshold":    iou,
        "model_path":       model_path,
    }

    _set_job(
        job_id,
        status="done",
        results=results_list,
        summary=summary,
        finished_at=datetime.utcnow().isoformat(),
        progress={"current": len(file_keys), "total": len(file_keys), "file": ""},
    )
    logger.info("YOLO job %s done — %d detections across %d files", job_id, total_detections, len(file_keys))


# ── Routes ─────────────────────────────────────────────────────────────────────

@router.get("/status", summary="YOLO service health & loaded models")
async def yolo_status():
    """Return model cache status and whether ultralytics is installed."""
    try:
        import ultralytics
        ul_version = ultralytics.__version__
        ul_available = True
    except ImportError:
        ul_version = None
        ul_available = False

    try:
        import cv2
        cv2_version = cv2.__version__
        cv2_available = True
    except ImportError:
        cv2_version = None
        cv2_available = False

    return {
        "ultralytics_available": ul_available,
        "ultralytics_version":   ul_version,
        "opencv_available":      cv2_available,
        "opencv_version":        cv2_version,
        "loaded_models":         list(MODEL_CACHE.keys()),
        "active_jobs":           len(_JOBS),
    }


@router.post("/detect", summary="Submit YOLO detection job on MinIO files", status_code=201)
async def submit_detection(
    background_tasks: BackgroundTasks,
    body: dict = Body(...),
):
    """
    Body JSON:
    {
        "file_keys": ["folder/image1.jpg", "folder/video.mp4"],
        "conf": 0.50,
        "iou":  0.45
    }
    Returns: { "job_id": "...", "status": "queued" }
    """
    file_keys: List[str] = body.get("file_keys", [])
    model_path: str      = HARDCODED_MODEL_PATH
    conf: float          = float(body.get("conf", 0.50))
    iou:  float          = float(body.get("iou",  0.45))

    if not file_keys:
        raise HTTPException(status_code=400, detail="'file_keys' must be a non-empty list.")
    if not (0.0 < conf <= 1.0):
        raise HTTPException(status_code=400, detail="'conf' must be between 0.01 and 1.0")
    if not (0.0 < iou <= 1.0):
        raise HTTPException(status_code=400, detail="'iou' must be between 0.01 and 1.0")

    job_id = str(uuid.uuid4())
    _set_job(
        job_id,
        status="queued",
        created_at=datetime.utcnow().isoformat(),
        file_keys=file_keys,
        conf=conf,
        iou=iou,
        model_path=model_path,
        results=None,
        summary=None,
        error=None,
        progress={"current": 0, "total": len(file_keys), "file": ""},
    )
    _prune_jobs()

    background_tasks.add_task(_run_detection, job_id, file_keys, conf, iou, model_path)

    return JSONResponse(status_code=201, content={"job_id": job_id, "status": "queued", "file_count": len(file_keys)})


@router.get("/result/{job_id}", summary="Poll detection job status & results")
async def get_result(job_id: str):
    with _JOBS_LOCK:
        job = _JOBS.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found.")
    return JSONResponse(content={
        "job_id":     job_id,
        "status":     job.get("status"),
        "progress":   job.get("progress"),
        "summary":    job.get("summary"),
        "results":    job.get("results"),
        "error":      job.get("error"),
        "created_at": job.get("created_at"),
        "started_at": job.get("started_at"),
        "finished_at":job.get("finished_at"),
    })


@router.get("/jobs", summary="List recent detection jobs")
async def list_jobs():
    with _JOBS_LOCK:
        jobs = [
            {
                "job_id":     jid,
                "status":     j.get("status"),
                "created_at": j.get("created_at"),
                "file_count": len(j.get("file_keys", [])),
                "summary":    j.get("summary"),
            }
            for jid, j in sorted(_JOBS.items(), key=lambda x: x[1].get("created_at", ""), reverse=True)
        ]
    return JSONResponse(content={"jobs": jobs, "total": len(jobs)})


@router.delete("/jobs/{job_id}", summary="Remove a job from memory")
async def delete_job(job_id: str):
    with _JOBS_LOCK:
        if job_id not in _JOBS:
            raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found.")
        del _JOBS[job_id]
    return {"message": f"Job '{job_id}' removed."}


@router.get("/stream-result/{job_id}/{filename:path}", summary="Stream annotated result image")
async def stream_result_image(job_id: str, filename: str):
    """Stream an annotated result image from MinIO (yolo-results/<job_id>/<filename>)."""
    result_key = f"yolo-results/{job_id}/{filename}"
    try:
        client = _get_minio()
        stat   = client.stat_object(settings.MINIO_BUCKET, result_key)
        resp   = client.get_object(settings.MINIO_BUCKET, result_key)

        def _iter():
            try:
                for chunk in resp.stream(65536):
                    yield chunk
            finally:
                resp.close()
                resp.release_conn()

        return StreamingResponse(
            _iter(),
            media_type=stat.content_type or "image/jpeg",
            headers={
                "Content-Length": str(stat.size),
                "Cache-Control":  "private, max-age=3600",
            },
        )
    except S3Error as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
