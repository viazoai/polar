from fastapi import APIRouter, HTTPException

from database import db_connection
from models.schemas import MomentSummary, MomentDetail, PhotoInfo

router = APIRouter()


@router.get("/moments", response_model=list[MomentSummary])
async def list_moments(year: int | None = None, month: int | None = None):
    query = """
        SELECT m.id, m.date, m.title, m.representative_photo_id,
               COUNT(p.id) AS photo_count,
               rp.thumbnail_list AS representative_thumbnail
        FROM moments m
        LEFT JOIN photos p ON p.moment_id = m.id
        LEFT JOIN photos rp ON rp.id = m.representative_photo_id
    """
    conditions = []
    params = []

    if year is not None:
        conditions.append("CAST(strftime('%Y', m.date) AS INTEGER) = ?")
        params.append(year)
    if month is not None:
        conditions.append("CAST(strftime('%m', m.date) AS INTEGER) = ?")
        params.append(month)

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
            )
            for row in rows
        ]


@router.get("/moments/{moment_id}", response_model=MomentDetail)
async def get_moment(moment_id: int):
    with db_connection() as db:
        moment = db.execute(
            "SELECT id, date, title, diary, location FROM moments WHERE id = ?",
            (moment_id,),
        ).fetchone()

        if not moment:
            raise HTTPException(status_code=404, detail="순간을 찾을 수 없습니다")

        photos = db.execute(
            """SELECT id, thumbnail_gallery, thumbnail_list, taken_at
               FROM photos WHERE moment_id = ? ORDER BY taken_at ASC""",
            (moment_id,),
        ).fetchall()

        return MomentDetail(
            id=moment["id"],
            date=moment["date"],
            title=moment["title"],
            diary=moment["diary"],
            location=moment["location"],
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
