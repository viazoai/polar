from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request

from database import db_connection
from models.schemas import (
    MomentSummary, MomentDetail, PhotoInfo, PersonTag,
    MomentUpdate, PersonTagUpdate, MomentSplitRequest, MomentMergeRequest,
)
from services.ai_pipeline import run_ai_analysis
from services.auth_service import get_current_user
from services.moment_service import find_or_create_moment

router = APIRouter(dependencies=[Depends(get_current_user)])


def _fetch_moment_detail(db, moment_id: int) -> MomentDetail | None:
    moment = db.execute(
        "SELECT id, date, title, diary, location, ai_status, content_source, representative_photo_id FROM moments WHERE id = ?",
        (moment_id,),
    ).fetchone()
    if not moment:
        return None

    photos = db.execute(
        "SELECT id, thumbnail_gallery, thumbnail_list, taken_at FROM photos WHERE moment_id = ? ORDER BY taken_at ASC",
        (moment_id,),
    ).fetchall()

    people_rows = db.execute(
        """SELECT pp.family_member_id, fm.name, pp.confidence, pp.is_confirmed
           FROM photo_people pp
           JOIN family_members fm ON fm.id = pp.family_member_id
           JOIN photos ph ON ph.id = pp.photo_id
           WHERE ph.moment_id = ?
           GROUP BY pp.family_member_id
           ORDER BY CASE pp.confidence WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END""",
        (moment_id,),
    ).fetchall()

    return MomentDetail(
        id=moment["id"],
        date=moment["date"],
        title=moment["title"],
        diary=moment["diary"],
        location=moment["location"],
        ai_status=moment["ai_status"],
        content_source=moment["content_source"],
        representative_photo_id=moment["representative_photo_id"],
        people=[
            PersonTag(
                family_member_id=p["family_member_id"],
                name=p["name"],
                confidence=p["confidence"],
                is_confirmed=bool(p["is_confirmed"]),
            )
            for p in people_rows
        ],
        photos=[
            PhotoInfo(
                id=p["id"],
                thumbnail_gallery=p["thumbnail_gallery"],
                thumbnail_list=p["thumbnail_list"],
                taken_at=p["taken_at"],
            )
            for p in photos
        ],
    )


@router.get("/moments", response_model=list[MomentSummary])
async def list_moments(
    year: int | None = None,
    month: int | None = None,
    people: str | None = None,  # 쉼표 구분 family_member_id, 예: "1,3"
    q: str | None = None,  # 제목·일기 텍스트 검색
):
    query = """
        SELECT m.id, m.date, m.title, m.representative_photo_id, m.ai_status,
               COUNT(p.id) AS photo_count,
               rp.thumbnail_list AS representative_thumbnail
        FROM moments m
        LEFT JOIN photos p ON p.moment_id = m.id
        LEFT JOIN photos rp ON rp.id = m.representative_photo_id
    """
    conditions, params = [], []
    if year is not None:
        conditions.append("CAST(strftime('%Y', m.date) AS INTEGER) = ?")
        params.append(year)
    if month is not None:
        conditions.append("CAST(strftime('%m', m.date) AS INTEGER) = ?")
        params.append(month)
    if people:
        member_ids = [int(x) for x in people.split(",") if x.strip().isdigit()]
        if member_ids:
            placeholders = ",".join("?" * len(member_ids))
            conditions.append(f"""
                m.id IN (
                    SELECT DISTINCT ph.moment_id FROM photos ph
                    JOIN photo_people pp ON pp.photo_id = ph.id
                    WHERE pp.family_member_id IN ({placeholders})
                )
            """)
            params.extend(member_ids)
    if q and q.strip():
        conditions.append("(m.title LIKE ? OR m.diary LIKE ?)")
        like = f"%{q.strip()}%"
        params.extend([like, like])
    if conditions:
        query += " WHERE " + " AND ".join(conditions)
    query += " GROUP BY m.id ORDER BY m.date DESC"

    with db_connection() as db:
        rows = db.execute(query, params).fetchall()
        return [
            MomentSummary(
                id=row["id"],
                date=row["date"],
                title=row["title"],
                photo_count=row["photo_count"],
                representative_photo_id=row["representative_photo_id"],
                representative_thumbnail=row["representative_thumbnail"],
                ai_status=row["ai_status"],
            )
            for row in rows
        ]


@router.get("/moments/{moment_id}", response_model=MomentDetail)
async def get_moment(moment_id: int):
    with db_connection() as db:
        detail = _fetch_moment_detail(db, moment_id)
        if not detail:
            raise HTTPException(status_code=404, detail="순간을 찾을 수 없습니다")
        return detail


