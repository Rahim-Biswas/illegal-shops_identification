from fastapi import APIRouter, UploadFile, File, HTTPException, status
from typing import Dict, Any, List
import pandas as pd
import io
import logging
from minio import Minio
from minio.error import S3Error
from src.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/data-files", tags=["Data Files"])

# ── MinIO Helper functions ───────────────────────────────────────────────────

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

# ── Route Implementations ─────────────────────────────────────────────────────

@router.post("/upload")
async def upload_data_file(file: UploadFile = File(...)):
    """Upload an Excel or CSV file to MinIO in custom-data/ directory and parse it."""
    if not file.filename.endswith(('.csv', '.xls', '.xlsx')):
        raise HTTPException(status_code=400, detail="Only CSV and Excel files are supported")
    
    try:
        content = await file.read()
        
        # Determine file type and validate reading with pandas
        if file.filename.endswith('.csv'):
            df = pd.read_csv(io.BytesIO(content))
        else:
            df = pd.read_excel(io.BytesIO(content))
            
        # Upload to MinIO under custom-data/ prefix
        client = _get_client()
        _ensure_bucket(client)
        
        object_name = f"custom-data/{file.filename}"
        client.put_object(
            bucket_name=settings.MINIO_BUCKET,
            object_name=object_name,
            data=io.BytesIO(content),
            length=len(content),
            content_type=file.content_type or "application/octet-stream",
        )
        logger.info("Uploaded custom data file %s to bucket %s", object_name, settings.MINIO_BUCKET)
        
        # Get table info
        table_info = {
            "filename": file.filename,
            "total_rows": len(df),
            "total_columns": len(df.columns),
            "file_size_bytes": len(content)
        }
        
        # Get fields info
        fields_info = []
        for col in df.columns:
            dtype_str = str(df[col].dtype)
            if 'int' in dtype_str:
                field_type = 'Integer'
            elif 'float' in dtype_str:
                field_type = 'Float'
            elif 'bool' in dtype_str:
                field_type = 'Boolean'
            elif 'datetime' in dtype_str:
                field_type = 'DateTime'
            else:
                field_type = 'Text'
                
            is_lat = any(x in col.lower() for x in ['lat', 'latitude', 'y'])
            is_lon = any(x in col.lower() for x in ['lon', 'longitude', 'lng', 'x'])
            
            # Clean values for sample (drop NaN, then convert to string to avoid serialization issues)
            sample_vals = df[col].dropna()
            # Replace infs with strings for safety
            import numpy as np
            sample_vals = sample_vals.replace([np.inf, -np.inf], "inf")
            sample_list = sample_vals.head(3).astype(str).tolist()
            
            fields_info.append({
                "name": col,
                "type": field_type,
                "is_latitude": is_lat,
                "is_longitude": is_lon,
                "sample_values": sample_list
            })
            
        return {
            "table_info": table_info,
            "fields_info": fields_info,
            "status": "success"
        }
        
    except S3Error as exc:
        logger.error("MinIO S3Error during upload: %s", exc)
        raise HTTPException(status_code=502, detail=f"MinIO storage error: {str(exc)}")
    except Exception as e:
        logger.error("Error parsing/uploading file: %s", e)
        raise HTTPException(status_code=500, detail=f"Error parsing file: {str(e)}")


@router.get("/list")
async def list_custom_files():
    """List all custom uploaded Excel and CSV files from MinIO."""
    try:
        client = _get_client()
        _ensure_bucket(client)
        
        prefix = "custom-data/"
        objects = client.list_objects(settings.MINIO_BUCKET, prefix=prefix, recursive=True)
        
        files_list = []
        for obj in objects:
            if obj.is_dir or obj.object_name.endswith(".keep"):
                continue
            
            # Extract filename from prefix
            filename = obj.object_name[len(prefix):]
            if not filename:
                continue
                
            files_list.append({
                "filename": filename,
                "full_key": obj.object_name,
                "size": obj.size,
                "last_modified": obj.last_modified.isoformat() if obj.last_modified else None,
            })
            
        return {"files": files_list}
    except Exception as e:
        logger.error("Error listing custom files: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/preview/{filename:path}")
