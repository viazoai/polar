import sqlite3


def find_or_create_moment(db: sqlite3.Connection, date_str: str) -> int:
    """Find existing moment for this date, or create a new one. Returns moment_id.

    commit은 호출자(router)가 담당한다.
    """
    row = db.execute(
        "SELECT id FROM moments WHERE date = ?", (date_str,)
    ).fetchone()

    if row:
        return row["id"]

    cursor = db.execute(
        "INSERT INTO moments (date) VALUES (?)",
        (date_str,),
    )
    return cursor.lastrowid