@router.patch("/moments/{moment_id}")
async def update_moment(moment_id: int, body: MomentUpdate):
    """제목·일기·날짜 수동 편집."""
    with db_connection() as db:
        if not db.execute("SELECT id FROM moments WHERE id = ?", (moment_id,)).fetchone():
            raise HTTPException(status_code=404, detail="순간을 찾을 수 없습니다")

        updates: dict = {}
        if body.title is not None:
            updates["title"] = body.title or None
        if body.diary is not None:
            updates["diary"] = body.diary or None
        if body.date is not None:
            # 같은 날짜 순간이 이미 있는지 확인
            existing = db.execute(
                "SELECT id FROM moments WHERE date = ? AND id != ?",
                (body.date, moment_id),
            ).fetchone()
            if existing:
                raise HTTPException(
                    status_code=409,
                    detail="해당 날짜에 이미 순간이 있습니다. 병합을 사용해 주세요.",
                )
            updates["date"] = body.date

        if updates:
            if body.title is not None or body.diary is not None:
                updates["content_source"] = "manual"
            set_clause = ", ".join(f"{k} = ?" for k in updates)
            db.execute(
                f"UPDATE moments SET {set_clause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                [*updates.values(), moment_id],
            )
            db.commit()

    return {"ok": True}


@router.post("/moments/{moment_id}/regenerate-ai")
async def regenerate_ai(moment_id: int, background_tasks: BackgroundTasks):
    """AI 제목·일기·인물 재생성."""
    with db_connection() as db:
        moment = db.execute(
            "SELECT id, representative_photo_id FROM moments WHERE id = ?", (moment_id,)
        ).fetchone()
        if not moment:
            raise HTTPException(status_code=404, detail="순간을 찾을 수 없습니다")
        if not moment["representative_photo_id"]:
            raise HTTPException(status_code=400, detail="대표 사진이 없습니다")

        photo = db.execute(
            "SELECT id, file_path FROM photos WHERE id = ?",
            (moment["representative_photo_id"],),
        ).fetchone()
        if not photo:
            raise HTTPException(status_code=404, detail="대표 사진 파일을 찾을 수 없습니다")

        db.execute(
            """UPDATE moments
               SET ai_status = 'pending', title = NULL, diary = NULL, content_source = NULL,
                   updated_at = CURRENT_TIMESTAMP
               WHERE id = ?""",
            (moment_id,),
        )
        db.commit()

    background_tasks.add_task(run_ai_analysis, moment_id, photo["id"], photo["file_path"])
    return {"ai_status": "pending"}


@router.delete("/moments/{moment_id}")
async def delete_moment(moment_id: int):
    """순간과 모든 관련 사진 파일을 영구 삭제한다."""
    with db_connection() as db:
        if not db.execute("SELECT id FROM moments WHERE id = ?", (moment_id,)).fetchone():
            raise HTTPException(status_code=404, detail="순간을 찾을 수 없습니다")

        photos = db.execute(
            "SELECT id, file_path, thumbnail_gallery, thumbnail_list FROM photos WHERE moment_id = ?",
            (moment_id,),
        ).fetchall()

        photo_ids = [p["id"] for p in photos]
        if photo_ids:
            placeholders = ",".join("?" * len(photo_ids))
            db.execute(f"DELETE FROM photo_people WHERE photo_id IN ({placeholders})", photo_ids)

        db.execute("DELETE FROM photos WHERE moment_id = ?", (moment_id,))
        db.execute("DELETE FROM moments WHERE id = ?", (moment_id,))
        db.commit()

    # DB 커밋 이후 파일 삭제
    for photo in photos:
        for path_str in [photo["file_path"], photo["thumbnail_gallery"], photo["thumbnail_list"]]:
            try:
                Path(path_str).unlink(missing_ok=True)
            except Exception:
                pass

    return {"ok": True}


@router.post("/moments/{moment_id}/people", response_model=PersonTag, status_code=201)
async def add_person_to_moment(moment_id: int, body: PersonTagUpdate):
    with db_connection() as db:
        photos = db.execute("SELECT id FROM photos WHERE moment_id = ?", (moment_id,)).fetchall()
        if not photos:
            raise HTTPException(status_code=404, detail="순간을 찾을 수 없습니다")

        member = db.execute(
            "SELECT id, name FROM family_members WHERE id = ?", (body.family_member_id,)
        ).fetchone()
        if not member:
            raise HTTPException(status_code=404, detail="가족 구성원을 찾을 수 없습니다")

        for photo in photos:
            db.execute(
                """INSERT OR REPLACE INTO photo_people
                   (photo_id, family_member_id, confidence, is_confirmed)
                   VALUES (?, ?, 'high', 1)""",
                (photo["id"], body.family_member_id),
            )
        db.commit()

    return PersonTag(
        family_member_id=member["id"],
        name=member["name"],
        confidence="high",
        is_confirmed=True,
    )


@router.delete("/moments/{moment_id}/people/{family_member_id}")
async def remove_person_from_moment(moment_id: int, family_member_id: int):
    with db_connection() as db:
        for photo in db.execute("SELECT id FROM photos WHERE moment_id = ?", (moment_id,)).fetchall():
            db.execute(
                "DELETE FROM photo_people WHERE photo_id = ? AND family_member_id = ?",
                (photo["id"], family_member_id),
            )
        db.commit()
    return {"ok": True}


