import json
import uuid
from datetime import datetime
from pathlib import Path

import pillow_heif
from PIL import Image, ExifTags

from config import ORIGINALS_DIR, THUMBNAILS_GALLERY_DIR, THUMBNAILS_LIST_DIR

pillow_heif.register_heif_opener()

GALLERY_MAX_SIZE = 800
LIST_MAX_SIZE = 200


def _extract_exif(img: Image.Image) -> dict:
    """Extract EXIF data from image. Returns dict with parsed fields."""
    result = {
        "taken_at": None,
        "gps_lat": None,
        "gps_lng": None,
        "raw": {},
    }

    try:
        exif_data = img._getexif()
    except Exception:
        return result

    if not exif_data:
        return result

    # Build human-readable raw EXIF (serializable subset)
    tag_names = {v: k for k, v in ExifTags.TAGS.items()}
    for tag_id, value in exif_data.items():
        tag_name = ExifTags.TAGS.get(tag_id, str(tag_id))
        try:
            json.dumps(value)
            result["raw"][tag_name] = value
        except (TypeError, ValueError):
            result["raw"][tag_name] = str(value)

    # Extract date (fallback chain)
    date_tags = ["DateTimeOriginal", "DateTimeDigitized", "DateTime"]
    for tag_name in date_tags:
        tag_id = tag_names.get(tag_name)
        if tag_id and tag_id in exif_data:
            try:
                dt = datetime.strptime(exif_data[tag_id], "%Y:%m:%d %H:%M:%S")
                result["taken_at"] = dt.isoformat()
                break
            except (ValueError, TypeError):
                continue

    # Extract GPS
    gps_tag_id = tag_names.get("GPSInfo")
    if gps_tag_id and gps_tag_id in exif_data:
        gps_info = exif_data[gps_tag_id]
        try:
            result["gps_lat"] = _gps_to_decimal(
                gps_info.get(2), gps_info.get(1)  # GPSLatitude, GPSLatitudeRef
            )
            result["gps_lng"] = _gps_to_decimal(
                gps_info.get(4), gps_info.get(3)  # GPSLongitude, GPSLongitudeRef
            )
        except Exception:
            pass

    return result


def _gps_to_decimal(coords, ref) -> float | None:
    """Convert GPS coordinates from DMS to decimal degrees."""
    if not coords or not ref:
        return None
    degrees = float(coords[0])
    minutes = float(coords[1])
    seconds = float(coords[2])
    decimal = degrees + minutes / 60 + seconds / 3600
    if ref in ("S", "W"):
        decimal = -decimal
    return round(decimal, 6)


def _auto_orient(img: Image.Image) -> Image.Image:
    """Auto-rotate image based on EXIF orientation."""
    try:
        exif = img._getexif()
        if exif:
            orientation_tag = {v: k for k, v in ExifTags.TAGS.items()}.get("Orientation")
            if orientation_tag and orientation_tag in exif:
                orientation = exif[orientation_tag]
                rotations = {3: 180, 6: 270, 8: 90}
                if orientation in rotations:
                    img = img.rotate(rotations[orientation], expand=True)
    except Exception:
        pass
    return img


def _generate_thumbnail(img: Image.Image, max_size: int, output_path: Path):
    """Generate a WebP thumbnail."""
    thumb = img.copy()
    thumb.thumbnail((max_size, max_size), Image.LANCZOS)
    thumb.save(str(output_path), "WEBP", quality=80)


def process_upload(file_bytes: bytes, filename: str, manual_date: str | None = None) -> dict:
    """
    Process an uploaded photo file.
    Returns dict with file paths, EXIF data, and metadata.
    """
    from io import BytesIO

    file_id = str(uuid.uuid4())
    ext = Path(filename).suffix.lower() or ".jpg"

    # Open image
    img = Image.open(BytesIO(file_bytes))
    img = _auto_orient(img)

    # Extract EXIF
    exif = _extract_exif(Image.open(BytesIO(file_bytes)))  # re-open for raw EXIF
    has_exif_date = exif["taken_at"] is not None

    # Determine taken_at
    if exif["taken_at"]:
        taken_at = exif["taken_at"]
    elif manual_date:
        taken_at = f"{manual_date}T00:00:00"
    else:
        taken_at = None

    if taken_at is None:
        return {"error": "no_date", "has_exif_date": False}

    # Determine date for directory structure
    dt = datetime.fromisoformat(taken_at)
    year_month = f"{dt.year}/{dt.month:02d}"

    # Save original
    original_dir = ORIGINALS_DIR / year_month
    original_dir.mkdir(parents=True, exist_ok=True)
    original_path = original_dir / f"{file_id}{ext}"
    original_path.write_bytes(file_bytes)

    # Generate thumbnails
    gallery_path = THUMBNAILS_GALLERY_DIR / f"{file_id}.webp"
    list_path = THUMBNAILS_LIST_DIR / f"{file_id}.webp"

    # Convert to RGB if needed (for WebP compatibility)
    if img.mode in ("RGBA", "P"):
        rgb_img = img.convert("RGB")
    else:
        rgb_img = img

    _generate_thumbnail(rgb_img, GALLERY_MAX_SIZE, gallery_path)
    _generate_thumbnail(rgb_img, LIST_MAX_SIZE, list_path)

    return {
        "file_id": file_id,
        "file_path": str(original_path),
        "thumbnail_gallery": str(gallery_path),
        "thumbnail_list": str(list_path),
        "taken_at": taken_at,
        "gps_lat": exif["gps_lat"],
        "gps_lng": exif["gps_lng"],
        "exif_data": json.dumps(exif["raw"], ensure_ascii=False) if exif["raw"] else None,
        "has_exif_date": has_exif_date,
    }
