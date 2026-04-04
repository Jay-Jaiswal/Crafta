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
    Validate and save an uploaded video file securely by streaming it to disk.

    Returns:
        Tuple of (video_id, video_path)

    Raises:
        VideoValidationError: If the file is invalid
    """
    # Validate filename and extension
    if not file.filename:
        raise VideoValidationError("No filename provided")

    ext = get_file_extension(file.filename)
    if ext not in [".mp4", ".mov", ".avi", ".mkv", ".webm"]:
        raise VideoValidationError(
            f"Invalid file format. Allowed: mp4, mov, avi, mkv, webm"
        )

    # Generate ID and save
    video_id = generate_video_id()
    video_path = get_video_path(video_id, ext)

    # Ensure directory exists
    video_path.parent.mkdir(parents=True, exist_ok=True)

    # Stream the file directly to disk to save memory and avoid delays
    total_size = 0
    MAX_SIZE = 500 * 1024 * 1024 # 500 MB
    
    with open(video_path, "wb") as f:
        while chunk := await file.read(1024 * 1024): # 1MB chunks
            total_size += len(chunk)
            if total_size > MAX_SIZE:
                video_path.unlink(missing_ok=True)
                raise VideoValidationError(f"File too large. Maximum size: 500MB")
            f.write(chunk)

    logger.info(f"Saved video {video_id} ({total_size} bytes) directly to {video_path}")

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