async def preview_custom_file(filename: str, limit: int = 20):
    """Fetch and parse a specific file from MinIO to return its structure and preview rows."""
    try:
        client = _get_client()
        object_key = f"custom-data/{filename}"
        
        # Verify and fetch object
        stat = client.stat_object(settings.MINIO_BUCKET, object_key)
        response = client.get_object(settings.MINIO_BUCKET, object_key)
        
        content = response.read()
        response.close()
        response.release_conn()
        
        # Read content with pandas
        if filename.endswith('.csv'):
            df = pd.read_csv(io.BytesIO(content))
        else:
            df = pd.read_excel(io.BytesIO(content))
            
        # Get table info
        table_info = {
            "filename": filename,
            "total_rows": len(df),
            "total_columns": len(df.columns),
            "file_size_bytes": stat.size
        }
        
        # Get fields info
        fields_info = []
        for col in df.columns:
            dtype_str = str(df[col].dtype)
            if 'int' in dtype_str:
                field_type = 'Integer'
            elif 'float' in dtype_str:
                field_type = 'Float'
            elif 'bool' in dtype_str:
                field_type = 'Boolean'
            elif 'datetime' in dtype_str:
                field_type = 'DateTime'
            else:
                field_type = 'Text'
                
            is_lat = any(x in col.lower() for x in ['lat', 'latitude', 'y'])
            is_lon = any(x in col.lower() for x in ['lon', 'longitude', 'lng', 'x'])
            
            sample_vals = df[col].dropna()
            import numpy as np
            sample_vals = sample_vals.replace([np.inf, -np.inf], "inf")
            sample_list = sample_vals.head(3).astype(str).tolist()
            
            fields_info.append({
                "name": col,
                "type": field_type,
                "is_latitude": is_lat,
                "is_longitude": is_lon,
                "sample_values": sample_list
            })
            
        # Preview data (first N rows, converting NaN/inf to None/safe representation)
        import numpy as np
        # Replace inf with None or large value, here we replace with None to avoid JSON issues
        df_clean = df.replace([np.inf, -np.inf], np.nan)
        
        if limit <= 0:
            df_preview = df_clean.astype(object)
        else:
            df_preview = df_clean.head(limit).astype(object)
            
        df_preview = df_preview.where(pd.notnull(df_preview), None)
        preview_rows = df_preview.to_dict(orient="records")
        
        return {
            "table_info": table_info,
            "fields_info": fields_info,
            "preview_rows": preview_rows,
            "status": "success"
        }
        
    except S3Error as e:
        logger.error("MinIO S3Error on preview(%s): %s", filename, e)
        raise HTTPException(status_code=404, detail=f"File not found or storage error: {str(e)}")
    except Exception as e:
        logger.error("Unexpected error previewing file %s: %s", filename, e)
        raise HTTPException(status_code=500, detail=f"Error previewing file: {str(e)}")

@router.post("/search-ocr")
async def search_ocr_texts(payload: dict):
    """
    Search for OCR extracted texts in all custom uploaded Excel/CSV files.
    Expects payload: {"ocr_results": [{"name": "image.jpg", "text": "extracted text"}]}
    Returns matches with details.
    """
    ocr_results = payload.get("ocr_results", [])
    if not ocr_results:
        return {"matches": []}

    try:
        client = _get_client()
        _ensure_bucket(client)
        
        prefix = "custom-data/"
        objects = client.list_objects(settings.MINIO_BUCKET, prefix=prefix, recursive=True)
        
        all_matches = []
        
        # We will load each file and search
        for obj in objects:
            if obj.is_dir or obj.object_name.endswith(".keep"):
                continue
            
            filename = obj.object_name[len(prefix):]
            if not filename:
                continue
                
            response = client.get_object(settings.MINIO_BUCKET, obj.object_name)
            content = response.read()
            response.close()
            response.release_conn()
            
            if filename.endswith('.csv'):
                df = pd.read_csv(io.BytesIO(content))
            else:
                df = pd.read_excel(io.BytesIO(content))
                
            # Convert all columns to string for easy searching
            import numpy as np
            df_str = df.replace([np.inf, -np.inf], np.nan).fillna("").astype(str)
            
            for ocr_res in ocr_results:
                ocr_text = (ocr_res.get("text") or "").strip()
                if not ocr_text:
                    continue
                
                # Split OCR text into words/lines or search as a whole.
                # Since OCR can contain multiple lines, we can check if any cell value is in OCR text 
                # or if OCR text is in cell value. 
                # We'll do a simple check: if a cell value (length > 3) is a substring of OCR text, it's a match.
                
                matched_rows = []
                for idx, row in df_str.iterrows():
                    row_matched = False
                    for col in df_str.columns:
                        cell_val = row[col].strip()
                        if len(cell_val) > 3 and (cell_val in ocr_text or ocr_text in cell_val):
                            row_matched = True
                            break
                    
                    if row_matched:
                        matched_rows.append(row.to_dict())
                
                if matched_rows:
                    all_matches.append({
                        "image_name": ocr_res.get("name"),
                        "ocr_text": ocr_text,
                        "matched_file": filename,
                        "matched_rows": matched_rows
                    })
                    
        return {"matches": all_matches, "status": "success"}
        
    except Exception as e:
        logger.error("Error searching custom files: %s", e)
        raise HTTPException(status_code=500, detail=str(e))

