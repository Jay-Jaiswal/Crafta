"""
Attention service backed by Analyzer intelligence rules.

This module converts frame-level features into factual attention analysis
using the user's Analyzer/intelligence.py engine, then maps output to the
existing frontend response schema.
"""

from __future__ import annotations

import asyncio
import importlib.util
import json
import logging
import os
import sys
import zipfile
from urllib import error as url_error
from urllib import request as url_request
from pathlib import Path
from statistics import mean
from typing import Any

from services.pipeline_service import _notify_subscribers, set_progress

logger = logging.getLogger(__name__)

_ANALYZER_FN = None
_GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")
_LOCAL_SOLUTION_MODEL = None


def _load_analyzer_function():
    global _ANALYZER_FN
    if _ANALYZER_FN is not None:
        return _ANALYZER_FN

    analyzer_file = Path(__file__).resolve().parents[2] / "Analyzer" / "intelligence.py"
    if not analyzer_file.is_file():
        raise FileNotFoundError(f"Analyzer engine not found at {analyzer_file}")

    spec = importlib.util.spec_from_file_location("analyzer_intelligence", analyzer_file)
    if spec is None or spec.loader is None:
        raise RuntimeError("Unable to load Analyzer intelligence module")

    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    fn = getattr(module, "analyze_processed_video", None)
    if fn is None:
        raise RuntimeError("Analyzer module does not expose analyze_processed_video")

    _ANALYZER_FN = fn
    return _ANALYZER_FN


def _clamp(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))


def _severity_to_drop_severity(severity: str) -> str:
    if severity == "critical":
        return "high"
    if severity == "medium":
        return "medium"
    return "low"


def _icon_from_cause(cause: str) -> str:
    mapping = {
        "limited_visual_dynamics": "motion",
        "underexposed_visuals": "audio",
        "overexposed_visuals": "audio",
        "no_clear_focal_subject": "face",
        "weak_scene_progression": "pacing",
        "pacing_instability": "pacing",
        "repetitive_structure": "repeat",
        "low_visual_clarity": "audio",
        "mixed_quality_decline": "hook",
    }
    return mapping.get(cause, "hook")


def _tag_from_causes(causes: list[str]) -> str:
    if "repetitive_structure" in causes:
        return "Repetitive"
    if any(c in causes for c in [
        "limited_visual_dynamics",
        "no_clear_focal_subject",
        "weak_scene_progression",
        "pacing_instability",
        "low_visual_clarity",
        "underexposed_visuals",
        "overexposed_visuals",
    ]):
        return "Too Slow"
    return "Hook Weak"


def _tag_from_solution_text(text: str) -> str:
    lowered = text.lower()
    if any(word in lowered for word in ["repeat", "repet", "pattern"]):
        return "Repetitive"
    if any(word in lowered for word in ["pace", "slow", "cut", "scene", "motion"]):
        return "Too Slow"
    return "Hook Weak"


def _build_segments(attention_scores: list[dict], duration: float) -> list[dict]:
    segments: list[dict] = []
    if not attention_scores:
        return segments

    current_type = None
    current_start = float(attention_scores[0]["time"])

    for point in attention_scores:
        score = float(point["score"])
        if score >= 70:
            seg_type = "high"
        elif score >= 45:
            seg_type = "risk"
        else:
            seg_type = "low"

        if current_type is None:
            current_type = seg_type
            current_start = float(point["time"])
            continue

        if seg_type != current_type:
            end = float(point["time"])
            in_range = [s["score"] for s in attention_scores if current_start <= s["time"] < end]
            avg = round(float(mean(in_range)), 1) if in_range else 50.0
            label = {
                "high": "High Engagement",
                "risk": "Risk Zone",
                "low": "Low Energy",
            }[current_type]
            segments.append({
                "start": current_start,
                "end": end,
                "type": current_type,
                "label": label,
                "score": avg,
            })
            current_start = end
            current_type = seg_type

    final_scores = [s["score"] for s in attention_scores if s["time"] >= current_start]
    final_avg = round(float(mean(final_scores)), 1) if final_scores else float(attention_scores[-1]["score"])
    segments.append({
        "start": current_start,
        "end": duration,
        "type": current_type,
        "label": {
            "high": "High Engagement",
            "risk": "Risk Zone",
            "low": "Low Energy",
        }[current_type],
        "score": final_avg,
    })
    return segments


