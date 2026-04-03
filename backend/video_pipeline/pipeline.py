"""End-to-end video processing pipeline orchestration."""

from dataclasses import dataclass
from typing import Optional

import cv2
import numpy as np

from .attention_features import (
    build_hog_person_detector,
    compute_brightness_score,
    compute_edge_density,
    compute_visual_variation_score,
    estimate_human_count,
)
from .frame_extractor import extract_frames
from .metadata import get_video_metadata
from .preprocessing import preprocess_frame
from .scene_detection import detect_scene_change


@dataclass(frozen=True)
class PipelineConfig:
    """Configurable runtime options for video processing."""

    sample_rate: float = 1.0
    resize_size: Optional[tuple[int, int]] = (320, 180)
    grayscale: bool = True
    scene_threshold: float = 0.05
    use_histogram: bool = False
    histogram_threshold: float = 0.85
    detect_humans: bool = True
    max_humans: int = 8


def process_video(
    video_path: str,
    config: Optional[PipelineConfig] = None,
) -> list[dict[str, object]]:
    """Process a video and return frame-level attention signals.

    Output format:
    [
      {
        "timestamp": float,
        "frame_id": int,
        "scene_change": bool,
            "motion_score": float,
            "brightness_score": float,
            "edge_density": float,
            "human_count": int,
                "pacing_score": float,
                "visual_variation_score": float,
            "attention_drop_risk": float,
      }
    ]
    """
    cfg = config or PipelineConfig()

    # Validate the source and fail early on unreadable media.
    get_video_metadata(video_path)

    results: list[dict[str, object]] = []
    prev_processed: Optional[np.ndarray] = None
    prev_gray: Optional[np.ndarray] = None
    hog_detector = build_hog_person_detector(cfg.detect_humans)
    last_scene_change_ts: Optional[float] = None
    scene_change_timestamps: list[float] = []

    for frame_id, timestamp, raw_frame in extract_frames(video_path, cfg.sample_rate):
        frame_bgr = raw_frame
        if cfg.resize_size is not None:
            width, height = cfg.resize_size
            frame_bgr = cv2.resize(frame_bgr, (width, height), interpolation=cv2.INTER_AREA)

        processed = preprocess_frame(
            frame_bgr,
            resize_size=None,
            grayscale=cfg.grayscale,
        )

        processed_gray = processed
        if len(processed.shape) == 3:
            processed_gray = cv2.cvtColor(processed, cv2.COLOR_BGR2GRAY)

        if prev_processed is None:
            scene_change = False
            motion_score = 0.0
            visual_variation_score = 0.0
        else:
            scene_change = detect_scene_change(
                prev_frame=prev_processed,
                curr_frame=processed,
                threshold=cfg.scene_threshold,
                use_histogram=cfg.use_histogram,
                histogram_threshold=cfg.histogram_threshold,
            )

            diff = cv2.absdiff(prev_processed, processed)
            motion_score = float(np.mean(diff)) / 255.0
            visual_variation_score = compute_visual_variation_score(prev_gray, processed_gray)

        if scene_change:
            scene_change_timestamps.append(float(timestamp))

        recent_window_seconds = 10.0
        recent_changes = sum(
            1 for ts in scene_change_timestamps if ts >= float(timestamp) - recent_window_seconds
        )
        rolling_pace = min(1.0, recent_changes / 5.0)

        if last_scene_change_ts is None:
            time_since_last_cut = float(timestamp) + 1.0
        else:
            time_since_last_cut = max(0.001, float(timestamp) - last_scene_change_ts)

        instant_pace = min(1.0, 1.0 / max(1.0, time_since_last_cut))
        pacing_score = 0.6 * rolling_pace + 0.4 * instant_pace

        if scene_change:
            last_scene_change_ts = float(timestamp)

        brightness_score = compute_brightness_score(processed_gray)
        edge_density = compute_edge_density(processed_gray)
        human_count = estimate_human_count(frame_bgr, hog_detector, cfg.max_humans)

        # Simple heuristic risk score for downstream ranking.
        low_brightness_penalty = max(0.0, 0.45 - brightness_score)
        attention_drop_risk = min(
            1.0,
            0.45 * motion_score
            + 0.35 * float(scene_change)
            + 0.15 * low_brightness_penalty
            + 0.05 * edge_density,
        )

        results.append(
            {
                "timestamp": float(timestamp),
                "frame_id": int(frame_id),
                "scene_change": bool(scene_change),
                "motion_score": round(motion_score, 4),
                "brightness_score": round(brightness_score, 4),
                "edge_density": round(edge_density, 4),
                "human_count": int(human_count),
                "pacing_score": round(pacing_score, 4),
                "visual_variation_score": round(visual_variation_score, 4),
                "attention_drop_risk": round(attention_drop_risk, 4),
            }
        )
        prev_processed = processed
        prev_gray = processed_gray

    return results
