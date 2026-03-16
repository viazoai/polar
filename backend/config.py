import os
from pathlib import Path

DATA_DIR = Path("/app/data")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")

SECRET_KEY = os.getenv("SECRET_KEY", "polar-dev-secret-key-change-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_HOURS = 720  # 30일
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "")

MAX_UPLOAD_SIZE = 50 * 1024 * 1024  # 50MB

THUMBNAIL_GALLERY_SIZE = 800   # px
THUMBNAIL_LIST_SIZE = 200      # px
DB_PATH = DATA_DIR / "polar.db"
ORIGINALS_DIR = DATA_DIR / "originals"
THUMBNAILS_GALLERY_DIR = DATA_DIR / "thumbnails" / "gallery"
THUMBNAILS_LIST_DIR = DATA_DIR / "thumbnails" / "list"
REFERENCES_DIR = DATA_DIR / "references"


def ensure_directories():
    for d in [ORIGINALS_DIR, THUMBNAILS_GALLERY_DIR, THUMBNAILS_LIST_DIR, REFERENCES_DIR]:
        d.mkdir(parents=True, exist_ok=True)
