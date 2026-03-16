from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel

from database import db_connection
from services.auth_service import create_token, get_current_user, hash_password, verify_password
from config import JWT_EXPIRE_HOURS

router = APIRouter()


class LoginRequest(BaseModel):
    login_id: str
    password: str


class RegisterRequest(BaseModel):
    name: str
    login_id: str
    password: str


def _require_admin(request: Request) -> dict:
    payload = get_current_user(request)
    user_id = int(payload["sub"])
    with db_connection() as db:
        user = db.execute("SELECT is_admin FROM users WHERE id = ?", (user_id,)).fetchone()
    if not user or not user["is_admin"]:
        raise HTTPException(status_code=403, detail="관리자 권한이 필요합니다")
    return payload


@router.post("/auth/login")
async def login(body: LoginRequest, response: Response):
    with db_connection() as db:
        user = db.execute(
            "SELECT id, name, login_id, password_hash, is_admin, is_approved FROM users WHERE login_id = ?",
            (body.login_id,),
        ).fetchone()

    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="아이디 또는 비밀번호가 올바르지 않습니다")

    if not user["is_approved"]:
        raise HTTPException(status_code=403, detail="아직 승인되지 않은 계정입니다. 관리자 승인 후 로그인할 수 있습니다.")

    token = create_token(user["id"])
    response.set_cookie(
        "polar_token",
        token,
        httponly=True,
        samesite="lax",
        max_age=JWT_EXPIRE_HOURS * 3600,
        secure=False,
    )
    return {"id": user["id"], "name": user["name"], "is_admin": bool(user["is_admin"])}


@router.post("/auth/register", status_code=201)
async def register(body: RegisterRequest):
    """회원가입 요청 — 관리자 승인 후 로그인 가능."""
    if not body.name.strip() or not body.login_id.strip() or not body.password:
        raise HTTPException(status_code=400, detail="모든 항목을 입력해주세요")

    with db_connection() as db:
        existing = db.execute(
            "SELECT id FROM users WHERE login_id = ?", (body.login_id,)
        ).fetchone()
        if existing:
            raise HTTPException(status_code=409, detail="이미 사용 중인 아이디입니다")

        db.execute(
            "INSERT INTO users (name, login_id, password_hash, is_admin, is_approved) VALUES (?, ?, ?, 0, 0)",
            (body.name.strip(), body.login_id.strip(), hash_password(body.password)),
        )
        db.commit()

    return {"ok": True}


@router.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie(
        "polar_token",
        path="/",
        httponly=True,
        samesite="lax",
    )
    return {"ok": True}


@router.get("/auth/me")
async def me(request: Request):
    payload = get_current_user(request)
    user_id = int(payload["sub"])
    with db_connection() as db:
        user = db.execute(
            "SELECT id, name, login_id, is_admin FROM users WHERE id = ?",
            (user_id,),
        ).fetchone()
    if not user:
        raise HTTPException(status_code=401, detail="사용자를 찾을 수 없습니다")
    return {
        "id": user["id"],
        "name": user["name"],
        "login_id": user["login_id"],
        "is_admin": bool(user["is_admin"]),
    }


@router.get("/auth/pending-users")
async def pending_users(request: Request, _: dict = Depends(_require_admin)):
    """승인 대기 중인 사용자 목록 (관리자 전용)."""
    with db_connection() as db:
        rows = db.execute(
            "SELECT id, name, login_id, created_at FROM users WHERE is_approved = 0 ORDER BY created_at ASC"
        ).fetchall()
    return [{"id": r["id"], "name": r["name"], "login_id": r["login_id"], "created_at": r["created_at"]} for r in rows]


@router.post("/auth/users/{user_id}/approve")
async def approve_user(user_id: int, request: Request, _: dict = Depends(_require_admin)):
    """사용자 승인 (관리자 전용)."""
    with db_connection() as db:
        if not db.execute("SELECT id FROM users WHERE id = ?", (user_id,)).fetchone():
            raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다")
        db.execute("UPDATE users SET is_approved = 1 WHERE id = ?", (user_id,))
        db.commit()
    return {"ok": True}


@router.delete("/auth/users/{user_id}")
async def reject_user(user_id: int, request: Request, _: dict = Depends(_require_admin)):
    """사용자 거절/삭제 (관리자 전용)."""
    with db_connection() as db:
        if not db.execute("SELECT id FROM users WHERE id = ?", (user_id,)).fetchone():
            raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다")
        db.execute("DELETE FROM users WHERE id = ?", (user_id,))
        db.commit()
    return {"ok": True}
