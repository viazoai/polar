"""AI 분석 백그라운드 파이프라인 — photos.py와 moments.py 양쪽에서 공유."""
import json
import logging

from database import db_connection

logger = logging.getLogger(__name__)


def mark_ai_failed(moment_id: int):
    with db_connection() as db:
        db.execute(
            "UPDATE moments SET ai_status = 'failed', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            (moment_id,),
        )
        db.commit()


def run_ai_analysis(moment_id: int, photo_id: int, file_path: str):
    """백그라운드: 사진 AI 제목/일기 생성 + 인물 식별."""
    from services.ai_service import analyze_photo, identify_people

    try:
        with open(file_path, "rb") as f:
            image_bytes = f.read()
    except Exception as e:
        logger.error("AI 분석 파일 읽기 실패 (photo_id=%d): %s", photo_id, e)
        mark_ai_failed(moment_id)
        return

    result = analyze_photo(image_bytes)
    if result:
        with db_connection() as db:
            db.execute(
                """UPDATE moments
                   SET title = ?, diary = ?, ai_status = 'done', content_source = 'ai',
                       updated_at = CURRENT_TIMESTAMP
                   WHERE id = ?""",
                (result["title"], result["diary"], moment_id),
            )
            db.commit()
        logger.info("AI 분석 완료 (moment_id=%d): %s", moment_id, result["title"])
    else:
        mark_ai_failed(moment_id)
        return

    # 인물 식별 (참조 사진이 등록된 가족 구성원이 있는 경우만)
    with db_connection() as db:
        rows = db.execute("SELECT id, name, reference_photos FROM family_members").fetchall()
        family_members = [
            {"id": r["id"], "name": r["name"], "reference_photos": json.loads(r["reference_photos"] or "[]")}
            for r in rows
            if json.loads(r["reference_photos"] or "[]")
        ]

    if not family_members:
        return

    people = identify_people(image_bytes, family_members)
    if people:
        with db_connection() as db:
            for p in people:
                db.execute(
                    """INSERT OR REPLACE INTO photo_people
                       (photo_id, family_member_id, confidence, is_confirmed)
                       VALUES (?, ?, ?, 0)""",
                    (photo_id, p["family_member_id"], p["confidence"]),
                )
            db.commit()
        logger.info("인물 식별 완료 (photo_id=%d): %d명", photo_id, len(people))
