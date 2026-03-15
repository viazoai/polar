"""가족 구성원 관리 API.

GET  /api/family           — 목록
POST /api/family           — 구성원 추가
PUT  /api/family/{id}      — 이름 수정
POST /api/family/{id}/reference-photos — 참조 사진 추가
DELETE /api/family/{id}/reference-photos/{index} — 참조 사진 삭제
"""
import json
import uuid
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import FileResponse

from config import REFERENCES_DIR
from database import db_connection
from models.schemas import FamilyMember, FamilyMemberCreate, FamilyMemberUpdate

router = APIRouter()


@router.get("/family", response_model=list[FamilyMember])
async def list_family():
    with db_connection() as db:
        rows = db.execute("SELECT id, name, reference_photos FROM family_members ORDER BY id").fetchall()
        return [
            FamilyMember(
                id=row["id"],
                name=row["name"],
                reference_photos=json.loads(row["reference_photos"] or "[]"),
            )
            for row in rows
        ]


@router.post("/family", response_model=FamilyMember, status_code=201)
async def create_family_member(body: FamilyMemberCreate):
    with db_connection() as db:
        cursor = db.execute(
            "INSERT INTO family_members (name, reference_photos) VALUES (?, '[]')",
            (body.name,),
        )
        member_id = cursor.lastrowid
        db.commit()
        return FamilyMember(id=member_id, name=body.name, reference_photos=[])


@router.put("/family/{member_id}", response_model=FamilyMember)
async def update_family_member(member_id: int, body: FamilyMemberUpdate):
    with db_connection() as db:
        row = db.execute(
            "SELECT id, name, reference_photos FROM family_members WHERE id = ?", (member_id,)
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="구성원을 찾을 수 없습니다")

        new_name = body.name if body.name is not None else row["name"]
        db.execute("UPDATE family_members SET name = ? WHERE id = ?", (new_name, member_id))
        db.commit()

        return FamilyMember(
            id=member_id,
            name=new_name,
            reference_photos=json.loads(row["reference_photos"] or "[]"),
        )


@router.post("/family/{member_id}/reference-photos", response_model=FamilyMember)
async def add_reference_photo(member_id: int, file: UploadFile = File(...)):
    """참조 사진 추가 (최대 3장)."""
    with db_connection() as db:
        row = db.execute(
            "SELECT id, name, reference_photos FROM family_members WHERE id = ?", (member_id,)
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="구성원을 찾을 수 없습니다")

        refs: list[str] = json.loads(row["reference_photos"] or "[]")
        if len(refs) >= 3:
            raise HTTPException(status_code=400, detail="참조 사진은 최대 3장까지 등록 가능합니다")

        # 저장
        member_dir = REFERENCES_DIR / str(member_id)
        member_dir.mkdir(parents=True, exist_ok=True)
        ext = Path(file.filename or "photo.jpg").suffix or ".jpg"
        filename = f"{uuid.uuid4().hex}{ext}"
        save_path = member_dir / filename

        contents = await file.read()
        with open(save_path, "wb") as f:
            f.write(contents)

        refs.append(str(save_path))
        db.execute(
            "UPDATE family_members SET reference_photos = ? WHERE id = ?",
            (json.dumps(refs, ensure_ascii=False), member_id),
        )
        db.commit()

        return FamilyMember(id=member_id, name=row["name"], reference_photos=refs)


@router.delete("/family/{member_id}/reference-photos/{index}", response_model=FamilyMember)
async def delete_reference_photo(member_id: int, index: int):
    """참조 사진 삭제 (0-based index)."""
    with db_connection() as db:
        row = db.execute(
            "SELECT id, name, reference_photos FROM family_members WHERE id = ?", (member_id,)
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="구성원을 찾을 수 없습니다")

        refs: list[str] = json.loads(row["reference_photos"] or "[]")
        if index < 0 or index >= len(refs):
            raise HTTPException(status_code=400, detail="잘못된 인덱스입니다")

        removed = refs.pop(index)
        try:
            Path(removed).unlink(missing_ok=True)
        except Exception:
            pass

        db.execute(
            "UPDATE family_members SET reference_photos = ? WHERE id = ?",
            (json.dumps(refs, ensure_ascii=False), member_id),
        )
        db.commit()

        return FamilyMember(id=member_id, name=row["name"], reference_photos=refs)


@router.delete("/family/{member_id}", status_code=204)
async def delete_family_member(member_id: int):
    """가족 구성원 삭제 (참조 사진 파일 + photo_people 레코드 포함)."""
    with db_connection() as db:
        row = db.execute(
            "SELECT reference_photos FROM family_members WHERE id = ?", (member_id,)
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="구성원을 찾을 수 없습니다")

        for ref in json.loads(row["reference_photos"] or "[]"):
            try:
                Path(ref).unlink(missing_ok=True)
            except Exception:
                pass

        db.execute("DELETE FROM photo_people WHERE family_member_id = ?", (member_id,))
        db.execute("DELETE FROM family_members WHERE id = ?", (member_id,))
        db.commit()


@router.get("/family/{member_id}/reference-photos/{index}")
async def get_reference_photo(member_id: int, index: int):
    """참조 사진 파일 서빙."""
    with db_connection() as db:
        row = db.execute(
            "SELECT reference_photos FROM family_members WHERE id = ?", (member_id,)
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="구성원을 찾을 수 없습니다")

        refs: list[str] = json.loads(row["reference_photos"] or "[]")
        if index < 0 or index >= len(refs):
            raise HTTPException(status_code=404, detail="사진을 찾을 수 없습니다")

        path = Path(refs[index])
        if not path.exists():
            raise HTTPException(status_code=404, detail="파일을 찾을 수 없습니다")
        return FileResponse(str(path))
