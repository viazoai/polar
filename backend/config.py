from pathlib import Path

DATA_DIR = Path("/app/data")

MAX_UPLOAD_SIZE = 50 * 1024 * 1024  # 50MB
DB_PATH = DATA_DIR / "polar.db"
ORIGINALS_DIR = DATA_DIR / "originals"
THUMBNAILS_GALLERY_DIR = DATA_DIR / "thumbnails" / "gallery"
THUMBNAILS_LIST_DIR = DATA_DIR / "thumbnails" / "list"
REFERENCES_DIR = DATA_DIR / "references"


def ensure_directories():
    for d in [ORIGINALS_DIR, THUMBNAILS_GALLERY_DIR, THUMBNAILS_LIST_DIR, REFERENCES_DIR]:
        d.mkdir(parents=True, exist_ok=True)
