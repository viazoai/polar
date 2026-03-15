import sqlite3
from contextlib import contextmanager
from typing import Generator

from config import DB_PATH


def get_db() -> sqlite3.Connection:
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


@contextmanager
def db_connection() -> Generator[sqlite3.Connection, None, None]:
    """DB 커넥션을 자동으로 닫아주는 context manager."""
    conn = get_db()
    try:
        yield conn
    finally:
        conn.close()


def init_db():
    conn = get_db()
    conn.execute("PRAGMA journal_mode=WAL")

    conn.executescript("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            login_id TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            is_admin BOOLEAN NOT NULL DEFAULT 0,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS family_members (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            reference_photos TEXT DEFAULT '[]'
        );

        CREATE TABLE IF NOT EXISTS moments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date DATE NOT NULL UNIQUE,
            title TEXT,
            diary TEXT,
            location TEXT,
            representative_photo_id INTEGER,
            ai_status TEXT NOT NULL DEFAULT 'pending',
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS photos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            moment_id INTEGER NOT NULL REFERENCES moments(id),
            file_path TEXT NOT NULL,
            thumbnail_gallery TEXT NOT NULL,
            thumbnail_list TEXT NOT NULL,
            taken_at DATETIME NOT NULL,
            gps_lat REAL,
            gps_lng REAL,
            exif_data TEXT,
            uploaded_by INTEGER REFERENCES users(id),
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS photo_people (
            photo_id INTEGER NOT NULL REFERENCES photos(id),
            family_member_id INTEGER NOT NULL REFERENCES family_members(id),
            confidence TEXT DEFAULT 'medium',
            is_confirmed BOOLEAN NOT NULL DEFAULT 0,
            PRIMARY KEY (photo_id, family_member_id)
        );

        CREATE INDEX IF NOT EXISTS idx_moments_date ON moments(date);
        CREATE INDEX IF NOT EXISTS idx_photos_moment_id ON photos(moment_id);
        CREATE INDEX IF NOT EXISTS idx_photos_taken_at ON photos(taken_at);
    """)

    # 마이그레이션: 기존 DB에 신규 컬럼이 없으면 추가
    for sql in [
        "ALTER TABLE moments ADD COLUMN ai_status TEXT NOT NULL DEFAULT 'pending'",
        "ALTER TABLE moments ADD COLUMN content_source TEXT",  # NULL | 'ai' | 'manual'
    ]:
        try:
            conn.execute(sql)
        except sqlite3.OperationalError:
            pass  # 이미 존재하면 무시

    # 일회성 데이터 픽스: AI 분석 큐에 올라간 적 없는 기존 순간들을 'failed'로 교정
    conn.execute("""
        CREATE TABLE IF NOT EXISTS migrations (
            name TEXT PRIMARY KEY,
            applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    """)
    if not conn.execute(
        "SELECT 1 FROM migrations WHERE name = 'fix_orphan_pending_moments'"
    ).fetchone():
        conn.execute(
            "UPDATE moments SET ai_status = 'failed' WHERE ai_status = 'pending'"
        )
        conn.execute(
            "INSERT INTO migrations (name) VALUES ('fix_orphan_pending_moments')"
        )

    conn.commit()
    conn.close()