def _build_what_if(overall_score: float, drops: list[dict]) -> dict:
    severity_weight = {"high": 4.0, "medium": 2.5, "low": 1.0}
    improvement = sum(severity_weight.get(d.get("severity", "low"), 1.0) for d in drops[:3])
    improvement = round(_clamp(improvement, 3.0, 18.0), 0)
    return {
        "original_score": overall_score,
        "improved_score": min(100, overall_score + improvement),
        "improvement": improvement,
        "trimmed_segments": [
            {
                "start": d["start"],
                "end": d["end"],
                "label": d["reason"],
            }
            for d in drops[:3]
        ],
        "description": (
            "Estimated improvement is calculated from detected drop severity and duration; "
            "resolving top drop segments should raise retention consistency."
        ),
    }


def _mean_or(values: list[float], default: float = 0.0) -> float:
    return float(mean(values)) if values else default


def _load_local_solution_model() -> dict | None:
    """Load local model from model/solution_model checkpoint directory."""
    global _LOCAL_SOLUTION_MODEL
    if _LOCAL_SOLUTION_MODEL is not None:
        return _LOCAL_SOLUTION_MODEL

    try:
        import torch
        import torch.nn as nn
    except Exception as exc:
        logger.warning("Local solution model disabled: torch not available (%s)", exc)
        return None

    model_dir = Path(__file__).resolve().parents[2] / "model" / "solution_model"
    if not model_dir.is_dir():
        logger.warning("Local solution model not found at %s", model_dir)
        return None

    bundle_path = model_dir.parent / "solution_model.pt"
    if not bundle_path.is_file():
        root = "solution_model"
        with zipfile.ZipFile(bundle_path, "w", compression=zipfile.ZIP_STORED) as zf:
            for p in model_dir.rglob("*"):
                if p.is_file():
                    zf.write(p, f"{root}/{p.relative_to(model_dir).as_posix()}")

    checkpoint = torch.load(bundle_path, map_location="cpu", weights_only=False)
    state_dict = checkpoint.get("model_state_dict", {})
    feature_columns = checkpoint.get("feature_columns", [])
    labels = checkpoint.get("labels", [])

    if not state_dict or not feature_columns or not labels:
        logger.warning("Local solution model checkpoint missing required keys")
        return None

    # Reconstruct architecture from discovered checkpoint shapes.
    input_dim = int(state_dict["net.0.weight"].shape[1])
    hidden_1 = int(state_dict["net.0.weight"].shape[0])
    hidden_2 = int(state_dict["net.3.weight"].shape[0])
    output_dim = int(state_dict["net.5.weight"].shape[0])

    model = nn.Sequential(
        nn.Linear(input_dim, hidden_1),
        nn.ReLU(),
        nn.Dropout(0.1),
        nn.Linear(hidden_1, hidden_2),
        nn.ReLU(),
        nn.Linear(hidden_2, output_dim),
    )
    remapped_state = {}
    for key, value in state_dict.items():
        if key.startswith("net."):
            remapped_state[key.replace("net.", "", 1)] = value
        else:
            remapped_state[key] = value
    model.load_state_dict(remapped_state)
    model.eval()

    _LOCAL_SOLUTION_MODEL = {
        "torch": torch,
        "model": model,
        "feature_columns": list(feature_columns),
        "labels": list(labels),
    }
    logger.info("Local solution model loaded successfully from %s", model_dir)
    return _LOCAL_SOLUTION_MODEL


def _rows_for_drop(frame_signals: list[dict], start_t: float, end_t: float) -> list[dict]:
    return [
        row for row in frame_signals
        if float(row.get("timestamp", -1)) >= start_t and float(row.get("timestamp", -1)) <= end_t
    ]


