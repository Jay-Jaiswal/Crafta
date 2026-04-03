"""Video metadata extraction helpers."""

import cv2

from .upload import validate_video_path


def get_video_metadata(video_path: str) -> dict[str, float]:
    """Read FPS, frame count, and duration from a video.

    Args:
        video_path: Local path to a video file.

    Returns:
        Dictionary with keys: ``fps``, ``total_frames``, ``duration_seconds``.

    Raises:
        RuntimeError: If OpenCV cannot open the video.
        ValueError: If FPS is invalid.
    """
    valid_path = validate_video_path(video_path)

    cap = cv2.VideoCapture(valid_path)
    if not cap.isOpened():
        raise RuntimeError(f"Unable to open video: {valid_path}")

    try:
        fps = float(cap.get(cv2.CAP_PROP_FPS))
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

        if fps <= 0:
            raise ValueError(f"Invalid FPS ({fps}) for video: {valid_path}")

        duration_seconds = total_frames / fps if total_frames > 0 else 0.0
        return {
            "fps": fps,
            "total_frames": float(total_frames),
            "duration_seconds": duration_seconds,
        }
    finally:
        cap.release()
