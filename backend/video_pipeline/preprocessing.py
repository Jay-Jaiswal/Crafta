"""Frame preprocessing utilities."""

from typing import Optional

import cv2
import numpy as np


def preprocess_frame(
    frame: np.ndarray,
    resize_size: Optional[tuple[int, int]] = (320, 180),
    grayscale: bool = True,
) -> np.ndarray:
    """Resize and optionally convert a frame to grayscale.

    Args:
        frame: Input frame in BGR format.
        resize_size: Target ``(width, height)``. If ``None``, no resize.
        grayscale: If ``True``, convert output to grayscale.

    Returns:
        Preprocessed frame.
    """
    if frame is None or frame.size == 0:
        raise ValueError("Input frame is empty")

    processed = frame

    if resize_size is not None:
        width, height = resize_size
        if width <= 0 or height <= 0:
            raise ValueError("resize_size must have positive width and height")
        processed = cv2.resize(processed, (width, height), interpolation=cv2.INTER_AREA)

    if grayscale:
        processed = cv2.cvtColor(processed, cv2.COLOR_BGR2GRAY)

    return processed