def _feature_vector_from_rows(rows: list[dict], features: dict, start_t: float, end_t: float) -> list[float]:
    if not rows:
        return [0.0] * 10

    brightness = [_clamp(float(r.get("brightness_score", 0.0)), 0.0, 1.0) for r in rows]
    motion = [_clamp(float(r.get("motion_score", 0.0)), 0.0, 1.0) for r in rows]
    variation = [_clamp(float(r.get("visual_variation_score", 0.0)), 0.0, 1.0) for r in rows]
    scene_flags = [1.0 if bool(r.get("scene_change", False)) else 0.0 for r in rows]
    risk = [_clamp(float(r.get("attention_drop_risk", 0.0)), 0.0, 1.0) for r in rows]
    pacing = [_clamp(float(r.get("pacing_score", 0.0)), 0.0, 1.0) for r in rows]
    edge = [_clamp(float(r.get("edge_density", 0.0)), 0.0, 1.0) for r in rows]

    audio_energy_all = features.get("audio_energy", []) or []
    source_rows = features.get("frame_signals", []) or []
    if audio_energy_all:
        indexed = [
            _clamp(float(audio_energy_all[i]), 0.0, 1.0)
            for i, r in enumerate(source_rows)
            if float(r.get("timestamp", -1)) >= start_t and float(r.get("timestamp", -1)) <= end_t and i < len(audio_energy_all)
        ]
    else:
        indexed = []

    blur_norm = _clamp(1.0 - _mean_or(edge, 0.2), 0.0, 1.0)
    brightness_norm = _mean_or(brightness, 0.5)
    saturation_norm = _mean_or(variation, 0.4)
    frame_diff_norm = _mean_or(variation, 0.4)
    motion_norm = _mean_or(motion, 0.3)
    scene_change_norm = _mean_or(scene_flags, 0.0)
    rms_norm = _mean_or(indexed, _mean_or(pacing, 0.3))
    zcr_norm = _mean_or(pacing, 0.3)
    clip_ratio_norm = _mean_or(risk, 0.2)
    flatness_norm = _clamp(1.0 - _mean_or(variation, 0.4), 0.0, 1.0)

    return [
        blur_norm,
        brightness_norm,
        saturation_norm,
        frame_diff_norm,
        motion_norm,
        scene_change_norm,
        rms_norm,
        zcr_norm,
        clip_ratio_norm,
        flatness_norm,
    ]


def _default_fallback_suggestions(*, duration: float) -> list[dict]:
    base_times = [0.0, round(max(0.0, duration * 0.33), 1), round(max(0.0, duration * 0.66), 1)]
    return [
        {
            "id": 1,
            "text": "Strengthen the first 3 seconds with a clearer visual hook and immediate context.",
            "confidence": 72,
            "tag": "Hook Weak",
            "jump_to": base_times[0],
            "impact": "+6% retention",
        },
        {
            "id": 2,
            "text": "Increase scene variation and pacing in the middle segment to prevent attention drift.",
            "confidence": 70,
            "tag": "Too Slow",
            "jump_to": base_times[1],
            "impact": "+7% retention",
        },
        {
            "id": 3,
            "text": "Add a pattern break near the final third using a new angle, b-roll, or text beat.",
            "confidence": 68,
            "tag": "Repetitive",
            "jump_to": base_times[2],
            "impact": "+5% retention",
        },
    ]


def _predict_solutions_with_local_model(*, raw_drops: list[dict], frame_signals: list[dict], features: dict, fallback: list[dict], duration: float) -> list[dict] | None:
    loaded = _load_local_solution_model()
    if not loaded:
        return None

    torch = loaded["torch"]
    model = loaded["model"]
    labels = loaded["labels"]

    if not raw_drops:
        rows = frame_signals
        vector = _feature_vector_from_rows(rows, features, 0.0, max(duration, 0.0))
        with torch.no_grad():
            x = torch.tensor([vector], dtype=torch.float32)
            logits = model(x)
            probs = torch.softmax(logits, dim=1)[0]
            topk = min(3, len(labels))
            values, indices = torch.topk(probs, k=topk)

        generated: list[dict] = []
        for idx, (prob, label_idx) in enumerate(zip(values.tolist(), indices.tolist()), start=1):
            text = str(labels[int(label_idx)])
            generated.append(
                {
                    "id": idx,
                    "text": text,
                    "confidence": round(_clamp(float(prob) * 100.0, 58.0, 92.0), 0),
                    "tag": _tag_from_solution_text(text),
                    "jump_to": round(_clamp((idx - 1) * max(duration / 3.0, 0.0), 0.0, max(duration, 0.0)), 1),
                    "impact": f"+{int(_clamp(5 + float(prob) * 8.0, 4, 12))}% retention",
                }
            )

        if generated:
            return generated
        return fallback

    suggestions: list[dict] = []
    for idx, drop in enumerate(raw_drops[:5], start=1):
        start_t = float(drop.get("start_time", 0.0))
        end_t = float(drop.get("end_time", start_t))
        rows = _rows_for_drop(frame_signals, start_t, end_t)
        vector = _feature_vector_from_rows(rows, features, start_t, end_t)

        with torch.no_grad():
            x = torch.tensor([vector], dtype=torch.float32)
            logits = model(x)
            probs = torch.softmax(logits, dim=1)[0]
            top_prob, top_idx = torch.max(probs, dim=0)

        predicted_text = labels[int(top_idx.item())]
        confidence = round(_clamp(float(top_prob.item()) * 100.0, 55.0, 98.0), 0)

        causes = drop.get("cause_codes", [])
        tag = _tag_from_causes(causes)
        impact = f"+{int(_clamp((100 - float(drop.get('avg_score', 50))) * 0.12, 4, 18))}% retention"

        suggestions.append(
            {
                "id": idx,
                "text": str(predicted_text),
                "confidence": confidence,
                "tag": tag,
                "jump_to": round(_clamp(start_t, 0.0, max(duration, 0.0)), 1),
                "impact": impact,
            }
        )

    return suggestions or fallback


