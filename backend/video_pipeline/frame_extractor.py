"""Frame sampling utilities."""

from collections.abc import Generator

import cv2
import numpy as np

from .upload import validate_video_path


def extract_frames(
    video_path: str,
    sample_rate: float,
) -> Generator[tuple[int, float, np.ndarray], None, None]:
    """Yield sampled frames as ``(frame_id, timestamp, frame_bgr)``.

    This is implemented as a generator to avoid storing full videos in memory.

    Args:
        video_path: Local path to a video file.
        sample_rate: Number of sampled frames per second.

    Raises:
        ValueError: If sample_rate or source FPS is invalid.
        RuntimeError: If OpenCV cannot open the video.
    """
    if sample_rate <= 0:
        raise ValueError("sample_rate must be > 0")

    valid_path = validate_video_path(video_path)

    cap = cv2.VideoCapture(valid_path)
    if not cap.isOpened():
        raise RuntimeError(f"Unable to open video: {valid_path}")

    try:
        fps = float(cap.get(cv2.CAP_PROP_FPS))
        if fps <= 0:
            raise ValueError(f"Invalid FPS ({fps}) for video: {valid_path}")

        frame_interval = max(1, int(round(fps / sample_rate)))
        frame_id = 0

        while True:
            success, frame = cap.read()
            if not success:
                break

            if frame_id % frame_interval == 0:
                timestamp = frame_id / fps
                yield frame_id, timestamp, frame

            frame_id += 1
    finally:
        cap.release()
