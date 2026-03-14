from pathlib import Path

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse

from database import get_db
from models.schemas import PhotoUploadResponse
from services.photo_service import process_upload
from services.moment_service import find_or_create_moment

router = APIRouter()


@router.post("/photos/upload", response_model=PhotoUploadResponse)
async def upload_photo(
    file: UploadFile = File(...),
    taken_at: str | None = Form(None),
    uploaded_by: int | None = Form(None),
):
    file_bytes = await file.read()
    result = process_upload(file_bytes, file.filename or "photo.jpg", taken_at)

    if "error" in result:
        raise HTTPException(
            status_code=422,
            detail="촬영 날짜를 입력해주세요 (EXIF 정보가 없습니다)",
        )

    db = get_db()
    try:
        # Find or create moment by date
        date_str = result["taken_at"][:10]  # YYYY-MM-DD
        moment_id = find_or_create_moment(db, date_str)

        # Insert photo
        cursor = db.execute(
            """INSERT INTO photos
               (moment_id, file_path, thumbnail_gallery, thumbnail_list,
                taken_at, gps_lat, gps_lng, exif_data, uploaded_by)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                moment_id,
                result["file_path"],
                result["thumbnail_gallery"],
                result["thumbnail_list"],
                result["taken_at"],
                result["gps_lat"],
                result["gps_lng"],
                result["exif_data"],
                uploaded_by,
            ),
        )
        photo_id = cursor.lastrowid

        # Set as representative photo if moment doesn't have one
        moment = db.execute(
            "SELECT representative_photo_id FROM moments WHERE id = ?",
            (moment_id,),
        ).fetchone()
        if moment["representative_photo_id"] is None:
            db.execute(
                "UPDATE moments SET representative_photo_id = ? WHERE id = ?",
                (photo_id, moment_id),
            )

        db.commit()

        return PhotoUploadResponse(
            id=photo_id,
            moment_id=moment_id,
            file_path=result["file_path"],
            thumbnail_gallery=result["thumbnail_gallery"],
            thumbnail_list=result["thumbnail_list"],
            taken_at=result["taken_at"],
            has_exif_date=result["has_exif_date"],
        )
    finally:
        db.close()


@router.get("/photos/{photo_id}/file")
async def get_photo_file(photo_id: int):
    db = get_db()
    try:
        row = db.execute("SELECT file_path FROM photos WHERE id = ?", (photo_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="사진을 찾을 수 없습니다")
        path = Path(row["file_path"])
        if not path.exists():
            raise HTTPException(status_code=404, detail="파일을 찾을 수 없습니다")
        return FileResponse(str(path))
    finally:
        db.close()


@router.get("/photos/{photo_id}/thumbnail/{size}")
async def get_thumbnail(photo_id: int, size: str):
    if size not in ("gallery", "list"):
        raise HTTPException(status_code=400, detail="size는 'gallery' 또는 'list'여야 합니다")

    db = get_db()
    try:
        col = "thumbnail_gallery" if size == "gallery" else "thumbnail_list"
        row = db.execute(f"SELECT {col} FROM photos WHERE id = ?", (photo_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="사진을 찾을 수 없습니다")
        path = Path(row[col])
        if not path.exists():
            raise HTTPException(status_code=404, detail="썸네일을 찾을 수 없습니다")
        return FileResponse(str(path), media_type="image/webp")
    finally:
        db.close()
