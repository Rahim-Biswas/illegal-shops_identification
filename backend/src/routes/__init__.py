"""
Routes package initialization.
"""
from . import auth, users, complaints, kobo, minio_routes, yolo_routes

__all__ = ["auth", "users", "complaints", "kobo", "minio_routes", "yolo_routes"]
