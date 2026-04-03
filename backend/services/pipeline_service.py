"""
Pipeline service — orchestrates video processing.

Simulates the feature extraction pipeline. In production, this would call
actual ML models (feature_pipeline.py, attention_engine.py).
"""

import asyncio
import logging
from pathlib import Path

from video_pipeline import PipelineConfig, get_video_metadata, process_video

logger = logging.getLogger(__name__)

# ─── In-memory progress tracker ──────────────────────────────────────────────

_progress: dict[str, dict] = {}


def get_progress(video_id: str) -> dict:
    """Get the current processing progress for a video."""
    return _progress.get(video_id, {
        "status": "unknown",
        "progress": 0,
        "stage": "unknown",
    })


def set_progress(video_id: str, status: str, progress: int, stage: str = "") -> None:
    """Update processing progress."""
    _progress[video_id] = {
        "status": status,
        "progress": min(100, max(0, progress)),
        "stage": stage,
    }
    logger.info(f"[{video_id}] {stage}: {progress}% ({status})")


def clear_progress(video_id: str) -> None:
    """Remove progress tracking for a video."""
    _progress.pop(video_id, None)


# ─── WebSocket subscribers (for live progress push) ──────────────────────────

_ws_subscribers: dict[str, list] = {}


def subscribe_ws(video_id: str, ws):
    """Register a websocket for progress updates."""
    if video_id not in _ws_subscribers:
        _ws_subscribers[video_id] = []
    _ws_subscribers[video_id].append(ws)


def unsubscribe_ws(video_id: str, ws):
    """Remove a websocket subscription."""
    if video_id in _ws_subscribers:
        _ws_subscribers[video_id] = [w for w in _ws_subscribers[video_id] if w != ws]


async def _notify_subscribers(video_id: str) -> None:
    """Push progress update to all subscribed websockets."""
    import json
    subscribers = _ws_subscribers.get(video_id, [])
    if not subscribers:
        return

    progress_data = get_progress(video_id)
    message = json.dumps(progress_data)

    dead = []
    for ws in subscribers:
        try:
            await ws.send_text(message)
        except Exception:
            dead.append(ws)

    # Clean up dead connections
    for ws in dead:
        unsubscribe_ws(video_id, ws)


# ─── Feature Extraction (simulated) ──────────────────────────────────────────

async def run_feature_pipeline(video_id: str, video_path: Path) -> dict:
    """
    Run real frame-by-frame feature extraction from the uploaded video.
    """
    set_progress(video_id, "processing", 10, "Starting frame-by-frame extraction")
    await _notify_subscribers(video_id)

    set_progress(video_id, "processing", 18, "Reading video metadata")
    await _notify_subscribers(video_id)
    metadata = await asyncio.to_thread(get_video_metadata, str(video_path))

    set_progress(video_id, "processing", 28, "Decoding and sampling frames")
    await _notify_subscribers(video_id)

    cfg = PipelineConfig(
        sample_rate=1.0,
        resize_size=(320, 180),
        grayscale=True,
        scene_threshold=0.05,
        use_histogram=False,
        histogram_threshold=0.85,
        detect_humans=True,
        max_humans=8,
    )

    frame_signals = await asyncio.to_thread(process_video, str(video_path), cfg)
    if not frame_signals:
        raise RuntimeError("No frame features extracted from the uploaded video")

    set_progress(video_id, "processing", 42, "Computing motion and scene features")
    await _notify_subscribers(video_id)

    motion_scores = [float(item["motion_score"]) for item in frame_signals]
    face_presence = [int(item["human_count"]) > 0 for item in frame_signals]
    color_variance = [float(item["visual_variation_score"]) for item in frame_signals]
    scene_changes = [float(item["timestamp"]) for item in frame_signals if item["scene_change"]]

    set_progress(video_id, "processing", 50, "Synthesizing temporal attention signals")
    await _notify_subscribers(video_id)

    # The provided pipeline is visual-first; derive a stable proxy for audio_energy
    # so downstream scoring can run without requiring a separate audio model.
    audio_energy = [
        round(
            min(
                1.0,
                max(
                    0.0,
                    0.55 * float(item["edge_density"]) + 0.45 * float(item["pacing_score"]),
                ),
            ),
            4,
        )
        for item in frame_signals
    ]

    duration = float(metadata.get("duration_seconds") or frame_signals[-1]["timestamp"] or 0.0)
    features = {
        "frame_count": int(metadata.get("total_frames", 0)),
        "fps": float(metadata.get("fps", 0.0)),
        "duration": duration,
        "resolution": "320x180",
        "motion_scores": motion_scores,
        "face_presence": face_presence,
        "audio_energy": audio_energy,
        "scene_changes": scene_changes,
        "color_variance": color_variance,
        "frame_signals": frame_signals,
    }

    set_progress(video_id, "processing", 55, "Feature extraction complete")
    await _notify_subscribers(video_id)

    logger.info(f"[{video_id}] Feature extraction complete: {features['frame_count']} frames")
    return features


# ─── Full Pipeline Orchestrator ───────────────────────────────────────────────

async def run_full_pipeline(video_id: str, video_path: Path) -> dict:
    """
    Run the complete analysis pipeline:
    1. Feature extraction
    2. Attention scoring
    3. Result compilation
    """
    try:
        set_progress(video_id, "processing", 5, "Pipeline initialized")
        await _notify_subscribers(video_id)

        # Step 1: Feature extraction
        features = await run_feature_pipeline(video_id, video_path)

        # Step 2: Attention scoring (delegated to attention_service)
        # Import here to avoid circular dependency
        from services.attention_service import run_attention_pipeline

        set_progress(video_id, "processing", 60, "Running attention model")
        await _notify_subscribers(video_id)

        analysis = await run_attention_pipeline(video_id, features)
        analysis["pipeline_preview"] = features.get("frame_signals", [])[:5]

        # Step 3: Save results
        from services.storage_service import save_features, save_analysis

        set_progress(video_id, "processing", 90, "Saving results")
        await _notify_subscribers(video_id)
        await asyncio.sleep(0.5)

        await save_features(video_id, features)
        await save_analysis(video_id, analysis)

        set_progress(video_id, "completed", 100, "Analysis complete")
        await _notify_subscribers(video_id)

        logger.info(f"[{video_id}] Pipeline completed successfully")
        return analysis

    except Exception as e:
        logger.error(f"[{video_id}] Pipeline failed: {e}", exc_info=True)
        set_progress(video_id, "failed", 0, f"Error: {str(e)}")
        await _notify_subscribers(video_id)
        raise
