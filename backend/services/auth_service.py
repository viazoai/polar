from datetime import datetime, timedelta, timezone

import bcrypt
from fastapi import HTTPException, Request
from jose import JWTError, jwt

from config import JWT_ALGORITHM, JWT_EXPIRE_HOURS, SECRET_KEY


def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


def create_token(user_id: int) -> str:
    expire = datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRE_HOURS)
    return jwt.encode({"sub": str(user_id), "exp": expire}, SECRET_KEY, algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> dict | None:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[JWT_ALGORITHM])
    except JWTError:
        return None


def get_current_user(request: Request) -> dict:
    token = request.cookies.get("polar_token")
    if not token:
        raise HTTPException(status_code=401, detail="로그인이 필요합니다")
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="세션이 만료되었습니다")
    return payload


def seed_admin() -> None:
    """ADMIN_PASSWORD 환경변수가 있으면 기본 admin 계정을 생성한다."""
    from config import ADMIN_PASSWORD
    from database import db_connection

    if not ADMIN_PASSWORD:
        return

    with db_connection() as db:
        if db.execute("SELECT 1 FROM migrations WHERE name = 'seed_admin'").fetchone():
            return
        db.execute(
            "INSERT OR IGNORE INTO users (name, login_id, password_hash, is_admin, is_approved) VALUES (?, ?, ?, 1, 1)",
            ("관리자", "admin", hash_password(ADMIN_PASSWORD)),
        )
        db.execute("INSERT INTO migrations (name) VALUES ('seed_admin')")
        db.commit()
