"""Lightweight frame-level features for attention analysis."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

import cv2
import numpy as np


@dataclass(frozen=True)
class FeatureConfig:
    """Configuration for optional frame feature extraction."""

    detect_humans: bool = True
    max_humans: int = 8


def compute_brightness_score(frame_gray: np.ndarray) -> float:
    """Return normalized brightness in [0, 1]."""
    return float(np.mean(frame_gray)) / 255.0


def compute_edge_density(frame_gray: np.ndarray) -> float:
    """Return the fraction of edge pixels in [0, 1]."""
    edges = cv2.Canny(frame_gray, 100, 200)
    return float(np.count_nonzero(edges)) / float(edges.size)


def compute_visual_variation_score(prev_gray: np.ndarray, curr_gray: np.ndarray) -> float:
    """Compute visual variation between consecutive frames in [0, 1].

    Uses a blend of pixel difference, histogram drift, and texture change.
    """
    frame_diff = cv2.absdiff(prev_gray, curr_gray)
    diff_score = float(np.mean(frame_diff)) / 255.0

    prev_hist = cv2.calcHist([prev_gray], [0], None, [256], [0, 256])
    curr_hist = cv2.calcHist([curr_gray], [0], None, [256], [0, 256])
    cv2.normalize(prev_hist, prev_hist)
    cv2.normalize(curr_hist, curr_hist)
    corr = float(cv2.compareHist(prev_hist, curr_hist, cv2.HISTCMP_CORREL))
    hist_score = 1.0 - ((corr + 1.0) / 2.0)

    prev_texture = float(cv2.Laplacian(prev_gray, cv2.CV_64F).var())
    curr_texture = float(cv2.Laplacian(curr_gray, cv2.CV_64F).var())
    texture_score = min(1.0, abs(curr_texture - prev_texture) / 1000.0)

    return min(1.0, 0.5 * diff_score + 0.3 * hist_score + 0.2 * texture_score)


def estimate_human_count(
    frame_bgr: np.ndarray,
    hog: Optional[cv2.HOGDescriptor],
    max_humans: int,
) -> int:
    """Estimate number of people using OpenCV HOG person detector.

    This is not perfect but provides a useful MVP signal without deep learning.
    """
    if hog is None:
        return 0

    boxes, _weights = hog.detectMultiScale(
        frame_bgr,
        winStride=(8, 8),
        padding=(8, 8),
        scale=1.05,
    )
    return int(min(len(boxes), max_humans))


def build_hog_person_detector(enabled: bool) -> Optional[cv2.HOGDescriptor]:
    """Create and return a HOG person detector when enabled."""
    if not enabled:
        return None

    hog = cv2.HOGDescriptor()
    hog.setSVMDetector(cv2.HOGDescriptor_getDefaultPeopleDetector())
    return hog
