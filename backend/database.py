import sqlite3
from config import DB_PATH


def get_db() -> sqlite3.Connection:
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


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
            date DATE NOT NULL,
            title TEXT,
            diary TEXT,
            location TEXT,
            representative_photo_id INTEGER,
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
    """)
    conn.commit()
    conn.close()
