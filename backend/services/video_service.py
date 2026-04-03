"""
Video service — handles file upload, validation, and storage.
"""

import shutil
import logging
from pathlib import Path
from typing import Optional

from fastapi import UploadFile

from utils.file_utils import (
    validate_video_extension,
    validate_file_size,
    get_file_extension,
    get_video_path,
    get_video_dir,
    generate_video_id,
    compute_file_hash,
    UPLOADS_DIR,
)

logger = logging.getLogger(__name__)

# In-memory hash → video_id cache for deduplication
_hash_cache: dict[str, str] = {}


class VideoValidationError(Exception):
    """Raised when video validation fails."""
    pass


async def save_video(file: UploadFile) -> tuple[str, Path]:
    """
    Validate and save an uploaded video file.

    Returns:
        Tuple of (video_id, video_path)

    Raises:
        VideoValidationError: If the file is invalid
    """
    # Validate filename and extension
    if not file.filename:
        raise VideoValidationError("No filename provided")

    if not validate_video_extension(file.filename):
        raise VideoValidationError(
            f"Invalid file format. Allowed: mp4, mov, avi, mkv, webm"
        )

    # Read file content
    content = await file.read()

    # Validate size
    if not validate_file_size(len(content)):
        raise VideoValidationError(
            f"File too large. Maximum size: 500MB"
        )

    # Generate ID and save
    video_id = generate_video_id()
    ext = get_file_extension(file.filename)
    video_path = get_video_path(video_id, ext)

    # Ensure directory exists
    video_path.parent.mkdir(parents=True, exist_ok=True)

    # Write file
    with open(video_path, "wb") as f:
        f.write(content)

    logger.info(f"Saved video {video_id} ({len(content)} bytes) to {video_path}")

    # Compute hash for deduplication
    file_hash = compute_file_hash(video_path)
    cached_id = _hash_cache.get(file_hash)

    if cached_id and cached_id != video_id:
        logger.info(f"Duplicate detected: {video_id} matches {cached_id}")
        # Keep the new upload but note the duplicate
        # Could return cached_id instead for true deduplication

    _hash_cache[file_hash] = video_id

    return video_id, video_path


def get_video_url(video_id: str, base_url: str = "") -> str:
    """Generate a URL to access the stored video."""
    return f"{base_url}/uploads/{video_id}/video.mp4"


def find_video_file(video_id: str) -> Optional[Path]:
    """Find the actual video file for a given video_id."""
    video_dir = UPLOADS_DIR / video_id
    if not video_dir.is_dir():
        return None

    # Search for any video file in the directory
    for ext in [".mp4", ".mov", ".avi", ".mkv", ".webm"]:
        candidate = video_dir / f"video{ext}"
        if candidate.is_file():
            return candidate

    return None


def delete_video(video_id: str) -> bool:
    """Remove all files for a video."""
    video_dir = UPLOADS_DIR / video_id
    if video_dir.is_dir():
        shutil.rmtree(video_dir)
        logger.info(f"Deleted video {video_id}")
        return True
    return False
