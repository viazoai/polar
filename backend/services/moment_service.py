import sqlite3


def find_or_create_moment(db: sqlite3.Connection, date_str: str) -> int:
    """Find existing moment for this date, or create a new one. Returns moment_id."""
    row = db.execute(
        "SELECT id FROM moments WHERE date = ?", (date_str,)
    ).fetchone()

    if row:
        return row["id"]

    cursor = db.execute(
        "INSERT INTO moments (date, title) VALUES (?, ?)",
        (date_str, "새로운 순간"),
    )
    db.commit()
    return cursor.lastrowid