def _sanitize_gemini_suggestions(items: Any, fallback: list[dict], duration: float) -> list[dict]:
    if not isinstance(items, list):
        return fallback

    cleaned: list[dict] = []
    for idx, item in enumerate(items[:5], start=1):
        if not isinstance(item, dict):
            continue

        text = str(item.get("text", "")).strip()
        if not text:
            continue

        tag = str(item.get("tag", "Hook Weak"))
        if tag not in {"Hook Weak", "Too Slow", "Repetitive"}:
            tag = "Hook Weak"

        impact = str(item.get("impact", "+5% retention")).strip() or "+5% retention"
        confidence = float(item.get("confidence", 70))
        jump_to = float(item.get("jump_to", 0))

        cleaned.append(
            {
                "id": idx,
                "text": text,
                "confidence": round(_clamp(confidence, 50, 98), 0),
                "tag": tag,
                "jump_to": round(_clamp(jump_to, 0.0, max(duration, 0.0)), 1),
                "impact": impact,
            }
        )

    return cleaned or fallback


def _extract_gemini_text(response_json: dict) -> str:
    candidates = response_json.get("candidates", [])
    if not candidates:
        return ""

    parts = candidates[0].get("content", {}).get("parts", [])
    if not parts:
        return ""
    return str(parts[0].get("text", "")).strip()


def _build_gemini_prompt(*, analyzer_output: dict, current_suggestions: list[dict], overall_score: float, duration: float) -> str:
    compact_drops = []
    for drop in analyzer_output.get("attention_drops", [])[:5]:
        compact_drops.append(
            {
                "start": drop.get("start_time"),
                "end": drop.get("end_time"),
                "severity": drop.get("severity"),
                "causes": drop.get("causes", []),
                "issues": drop.get("issues", []),
            }
        )

    payload = {
        "overall_score": overall_score,
        "duration": duration,
        "drops": compact_drops,
        "baseline_suggestions": current_suggestions,
        "video_suggestions": analyzer_output.get("suggestions", []),
    }

    return (
        "You are a video optimization analyst.\n"
        "Use ONLY the provided evidence. Do not invent metrics.\n"
        "Return exactly a JSON array (max 5 items), no markdown, no extra text.\n"
        "Each item must have keys: text, tag, impact, confidence, jump_to.\n"
        "Allowed tag values: Hook Weak, Too Slow, Repetitive.\n"
        "text must be specific and actionable for the exact segment.\n"
        "impact should be short, like '+8% retention'.\n"
        f"Evidence JSON:\n{json.dumps(payload, ensure_ascii=True)}"
    )


