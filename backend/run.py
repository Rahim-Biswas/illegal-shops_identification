"""
run.py — Start the GEO AI Complaint System FastAPI backend server.

Usage (from the backend/ directory):
    python run.py                  # normal mode
    python run.py --prod           # production mode (no reload, workers=4)
    python run.py --host 0.0.0.0   # custom host
    python run.py --port 8080      # custom port
"""
import sys
import os
import argparse

# Ensure src/ is importable when running from backend/
sys.path.insert(0, os.path.dirname(__file__))

import uvicorn
from src.config import settings


def parse_args():
    parser = argparse.ArgumentParser(description="GEO AI Complaint System API Server")
    parser.add_argument("--host", default=settings.HOST, help="Host to bind (default: from .env)")
    parser.add_argument("--port", type=int, default=settings.PORT, help="Port to listen on (default: from .env)")
    parser.add_argument("--prod", action="store_true", help="Run in production mode (no auto-reload, multi-worker)")
    parser.add_argument("--workers", type=int, default=1, help="Number of worker processes (prod mode only)")
    return parser.parse_args()


def main():
    args = parse_args()

    is_dev = not args.prod

    print("=" * 55)
    print("  GEO AI Complaint System - API Server")
    print("=" * 55)
    print(f"  Mode    : {'Development (auto-reload)' if is_dev else 'Production'}")
    print(f"  URL     : http://{args.host}:{args.port}")
    print(f"  Docs    : http://{args.host}:{args.port}/docs")
    print(f"  DB      : {settings.DATABASE_URL.split('@')[-1] if '@' in settings.DATABASE_URL else settings.DATABASE_URL}")
    print("=" * 55)

    uvicorn.run(
        "src.main:app",
        host=args.host,
        port=args.port,
        reload=is_dev,
        workers=args.workers if not is_dev else 1,
        log_level="debug" if settings.DEBUG else "info",
    )


if __name__ == "__main__":
    main()
