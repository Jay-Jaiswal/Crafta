"""
File utility functions for the Consumer Attention Analyzer.

Handles path management, file validation, and directory setup.
"""

import os
import uuid
import hashlib
from pathlib import Path
from typing import Optional

# ─── Constants ────────────────────────────────────────────────────────────────

ALLOWED_VIDEO_EXTENSIONS = {".mp4", ".mov", ".avi", ".mkv", ".webm"}
MAX_FILE_SIZE_MB = 500
MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024

# Base directories (relative to backend/)
BASE_DIR = Path(__file__).resolve().parent.parent
UPLOADS_DIR = BASE_DIR / "uploads"
RESULTS_DIR = BASE_DIR / "results"
FEEDBACK_DIR = BASE_DIR / "feedback"


# ─── Directory Management ────────────────────────────────────────────────────

def ensure_directories() -> None:
    """Create all required directories on startup."""
    for directory in [UPLOADS_DIR, RESULTS_DIR, FEEDBACK_DIR]:
        directory.mkdir(parents=True, exist_ok=True)


def get_video_dir(video_id: str) -> Path:
    """Get the dedicated directory for a specific video's files."""
    video_dir = UPLOADS_DIR / video_id
    video_dir.mkdir(parents=True, exist_ok=True)
    return video_dir


def get_results_dir(video_id: str) -> Path:
    """Get the dedicated directory for a specific video's results."""
    results_dir = RESULTS_DIR / video_id
    results_dir.mkdir(parents=True, exist_ok=True)
    return results_dir


# ─── ID Generation ───────────────────────────────────────────────────────────

def generate_video_id() -> str:
    """Generate a unique video identifier."""
    return uuid.uuid4().hex[:12]


def compute_file_hash(file_path: Path, chunk_size: int = 8192) -> str:
    """Compute SHA-256 hash of a file for deduplication."""
    sha256 = hashlib.sha256()
    with open(file_path, "rb") as f:
        while chunk := f.read(chunk_size):
            sha256.update(chunk)
    return sha256.hexdigest()


# ─── Validation ──────────────────────────────────────────────────────────────

def validate_video_extension(filename: str) -> bool:
    """Check if the file has an allowed video extension."""
    ext = Path(filename).suffix.lower()
    return ext in ALLOWED_VIDEO_EXTENSIONS


def get_file_extension(filename: str) -> str:
    """Extract and normalize file extension."""
    return Path(filename).suffix.lower()


def validate_file_size(size_bytes: int) -> bool:
    """Check if file size is within limits."""
    return 0 < size_bytes <= MAX_FILE_SIZE_BYTES


# ─── Path Helpers ────────────────────────────────────────────────────────────

def get_video_path(video_id: str, extension: str = ".mp4") -> Path:
    """Get the full path for a stored video file."""
    return get_video_dir(video_id) / f"video{extension}"


def get_features_path(video_id: str) -> Path:
    """Get path to the features JSON for a video."""
    return get_results_dir(video_id) / "features.json"


def get_analysis_path(video_id: str) -> Path:
    """Get path to the analysis JSON for a video."""
    return get_results_dir(video_id) / "analysis.json"


def get_feedback_path(video_id: str) -> Path:
    """Get path to the feedback JSON for a video."""
    return FEEDBACK_DIR / f"{video_id}.json"


def video_exists(video_id: str) -> bool:
    """Check if a video directory exists."""
    return (UPLOADS_DIR / video_id).is_dir()


def analysis_exists(video_id: str) -> bool:
    """Check if analysis results exist for a video."""
    return get_analysis_path(video_id).is_file()