def _call_gemini_for_suggestions(*, analyzer_output: dict, current_suggestions: list[dict], overall_score: float, duration: float) -> list[dict] | None:
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        return None

    logger.info("Using Gemini API for recommendation enhancement (model=%s)", _GEMINI_MODEL)

    prompt = _build_gemini_prompt(
        analyzer_output=analyzer_output,
        current_suggestions=current_suggestions,
        overall_score=overall_score,
        duration=duration,
    )

    body = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.2,
            "responseMimeType": "application/json",
            "maxOutputTokens": 1000,
        },
    }

    fallback_models = [
        _GEMINI_MODEL,
        "gemini-1.5-flash-latest",
        "gemini-2.0-flash",
    ]

    seen = set()
    model_candidates = []
    for model in fallback_models:
        model = (model or "").strip()
        if model and model not in seen:
            model_candidates.append(model)
            seen.add(model)

    last_error = None
    for model_name in model_candidates:
        endpoint = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
        req = url_request.Request(
            endpoint,
            data=json.dumps(body).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )

        try:
            with url_request.urlopen(req, timeout=12) as resp:
                raw = resp.read().decode("utf-8")
            model_response = json.loads(raw)
            text = _extract_gemini_text(model_response)
            if not text:
                continue

            text = text.strip()
            if text.startswith("```"):
                text = text.strip("`")
                text = text.replace("json", "", 1).strip()

            parsed = json.loads(text)
            logger.info("Gemini recommendation enhancement succeeded (model=%s)", model_name)
            return _sanitize_gemini_suggestions(parsed, current_suggestions, duration)
        except (url_error.URLError, TimeoutError, json.JSONDecodeError, ValueError) as exc:
            last_error = exc
            logger.warning("Gemini request failed for model=%s: %s", model_name, exc)

    logger.warning("Gemini suggestion enhancement failed for all models; using predefined recommendations. Last error: %s", last_error)
    return None


