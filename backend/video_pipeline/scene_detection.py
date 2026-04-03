"""Scene change detection helpers."""

import cv2
import numpy as np


def detect_scene_change(
    prev_frame: np.ndarray,
    curr_frame: np.ndarray,
    threshold: float = 0.20,
    use_histogram: bool = False,
    histogram_threshold: float = 0.85,
) -> bool:
    """Return whether current frame starts a new scene.

    Supports two methods:
    - Mean absolute pixel difference (default)
    - Histogram correlation
    """
    if prev_frame is None or curr_frame is None:
        raise ValueError("Both prev_frame and curr_frame are required")

    if prev_frame.shape != curr_frame.shape:
        raise ValueError("prev_frame and curr_frame must have matching shape")

    if use_histogram:
        prev_hist = cv2.calcHist([prev_frame], [0], None, [256], [0, 256])
        curr_hist = cv2.calcHist([curr_frame], [0], None, [256], [0, 256])
        cv2.normalize(prev_hist, prev_hist)
        cv2.normalize(curr_hist, curr_hist)
        correlation = cv2.compareHist(prev_hist, curr_hist, cv2.HISTCMP_CORREL)
        return correlation < histogram_threshold

    frame_diff = cv2.absdiff(prev_frame, curr_frame)
    normalized_mean_diff = float(np.mean(frame_diff)) / 255.0
    return normalized_mean_diff >= threshold
