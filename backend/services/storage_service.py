"""
Storage service for persisting and retrieving JSON data.

Handles analysis results, features, and feedback with atomic writes.
"""

import json
import asyncio
from pathlib import Path
from typing import Any, Optional
from datetime import datetime

from utils.file_utils import (
    get_analysis_path,
    get_features_path,
    get_feedback_path,
)


# ─── Generic JSON I/O ────────────────────────────────────────────────────────

async def save_json(path: Path, data: Any) -> None:
    """Atomically save data as JSON to disk."""
    # Write to temp file first, then rename for atomicity
    tmp_path = path.with_suffix(".tmp")
    content = json.dumps(data, indent=2, default=str)
    await asyncio.to_thread(_write_file, tmp_path, content)
    await asyncio.to_thread(tmp_path.replace, path)


async def load_json(path: Path) -> Optional[Any]:
    """Load JSON data from disk. Returns None if file doesn't exist."""
    if not path.is_file():
        return None
    return await asyncio.to_thread(_read_file, path)


def _write_file(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)


def _read_file(path: Path) -> Any:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


# ─── Analysis Storage ────────────────────────────────────────────────────────

async def save_analysis(video_id: str, data: dict) -> None:
    """Persist analysis results for a video."""
    path = get_analysis_path(video_id)
    await save_json(path, {
        "video_id": video_id,
        "timestamp": datetime.utcnow().isoformat(),
        "data": data,
    })


async def load_analysis(video_id: str) -> Optional[dict]:
    """Retrieve stored analysis results."""
    path = get_analysis_path(video_id)
    result = await load_json(path)
    return result.get("data") if result else None


# ─── Features Storage ────────────────────────────────────────────────────────

async def save_features(video_id: str, features: dict) -> None:
    """Persist extracted features."""
    path = get_features_path(video_id)
    await save_json(path, {
        "video_id": video_id,
        "timestamp": datetime.utcnow().isoformat(),
        "features": features,
    })


async def load_features(video_id: str) -> Optional[dict]:
    """Retrieve stored features."""
    path = get_features_path(video_id)
    result = await load_json(path)
    return result.get("features") if result else None


# ─── Feedback Storage ────────────────────────────────────────────────────────

async def save_feedback(video_id: str, feedback_entry: dict) -> None:
    """Append a feedback entry to the video's feedback log."""
    path = get_feedback_path(video_id)
    existing = await load_json(path) or {"video_id": video_id, "entries": []}
    existing["entries"].append({
        **feedback_entry,
        "recorded_at": datetime.utcnow().isoformat(),
    })
    await save_json(path, existing)


async def load_feedback(video_id: str) -> list[dict]:
    """Retrieve all feedback entries for a video."""
    path = get_feedback_path(video_id)
    result = await load_json(path)
    return result.get("entries", []) if result else []