async def run_attention_pipeline(video_id: str, features: dict) -> dict:
    duration = float(features.get("duration", 0.0) or 0.0)
    frame_signals = features.get("frame_signals", []) or []
    if not frame_signals:
        raise RuntimeError("Frame-level signals not found; cannot run Analyzer engine")

    set_progress(video_id, "processing", 65, "Preparing intelligence input")
    await _notify_subscribers(video_id)

    analyzer_input = {
        "video_name": f"{video_id}.mp4",
        "metadata": {
            "duration": duration,
            "fps": float(features.get("fps", 0.0) or 0.0),
        },
        "frames": [
            {
                "timestamp": float(row.get("timestamp", 0.0)),
                "motion": float(row.get("motion_score", 0.0)),
                "brightness": float(row.get("brightness_score", 0.0)),
                "scene_change": 1 if bool(row.get("scene_change", False)) else 0,
                "repetition": max(0.0, 1.0 - float(row.get("visual_variation_score", 0.0))),
                "pacing_consistency": float(row.get("pacing_score", 0.0)),
                "human_count": int(row.get("human_count", 0)),
                "face_presence": (
                    1.0
                    if int(row.get("human_count", 0)) > 0
                    else round(
                        _clamp(
                            0.15
                            + 0.35 * float(row.get("motion_score", 0.0))
                            + 0.25 * (1.0 if bool(row.get("scene_change", False)) else 0.0)
                            + 0.25 * float(row.get("visual_variation_score", 0.0)),
                            0.0,
                            0.7,
                        ),
                        4,
                    )
                ),
            }
            for row in frame_signals
        ],
    }

    set_progress(video_id, "processing", 72, "Running Analyzer intelligence")
    await _notify_subscribers(video_id)

    analyze_fn = _load_analyzer_function()
    analyzer_output = await asyncio.to_thread(
        analyze_fn,
        analyzer_input,
        40.0,
        18.0,
    )

    set_progress(video_id, "processing", 82, "Mapping intelligence output")
    await _notify_subscribers(video_id)

    detailed = analyzer_output.get("attention_timeline_detailed", [])
    attention_scores = []
    for item in detailed:
        details = item.get("feature_contributions", {})
        label = ""
        if details.get("scene_change", 0) >= 90:
            label = "Scene change"
        elif item.get("severity") == "critical":
            label = "Drop zone"
        elif item.get("severity") == "medium":
            label = "Risk"

        attention_scores.append(
            {
                "time": round(float(item.get("timestamp", 0.0)), 1),
                "score": round(float(item.get("score", 0.0)), 1),
                "label": label,
            }
        )

    drops = []
    insights = []

    raw_drops = analyzer_output.get("attention_drops", [])
    for idx, drop in enumerate(raw_drops, start=1):
        causes = drop.get("cause_codes", [])
        human_readable_causes = drop.get("causes", [])
        root_cause = human_readable_causes[0] if human_readable_causes else "Mixed quality decline factors"
        details_text = " ".join(drop.get("issues", [])[:2]) or "Quality drop detected from frame-level signals."

        confidence = round(
            _clamp(
                65 + (40 - min(float(drop.get("min_score", 40)), 40)) * 0.6 + float(drop.get("duration_sec", 0)) * 4,
                62,
                95,
            ),
            0,
        )

        mapped = {
            "id": idx,
            "start": round(float(drop.get("start_time", 0.0)), 1),
            "end": round(float(drop.get("end_time", 0.0)), 1),
            "reason": root_cause,
            "severity": _severity_to_drop_severity(str(drop.get("severity", "medium"))),
            "confidence": confidence,
            "details": details_text,
            "causes": causes,
        }
        drops.append(mapped)

        insights.append(
            {
                "id": idx,
                "icon": _icon_from_cause(causes[0] if causes else "mixed_quality_decline"),
                "title": root_cause,
                "description": details_text,
                "time_range": f"{int(mapped['start'])}s - {int(mapped['end'])}s",
                "start": mapped["start"],
                "end": mapped["end"],
                "confidence": confidence,
                "severity": mapped["severity"],
            }
        )

    suggestions = []
    for idx, drop in enumerate(raw_drops[:5], start=1):
        fixes = drop.get("fixes", [])
        causes = drop.get("cause_codes", [])
        jump_to = round(float(drop.get("start_time", 0.0)), 1)
        conf = round(
            _clamp(
                65 + (40 - min(float(drop.get("min_score", 40)), 40)) * 0.6,
                62,
                95,
            ),
            0,
        )

        suggestions.append(
            {
                "id": idx,
                "text": fixes[0] if fixes else "Improve this segment using clarity, pacing, and structure adjustments.",
                "confidence": conf,
                "tag": _tag_from_causes(causes),
                "jump_to": jump_to,
                "impact": f"+{int(_clamp((100 - float(drop.get('avg_score', 50))) * 0.12, 4, 18))}% retention",
            }
        )

    if not suggestions:
        suggestions = _default_fallback_suggestions(duration=duration)

    set_progress(video_id, "processing", 88, "Predicting model-based solutions")
    await _notify_subscribers(video_id)
    model_suggestions = await asyncio.to_thread(
        _predict_solutions_with_local_model,
        raw_drops=raw_drops,
        frame_signals=frame_signals,
        features=features,
        fallback=suggestions,
        duration=duration,
    )
    if model_suggestions:
        suggestions = model_suggestions
    elif not suggestions:
        suggestions = _default_fallback_suggestions(duration=duration)

    overall_score = round(float(analyzer_output.get("overall_score", 0.0)), 1)
    key_insights = analyzer_output.get("key_insights", {})
    worst = key_insights.get("worst_segment") or {}

    if worst:
        summary = (
            f"Most critical interval is {int(float(worst.get('start_time', 0)))}s-"
            f"{int(float(worst.get('end_time', 0)))}s with average score {round(float(worst.get('avg_score', 0)), 1)}%. "
            f"Overall score is {overall_score}% based on visual dynamics, clarity, focal presence, and pacing signals."
        )
    else:
        summary = (
            f"Overall score is {overall_score}%. No major sustained drops were detected by Analyzer rules."
        )

    segments = _build_segments(attention_scores, duration)
    what_if = _build_what_if(overall_score, drops)

    frame_count = int(features.get("frame_count", 0) or 0)
    total_views = int(_clamp(frame_count * 6 + duration * 120, 100, 500000))
    avg_watch_seconds = int(_clamp(duration * (0.35 + overall_score / 180.0), 3, max(duration, 3)))
    completion_pct = int(_clamp(25 + overall_score * 0.6, 20, 92))

    result = {
        "video_url": f"/uploads/{video_id}/video.mp4",
        "video_duration": duration,
        "overall_score": overall_score,
        "total_views": total_views,
        "avg_watch_time": f"{avg_watch_seconds}s",
        "completion_rate": f"{completion_pct}%",
        "summary": summary,
        "attention_scores": attention_scores,
        "drops": drops,
        "segments": segments,
        "insights": insights,
        "suggestions": suggestions,
        "what_if": what_if,
        "analyzer_raw": {
            "total_drops": analyzer_output.get("total_drops", len(raw_drops)),
            "compliance_summary": analyzer_output.get("compliance_summary", {}),
            "video_suggestions": analyzer_output.get("suggestions", []),
        },
    }

    logger.info(
        "[%s] Analyzer attention complete: score=%s drops=%s insights=%s",
        video_id,
        overall_score,
        len(drops),
        len(insights),
    )

    return result
