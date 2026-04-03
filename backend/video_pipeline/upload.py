"""Input handling utilities for video files."""

import os


VALID_VIDEO_EXTENSIONS = {".mp4", ".mov", ".avi", ".mkv", ".webm"}


def validate_video_path(video_path: str) -> str:
    """Validate a local input video path.

    This keeps upload handling simple for MVP usage where the caller already
    provides a local file path.

    Args:
        video_path: Path to the video file.

    Returns:
        Normalized absolute video path.

    Raises:
        ValueError: If the input is empty.
        FileNotFoundError: If the file does not exist.
        TypeError: If the path does not look like a supported video file.
    """
    if not video_path or not video_path.strip():
        raise ValueError("video_path must be a non-empty string")

    normalized = os.path.abspath(video_path)
    if not os.path.isfile(normalized):
        raise FileNotFoundError(f"Video file not found: {normalized}")

    _, extension = os.path.splitext(normalized)
    if extension.lower() not in VALID_VIDEO_EXTENSIONS:
        raise TypeError(
            "Unsupported video format. "
            f"Expected one of: {sorted(VALID_VIDEO_EXTENSIONS)}"
        )

    return normalized
