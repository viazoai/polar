import logging
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse

from config import MAX_UPLOAD_SIZE
from database import db_connection
from models.schemas import PhotoUploadResponse
from services.photo_service import detect_date, process_upload
from services.moment_service import find_or_create_moment
from services.ai_pipeline import run_ai_analysis

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/photos/detect-date")
async def detect_photo_date(
    file: UploadFile = File(...),
):
    """파일을 저장하지 않고 날짜와 출처만 반환한다."""
    file_bytes = await file.read()
    if len(file_bytes) > MAX_UPLOAD_SIZE:
        raise HTTPException(status_code=413, detail="파일 크기가 50MB를 초과합니다")
    result = detect_date(file_bytes, file.filename or "")
    return result


@router.post("/photos/upload", response_model=PhotoUploadResponse)
async def upload_photo(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    taken_at: str | None = Form(None),
    uploaded_by: int | None = Form(None),
    moment_id: int | None = Form(None),
):
    file_bytes = await file.read()
    if len(file_bytes) > MAX_UPLOAD_SIZE:
        raise HTTPException(status_code=413, detail="파일 크기가 50MB를 초과합니다")

    result = process_upload(file_bytes, file.filename or "photo.jpg", taken_at)

    if "error" in result:
        raise HTTPException(
            status_code=422,
            detail="촬영 날짜를 입력해주세요 (EXIF 정보가 없습니다)",
        )

    with db_connection() as db:
        # moment_id가 직접 지정되면 해당 순간에 강제 추가 (편집 모드)
        if moment_id is not None:
            if not db.execute("SELECT id FROM moments WHERE id = ?", (moment_id,)).fetchone():
                raise HTTPException(status_code=404, detail="순간을 찾을 수 없습니다")
        else:
            date_str = result["taken_at"][:10]  # YYYY-MM-DD
            moment_id = find_or_create_moment(db, date_str)

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

        # 대표 사진이 없을 때만 원자적으로 설정 (race condition 방지)
        updated = db.execute(
            "UPDATE moments SET representative_photo_id = ? WHERE id = ? AND representative_photo_id IS NULL",
            (photo_id, moment_id),
        ).rowcount

        db.commit()

        # 대표 사진으로 설정된 경우 (새 순간의 첫 사진) → AI 분석 예약
        if updated > 0:
            background_tasks.add_task(
                run_ai_analysis, moment_id, photo_id, result["file_path"]
            )

        return PhotoUploadResponse(
            id=photo_id,
            moment_id=moment_id,
            file_path=result["file_path"],
            thumbnail_gallery=result["thumbnail_gallery"],
            thumbnail_list=result["thumbnail_list"],
            taken_at=result["taken_at"],
            has_exif_date=result["has_exif_date"],
        )


@router.patch("/photos/{photo_id}/set-representative")
async def set_representative_photo(photo_id: int):
    """해당 사진을 소속 순간의 대표 사진으로 지정한다."""
    with db_connection() as db:
        photo = db.execute(
            "SELECT id, moment_id FROM photos WHERE id = ?", (photo_id,)
        ).fetchone()
        if not photo:
            raise HTTPException(status_code=404, detail="사진을 찾을 수 없습니다")
        db.execute(
            "UPDATE moments SET representative_photo_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            (photo_id, photo["moment_id"]),
        )
        db.commit()
    return {"ok": True}


@router.delete("/photos/{photo_id}")
async def delete_photo(photo_id: int):
    """개별 사진을 삭제한다. 대표 사진이면 다른 사진으로 교체한다."""
    with db_connection() as db:
        photo = db.execute(
            "SELECT id, moment_id, file_path, thumbnail_gallery, thumbnail_list FROM photos WHERE id = ?",
            (photo_id,),
        ).fetchone()
        if not photo:
            raise HTTPException(status_code=404, detail="사진을 찾을 수 없습니다")

        moment_id = photo["moment_id"]

        # 인물 태그 삭제
        db.execute("DELETE FROM photo_people WHERE photo_id = ?", (photo_id,))
        # 사진 레코드 삭제
        db.execute("DELETE FROM photos WHERE id = ?", (photo_id,))

        # 대표 사진이었으면 다른 사진으로 교체 (없으면 NULL)
        moment = db.execute(
            "SELECT representative_photo_id FROM moments WHERE id = ?", (moment_id,)
        ).fetchone()
        if moment and moment["representative_photo_id"] == photo_id:
            next_photo = db.execute(
                "SELECT id FROM photos WHERE moment_id = ? ORDER BY taken_at ASC LIMIT 1",
                (moment_id,),
            ).fetchone()
            db.execute(
                "UPDATE moments SET representative_photo_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                (next_photo["id"] if next_photo else None, moment_id),
            )

        db.commit()

    # DB 커밋 이후 파일 삭제
    for path_str in [photo["file_path"], photo["thumbnail_gallery"], photo["thumbnail_list"]]:
        try:
            Path(path_str).unlink(missing_ok=True)
        except Exception:
            pass

    return {"ok": True}


@router.get("/photos/{photo_id}/file")
async def get_photo_file(photo_id: int):
    with db_connection() as db:
        row = db.execute("SELECT file_path FROM photos WHERE id = ?", (photo_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="사진을 찾을 수 없습니다")
        path = Path(row["file_path"])
        if not path.exists():
            raise HTTPException(status_code=404, detail="파일을 찾을 수 없습니다")
        return FileResponse(str(path))


@router.get("/photos/{photo_id}/thumbnail/{size}")
async def get_thumbnail(photo_id: int, size: str):
    if size not in ("gallery", "list"):
        raise HTTPException(status_code=400, detail="size는 'gallery' 또는 'list'여야 합니다")

    col = "thumbnail_gallery" if size == "gallery" else "thumbnail_list"
    with db_connection() as db:
        row = db.execute(f"SELECT {col} FROM photos WHERE id = ?", (photo_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="사진을 찾을 수 없습니다")
        path = Path(row[col])
        if not path.exists():
            raise HTTPException(status_code=404, detail="썸네일을 찾을 수 없습니다")
        return FileResponse(str(path), media_type="image/webp")