@router.post("/moments/{moment_id}/split")
async def split_moment(moment_id: int, body: MomentSplitRequest):
    """선택한 사진들을 별도 순간으로 분리한다."""
    if not body.photo_ids:
        raise HTTPException(status_code=400, detail="분리할 사진을 선택해주세요")

    with db_connection() as db:
        moment = db.execute(
            "SELECT id, representative_photo_id FROM moments WHERE id = ?", (moment_id,)
        ).fetchone()
        if not moment:
            raise HTTPException(status_code=404, detail="순간을 찾을 수 없습니다")

        # 해당 사진들이 이 순간 소속인지 검증
        placeholders = ",".join("?" * len(body.photo_ids))
        valid = db.execute(
            f"SELECT id FROM photos WHERE id IN ({placeholders}) AND moment_id = ?",
            [*body.photo_ids, moment_id],
        ).fetchall()
        if len(valid) != len(body.photo_ids):
            raise HTTPException(status_code=400, detail="일부 사진이 이 순간에 속하지 않습니다")

        # 원본 순간에 최소 1장 남아야 함
        total = db.execute(
            "SELECT COUNT(*) as cnt FROM photos WHERE moment_id = ?", (moment_id,)
        ).fetchone()["cnt"]
        if len(body.photo_ids) >= total:
            raise HTTPException(status_code=400, detail="최소 1장은 원래 순간에 남아야 합니다")

        # 분리 사진들의 날짜 결정 (첫 번째 사진의 촬영 날짜)
        first_photo = db.execute(
            f"SELECT taken_at FROM photos WHERE id IN ({placeholders}) ORDER BY taken_at ASC LIMIT 1",
            body.photo_ids,
        ).fetchone()
        new_date = first_photo["taken_at"][:10]

        # 같은 날짜 순간이 이미 있으면 그쪽으로 이동, 없으면 새 순간 생성
        new_moment_id = find_or_create_moment(db, new_date)
        if new_moment_id == moment_id:
            # 같은 날짜라 새 순간을 만들 수 없음 → 날짜를 시간으로 보정하거나 에러
            raise HTTPException(
                status_code=409,
                detail="분리 날짜가 원본 순간과 같아 분리할 수 없습니다",
            )

        db.execute(
            f"UPDATE photos SET moment_id = ? WHERE id IN ({placeholders})",
            [new_moment_id, *body.photo_ids],
        )

        # 대표 사진이 이동됐으면 원본 순간 대표사진 재지정
        if moment["representative_photo_id"] in body.photo_ids:
            remaining = db.execute(
                "SELECT id FROM photos WHERE moment_id = ? ORDER BY taken_at ASC LIMIT 1",
                (moment_id,),
            ).fetchone()
            db.execute(
                "UPDATE moments SET representative_photo_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                (remaining["id"] if remaining else None, moment_id),
            )

        # 새 순간 대표 사진 설정 (아직 없는 경우)
        new_moment = db.execute(
            "SELECT representative_photo_id FROM moments WHERE id = ?", (new_moment_id,)
        ).fetchone()
        if not new_moment["representative_photo_id"]:
            first_moved = db.execute(
                f"SELECT id FROM photos WHERE id IN ({placeholders}) ORDER BY taken_at ASC LIMIT 1",
                body.photo_ids,
            ).fetchone()
            if first_moved:
                db.execute(
                    "UPDATE moments SET representative_photo_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                    (first_moved["id"], new_moment_id),
                )

        db.commit()

    return {"new_moment_id": new_moment_id}


@router.post("/moments/{moment_id}/merge")
async def merge_moment(moment_id: int, body: MomentMergeRequest):
    """source_moment의 모든 사진을 이 순간으로 합친 후 source_moment를 삭제한다."""
    if body.source_moment_id == moment_id:
        raise HTTPException(status_code=400, detail="같은 순간으로 병합할 수 없습니다")

    with db_connection() as db:
        if not db.execute("SELECT id FROM moments WHERE id = ?", (moment_id,)).fetchone():
            raise HTTPException(status_code=404, detail="대상 순간을 찾을 수 없습니다")
        if not db.execute("SELECT id FROM moments WHERE id = ?", (body.source_moment_id,)).fetchone():
            raise HTTPException(status_code=404, detail="병합할 순간을 찾을 수 없습니다")

        db.execute(
            "UPDATE photos SET moment_id = ? WHERE moment_id = ?",
            (moment_id, body.source_moment_id),
        )
        db.execute("DELETE FROM moments WHERE id = ?", (body.source_moment_id,))
        db.execute(
            "UPDATE moments SET updated_at = CURRENT_TIMESTAMP WHERE id = ?", (moment_id,)
        )
        db.commit()

    return {"ok": True}
