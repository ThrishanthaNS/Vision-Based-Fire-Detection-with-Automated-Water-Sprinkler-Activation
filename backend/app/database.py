"""
FireGuard AI - SQLite Database Layer

Provides async database operations for storing and querying detection events.
Uses aiosqlite for non-blocking I/O.
"""

from __future__ import annotations

import csv
import io
import logging
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

import aiosqlite

from app.config import settings

logger = logging.getLogger("fireguard.database")

_db_path: str = settings.DB_PATH
_connection: Optional[aiosqlite.Connection] = None


async def init_db() -> None:
    """Initialise the SQLite database and create tables if they don't exist."""
    global _connection
    try:
        _connection = await aiosqlite.connect(_db_path)
        _connection.row_factory = aiosqlite.Row
        await _connection.execute("""
            CREATE TABLE IF NOT EXISTS events (
                id              INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp       TEXT    NOT NULL,
                fire_detected   INTEGER NOT NULL DEFAULT 0,
                confidence      REAL    NOT NULL DEFAULT 0.0,
                distance_m      REAL,
                pressure_bar    REAL,
                pressure_psi    REAL,
                duration        REAL    NOT NULL DEFAULT 0.0,
                system_state    TEXT    NOT NULL DEFAULT 'MONITORING',
                smoke_triggered INTEGER NOT NULL DEFAULT 0
            )
        """)
        await _connection.commit()
        logger.info("Database initialised at %s", _db_path)
    except Exception as exc:
        logger.error("Failed to initialise database: %s", exc)
        raise


async def close_db() -> None:
    """Close the database connection cleanly."""
    global _connection
    if _connection is not None:
        await _connection.close()
        _connection = None
        logger.info("Database connection closed.")


async def _get_conn() -> aiosqlite.Connection:
    """Return the current connection, re-opening if necessary."""
    global _connection
    if _connection is None:
        _connection = await aiosqlite.connect(_db_path)
        _connection.row_factory = aiosqlite.Row
    return _connection


async def save_event(
    fire_detected: bool,
    confidence: float,
    distance_m: Optional[float],
    pressure_bar: Optional[float],
    pressure_psi: Optional[float],
    duration: float,
    system_state: str,
    smoke_triggered: bool,
) -> int:
    """Persist a detection event and return its row id."""
    conn = await _get_conn()
    try:
        cursor = await conn.execute(
            """
            INSERT INTO events
                (timestamp, fire_detected, confidence, distance_m,
                 pressure_bar, pressure_psi, duration, system_state, smoke_triggered)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                datetime.utcnow().isoformat(),
                int(fire_detected),
                confidence,
                distance_m,
                pressure_bar,
                pressure_psi,
                duration,
                system_state,
                int(smoke_triggered),
            ),
        )
        await conn.commit()
        row_id = cursor.lastrowid or 0
        logger.debug("Saved event id=%d state=%s", row_id, system_state)
        return row_id
    except Exception as exc:
        logger.error("Failed to save event: %s", exc)
        return 0


async def get_events(
    limit: int = 50,
    offset: int = 0,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """Query events with optional pagination and date filtering."""
    conn = await _get_conn()
    clauses: List[str] = []
    params: List[Any] = []

    if start_date:
        clauses.append("timestamp >= ?")
        params.append(start_date)
    if end_date:
        clauses.append("timestamp <= ?")
        params.append(end_date)

    where = ""
    if clauses:
        where = "WHERE " + " AND ".join(clauses)

    query = f"""
        SELECT * FROM events {where}
        ORDER BY id DESC
        LIMIT ? OFFSET ?
    """
    params.extend([limit, offset])

    try:
        cursor = await conn.execute(query, params)
        rows = await cursor.fetchall()
        return [_row_to_dict(r) for r in rows]
    except Exception as exc:
        logger.error("Failed to query events: %s", exc)
        return []


async def get_event_stats() -> Dict[str, Any]:
    """Return aggregate statistics about stored events."""
    conn = await _get_conn()
    try:
        cursor = await conn.execute("SELECT COUNT(*) AS total FROM events")
        row = await cursor.fetchone()
        total = row["total"] if row else 0

        cursor = await conn.execute(
            "SELECT COUNT(*) AS cnt FROM events WHERE fire_detected = 1"
        )
        row = await cursor.fetchone()
        fire_count = row["cnt"] if row else 0

        cursor = await conn.execute(
            "SELECT COUNT(*) AS cnt FROM events WHERE smoke_triggered = 1"
        )
        row = await cursor.fetchone()
        smoke_count = row["cnt"] if row else 0

        cursor = await conn.execute(
            "SELECT AVG(confidence) AS avg_conf FROM events WHERE fire_detected = 1"
        )
        row = await cursor.fetchone()
        avg_conf = round(row["avg_conf"], 4) if row and row["avg_conf"] is not None else 0.0

        cursor = await conn.execute(
            "SELECT MAX(confidence) AS max_conf FROM events WHERE fire_detected = 1"
        )
        row = await cursor.fetchone()
        max_conf = round(row["max_conf"], 4) if row and row["max_conf"] is not None else 0.0

        cursor = await conn.execute(
            "SELECT AVG(pressure_bar) AS avg_p FROM events WHERE pressure_bar IS NOT NULL"
        )
        row = await cursor.fetchone()
        avg_pressure = round(row["avg_p"], 2) if row and row["avg_p"] is not None else None

        return {
            "total_events": total,
            "fire_events": fire_count,
            "smoke_events": smoke_count,
            "avg_fire_confidence": avg_conf,
            "max_fire_confidence": max_conf,
            "avg_pressure_bar": avg_pressure,
        }
    except Exception as exc:
        logger.error("Failed to compute stats: %s", exc)
        return {
            "total_events": 0,
            "fire_events": 0,
            "smoke_events": 0,
            "avg_fire_confidence": 0.0,
            "max_fire_confidence": 0.0,
            "avg_pressure_bar": None,
        }


async def export_events_csv() -> str:
    """Export all events as a CSV string."""
    conn = await _get_conn()
    try:
        cursor = await conn.execute("SELECT * FROM events ORDER BY id DESC")
        rows = await cursor.fetchall()

        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow([
            "id", "timestamp", "fire_detected", "confidence",
            "distance_m", "pressure_bar", "pressure_psi",
            "duration", "system_state", "smoke_triggered",
        ])
        for r in rows:
            writer.writerow([
                r["id"], r["timestamp"], bool(r["fire_detected"]),
                r["confidence"], r["distance_m"], r["pressure_bar"],
                r["pressure_psi"], r["duration"], r["system_state"],
                bool(r["smoke_triggered"]),
            ])
        return output.getvalue()
    except Exception as exc:
        logger.error("Failed to export CSV: %s", exc)
        return ""


def _row_to_dict(row: aiosqlite.Row) -> Dict[str, Any]:
    """Convert an aiosqlite Row to a plain dict with bools."""
    d = dict(row)
    d["fire_detected"] = bool(d.get("fire_detected", 0))
    d["smoke_triggered"] = bool(d.get("smoke_triggered", 0))
    return d
