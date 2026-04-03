from __future__ import annotations

from dataclasses import dataclass
from statistics import mean, pstdev
from typing import Any


def _clamp(value: float, minimum: float = 0.0, maximum: float = 100.0) -> float:
    return max(minimum, min(value, maximum))


def _to_float(value: Any, fallback: float = 0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return fallback


def _pick_value(frame: dict[str, Any], keys: list[str], fallback: float = 0.0) -> float:
    for key in keys:
        if key in frame and frame.get(key) is not None:
            return _to_float(frame.get(key), fallback)
    return fallback


@dataclass
class FrameFeatures:
    timestamp: float
    motion: float
    brightness: float
    face_presence: float
    scene_change: float
    repetition: float
    pacing_consistency: float


@dataclass
class ScoredFrame:
    timestamp: float
    score: float
    severity: str
    details: dict[str, float]


CAUSE_LABELS: dict[str, str] = {
    "limited_visual_dynamics": "Limited visual dynamics",
    "underexposed_visuals": "Underexposed visuals",
    "overexposed_visuals": "Overexposed visuals",
    "no_clear_focal_subject": "Lack of a clear focal subject",
    "weak_scene_progression": "Weak scene progression",
    "pacing_instability": "Inconsistent pacing rhythm",
    "repetitive_structure": "Repetitive visual structure",
    "low_visual_clarity": "Low visual clarity",
    "mixed_quality_decline": "Mixed quality decline factors",
}


def _score_to_severity(score: float) -> str:
    if score < 25:
        return "critical"
    if score < 50:
        return "medium"
    return "low"


def _normalize_motion(motion: float) -> float:
    normalized = motion * 100.0 if motion <= 1.0 else motion
    return _clamp(normalized)


def _normalize_brightness(brightness: float) -> float:
    if brightness <= 1.0:
        normalized = brightness * 100.0
    elif brightness <= 255.0:
        normalized = (brightness / 255.0) * 100.0
    else:
        normalized = brightness
    return _clamp(normalized)


def _normalize_face_presence(face_presence: float) -> float:
    normalized = face_presence * 100.0 if face_presence <= 1.0 else face_presence
    return _clamp(normalized)


def _normalize_scene_change(scene_change: float) -> float:
    if scene_change in (0, 1):
        return 100.0 if scene_change == 1 else 30.0
    normalized = scene_change * 100.0 if scene_change <= 1.0 else scene_change
    return _clamp(normalized)


def _normalize_repetition_penalty(repetition: float) -> float:
    normalized = repetition * 100.0 if repetition <= 1.0 else repetition
    return _clamp(normalized)


def _normalize_pacing_consistency(pacing_consistency: float) -> float:
    normalized = pacing_consistency * 100.0 if pacing_consistency <= 1.0 else pacing_consistency
    return _clamp(normalized)


def _color_quality_label(brightness_score: float) -> str:
    if brightness_score < 30:
        return "underexposed"
    if brightness_score > 90:
        return "overexposed"
    if brightness_score < 45:
        return "dim"
    return "balanced"


def _score_frame(frame: FrameFeatures) -> ScoredFrame:
    motion_score = _normalize_motion(frame.motion)
    brightness_score = _normalize_brightness(frame.brightness)
    face_score = _normalize_face_presence(frame.face_presence)
    scene_score = _normalize_scene_change(frame.scene_change)
    repetition_penalty = _normalize_repetition_penalty(frame.repetition)
    pacing_score = _normalize_pacing_consistency(frame.pacing_consistency)

    attention = (
        (motion_score * 0.25)
        + (brightness_score * 0.18)
        + (face_score * 0.22)
        + (scene_score * 0.12)
        + (pacing_score * 0.13)
        - (repetition_penalty * 0.20)
    )
    attention = round(_clamp(attention), 2)

    return ScoredFrame(
        timestamp=round(frame.timestamp, 3),
        score=attention,
        severity=_score_to_severity(attention),
        details={
            "motion": round(motion_score, 2),
            "brightness": round(brightness_score, 2),
            "face_presence": round(face_score, 2),
            "scene_change": round(scene_score, 2),
            "pacing_consistency": round(pacing_score, 2),
            "repetition_penalty": round(repetition_penalty, 2),
            "color_quality": _color_quality_label(brightness_score),
        },
    )


def _derive_repetition(frames: list[dict[str, Any]], index: int) -> float:
    raw = frames[index].get("repetition")
    if raw is not None:
        return _to_float(raw)

    visual_variation = frames[index].get("visual_variation_score")
    if visual_variation is not None:
        variation = _to_float(visual_variation, 0.0)
        variation_norm = variation if variation <= 1.0 else (variation / 100.0)
        repetition_from_variation = 1.0 - _clamp(variation_norm, 0.0, 1.0)

        risk = frames[index].get("attention_drop_risk")
        if risk is not None:
            risk_value = _to_float(risk, 0.0)
            risk_norm = risk_value if risk_value <= 1.0 else (risk_value / 100.0)
            repetition_from_variation = max(repetition_from_variation, _clamp(risk_norm, 0.0, 1.0))
        return repetition_from_variation

    streak = 0
    cursor = index
    while cursor >= 0:
        sample = frames[cursor]
        motion = _to_float(sample.get("motion"), 0.0)
        scene_change = _to_float(sample.get("scene_change"), 0.0)
        if motion < 0.08 and scene_change < 0.5:
            streak += 1
            cursor -= 1
            continue
        break
    return min(streak / 10.0, 1.0)


def _derive_pacing_consistency(frames: list[dict[str, Any]], index: int) -> float:
    raw = frames[index].get("pacing_consistency")
    if raw is None:
        raw = frames[index].get("pacing_score")
    if raw is not None:
        return _to_float(raw)

    current_motion = _pick_value(frames[index], ["motion", "motion_score"], 0.0)
    if index == 0:
        return 0.6

    previous_motion = _pick_value(frames[index - 1], ["motion", "motion_score"], 0.0)
    curr_scaled = current_motion * 100.0 if current_motion <= 1.0 else current_motion
    prev_scaled = previous_motion * 100.0 if previous_motion <= 1.0 else previous_motion
    delta = abs(curr_scaled - prev_scaled)

    ideal_delta = 18.0
    consistency = 100.0 - (abs(delta - ideal_delta) * 2.0)
    return _clamp(consistency) / 100.0


def _to_frame_features(frames: list[dict[str, Any]]) -> list[FrameFeatures]:
    parsed: list[FrameFeatures] = []
    for index, frame in enumerate(frames):
        timestamp = _to_float(frame.get("timestamp", frame.get("time_sec", index)))
        human_count = _pick_value(frame, ["human_count"], 0.0)
        face_presence = _pick_value(frame, ["face_presence"], -1.0)
        if face_presence < 0:
            face_presence = _clamp(human_count / 3.0, 0.0, 1.0)

        parsed.append(
            FrameFeatures(
                timestamp=timestamp,
                motion=_pick_value(frame, ["motion", "motion_score"], 0.0),
                brightness=_pick_value(frame, ["brightness", "brightness_score"], 0.0),
                face_presence=face_presence,
                scene_change=_pick_value(frame, ["scene_change"], 0.0),
                repetition=_derive_repetition(frames, index),
                pacing_consistency=_derive_pacing_consistency(frames, index),
            )
        )
    return parsed


def compute_attention_timeline(frames: list[dict[str, Any]]) -> list[ScoredFrame]:
    parsed_frames = _to_frame_features(frames)
    return [_score_frame(frame) for frame in parsed_frames]


def detect_attention_drops(
    timeline: list[ScoredFrame],
    drop_threshold: float = 40.0,
    delta_threshold: float = 18.0,
) -> list[dict[str, Any]]:
    drops: list[dict[str, Any]] = []
    active_segment: list[ScoredFrame] = []

    def close_active_segment() -> None:
        nonlocal active_segment
        if not active_segment:
            return

        segment_scores = [frame.score for frame in active_segment]
        start_time = active_segment[0].timestamp
        end_time = active_segment[-1].timestamp
        duration = round(max(0.0, end_time - start_time), 3)
        min_score = round(min(segment_scores), 2)
        avg_score = round(mean(segment_scores), 2)

        avg_motion = mean(item.details["motion"] for item in active_segment)
        avg_brightness = mean(item.details["brightness"] for item in active_segment)
        avg_face = mean(item.details["face_presence"] for item in active_segment)
        avg_scene = mean(item.details["scene_change"] for item in active_segment)
        avg_pacing = mean(item.details["pacing_consistency"] for item in active_segment)
        avg_repetition = mean(item.details["repetition_penalty"] for item in active_segment)

        root_causes: list[str] = []
        if avg_motion < 35:
            root_causes.append("limited_visual_dynamics")
        if avg_brightness < 40:
            root_causes.append("underexposed_visuals")
        if avg_brightness > 88:
            root_causes.append("overexposed_visuals")
        if avg_face < 30:
            root_causes.append("no_clear_focal_subject")
        if avg_scene < 45:
            root_causes.append("weak_scene_progression")
        if avg_pacing < 40:
            root_causes.append("pacing_instability")
        if avg_repetition > 55:
            root_causes.append("repetitive_structure")
        if avg_brightness < 35 and avg_motion < 30:
            root_causes.append("low_visual_clarity")
        if not root_causes:
            root_causes.append("mixed_quality_decline")

        if min_score < 20 or avg_score < 30 or duration > 2.5:
            severity = "critical"
        elif min_score < 45 or duration > 1.0:
            severity = "medium"
        else:
            severity = "low"

        drops.append(
            {
                "start_time": round(start_time, 3),
                "end_time": round(end_time, 3),
                "duration_sec": duration,
                "min_score": min_score,
                "avg_score": avg_score,
                "severity": severity,
                "root_causes": root_causes,
            }
        )
        active_segment = []

    for index, frame in enumerate(timeline):
        below_threshold = frame.score < drop_threshold
        sharp_decline = False
        if index > 0:
            previous_score = timeline[index - 1].score
            sharp_decline = (previous_score - frame.score) >= delta_threshold

        if below_threshold or sharp_decline:
            active_segment.append(frame)
        else:
            close_active_segment()

    close_active_segment()
    return drops


def _segment_issue_messages(causes: set[str]) -> list[str]:
    issues: list[str] = []
    if "limited_visual_dynamics" in causes:
        issues.append("This segment has limited visual dynamics and weak motion cues.")
    if "underexposed_visuals" in causes:
        issues.append("Frames appear underexposed, reducing detail visibility and contrast.")
    if "overexposed_visuals" in causes:
        issues.append("Frames appear overexposed, causing highlight clipping and reduced detail.")
    if "no_clear_focal_subject" in causes:
        issues.append("The segment lacks a clear focal subject for viewer orientation.")
    if "weak_scene_progression" in causes:
        issues.append("Scene progression is weak, making the narrative feel static.")
    if "pacing_instability" in causes:
        issues.append("Pacing rhythm is inconsistent and disrupts structural flow.")
    if "repetitive_structure" in causes:
        issues.append("Visual structure is repetitive and offers limited variation.")
    if "low_visual_clarity" in causes:
        issues.append("Visual clarity is low due to dark and low-energy composition.")
    if "mixed_quality_decline" in causes:
        issues.append("Multiple quality factors combine to reduce segment effectiveness.")
    return issues


def generate_segment_suggestions(drop: dict[str, Any]) -> list[str]:
    causes = set(drop.get("root_causes", []))
    suggestions: list[str] = []

    if "limited_visual_dynamics" in causes:
        suggestions.append("Increase visual dynamics through purposeful camera movement, transition design, or B-roll inserts.")
    if "underexposed_visuals" in causes:
        suggestions.append("Improve exposure and contrast; apply color grading to recover clarity and tonal separation.")
    if "overexposed_visuals" in causes:
        suggestions.append("Lower highlights and rebalance white levels to prevent clipping and restore subject detail.")
    if "no_clear_focal_subject" in causes:
        suggestions.append("Strengthen subject focus using framing, close-ups, or presenter-led shots to anchor attention.")
    if "weak_scene_progression" in causes:
        suggestions.append("Restructure the segment with clearer scene progression and stronger editorial beats.")
    if "pacing_instability" in causes:
        suggestions.append("Normalize pacing cadence with consistent shot timing and smoother transition intervals.")
    if "repetitive_structure" in causes:
        suggestions.append("Trim repetitive content and replace low-value repeats with narrative-supportive visuals.")
    if "low_visual_clarity" in causes:
        suggestions.append("Improve lighting, sharpness, and composition to meet baseline visual clarity standards.")
    if "mixed_quality_decline" in causes:
        suggestions.append("Apply a full segment polish pass: pacing, grading, composition, and transition refinement.")

    if not suggestions:
        suggestions.append("Test alternate edits for this segment and compare attention timeline changes.")
    return suggestions


def generate_video_level_suggestions(drops: list[dict[str, Any]], overall_score: float) -> list[str]:
    suggestions: list[str] = []
    if drops and drops[0]["start_time"] <= 3.0:
        suggestions.append("🔴 CRITICAL: Add a stronger opening hook in the first 3 seconds.")

    if any("repetitive_structure" in item.get("root_causes", []) for item in drops):
        suggestions.append("🟡 MEDIUM: Reduce repetitive structure using tighter editorial trimming.")

    if any("underexposed_visuals" in item.get("root_causes", []) for item in drops):
        suggestions.append("🟡 MEDIUM: Improve lighting consistency and color grading across underexposed segments.")

    if any("overexposed_visuals" in item.get("root_causes", []) for item in drops):
        suggestions.append("🟡 MEDIUM: Correct overexposed highlights to preserve visual detail and brand-safe readability.")

    if any("no_clear_focal_subject" in item.get("root_causes", []) for item in drops):
        suggestions.append("🟡 MEDIUM: Add clear focal subject framing near key narrative beats.")

    if any("pacing_instability" in item.get("root_causes", []) for item in drops):
        suggestions.append("🟡 MEDIUM: Normalize pacing rhythm to improve structural consistency.")

    suggestions.append("🟢 COMPLIANCE: Verify dark/unclear segments and ambiguous visuals against brand-safety standards.")

    if overall_score >= 75:
        suggestions.append("🟢 TIP: Strong engagement baseline—preserve this editing pattern.")
    elif overall_score < 45:
        suggestions.append("🔴 CRITICAL: Re-edit structure to improve pacing and visual variety.")

    if not suggestions:
        suggestions.append("🟢 TIP: Engagement is stable; continue testing small creative variations.")
    return suggestions


def _adaptive_thresholds(
    timeline: list[ScoredFrame], base_drop_threshold: float, base_delta_threshold: float
) -> tuple[float, float]:
    scores = [item.score for item in timeline]
    if not scores:
        return base_drop_threshold, base_delta_threshold

    sigma = pstdev(scores) if len(scores) > 1 else 0.0
    dynamic_drop = _clamp(mean(scores) - (0.35 * sigma), 28.0, 52.0)
    dynamic_delta = _clamp(base_delta_threshold + (sigma * 0.15), 12.0, 30.0)
    return round(dynamic_drop, 2), round(dynamic_delta, 2)


def _best_worst_segments(timeline: list[ScoredFrame]) -> dict[str, Any]:
    if not timeline:
        return {
            "best_segment": None,
            "worst_segment": None,
        }

    window_size = max(2, len(timeline) // 6)
    best: dict[str, Any] | None = None
    worst: dict[str, Any] | None = None

    for start in range(0, len(timeline) - window_size + 1):
        window = timeline[start : start + window_size]
        avg_score = round(mean(item.score for item in window), 2)
        segment = {
            "start_time": window[0].timestamp,
            "end_time": window[-1].timestamp,
            "avg_score": avg_score,
            "severity": _score_to_severity(avg_score),
        }

        if best is None or segment["avg_score"] > best["avg_score"]:
            best = segment
        if worst is None or segment["avg_score"] < worst["avg_score"]:
            worst = segment

    return {
        "best_segment": best,
        "worst_segment": worst,
    }


def _segment_compliance_checks(drop: dict[str, Any]) -> list[dict[str, str]]:
    checks: list[dict[str, str]] = []
    causes = set(drop.get("root_causes", []))

    if "underexposed_visuals" in causes or "low_visual_clarity" in causes:
        checks.append(
            {
                "category": "visual_clarity",
                "level": "warning",
                "message": "Segment may violate baseline clarity expectations for safe and understandable content.",
            }
        )
    if "no_clear_focal_subject" in causes:
        checks.append(
            {
                "category": "content_readability",
                "level": "info",
                "message": "Primary subject is ambiguous; review for communication clarity and brand context.",
            }
        )
    if "overexposed_visuals" in causes:
        checks.append(
            {
                "category": "visual_quality",
                "level": "warning",
                "message": "Overexposure may reduce important detail visibility; validate quality controls.",
            }
        )

    if not checks:
        checks.append(
            {
                "category": "brand_safety",
                "level": "pass",
                "message": "No immediate compliance-style visual risks detected by rule-based checks.",
            }
        )
    return checks


def analyze_processed_video(
    payload: dict[str, Any],
    drop_threshold: float = 40.0,
    delta_threshold: float = 18.0,
) -> dict[str, Any]:
    frames = payload.get("frames", [])
    if not isinstance(frames, list) or len(frames) == 0:
        raise ValueError("payload.frames must be a non-empty list of frame-level features")

    timeline = compute_attention_timeline(frames)
    adaptive_drop_threshold, adaptive_delta_threshold = _adaptive_thresholds(
        timeline,
        base_drop_threshold=drop_threshold,
        base_delta_threshold=delta_threshold,
    )

    drops = detect_attention_drops(
        timeline=timeline,
        drop_threshold=adaptive_drop_threshold,
        delta_threshold=adaptive_delta_threshold,
    )

    timeline_scores = [round(item.score) for item in timeline]
    overall_score = round(mean([item.score for item in timeline]), 2)

    enriched_drops: list[dict[str, Any]] = []
    for drop in drops:
        enriched = dict(drop)
        causes = drop.get("root_causes", [])
        fixes = generate_segment_suggestions(drop)
        enriched["issues"] = _segment_issue_messages(set(causes))
        enriched["causes"] = [CAUSE_LABELS.get(code, code) for code in causes]
        enriched["cause_codes"] = causes
        enriched["fixes"] = fixes
        enriched["compliance_checks"] = _segment_compliance_checks(drop)
        enriched["suggestions"] = fixes
        enriched_drops.append(enriched)

    video_suggestions = generate_video_level_suggestions(drops, overall_score)
    segment_summary = _best_worst_segments(timeline)

    metadata = payload.get("metadata", {}) if isinstance(payload.get("metadata", {}), dict) else {}

    return {
        "video_name": payload.get("video_name", "unknown_video"),
        "analysis_scope": "video_quality_engagement_compliance",
        "metadata": {
            "duration": metadata.get("duration"),
            "fps": metadata.get("fps"),
            "frames_analyzed": len(frames),
        },
        "attention_timeline": timeline_scores,
        "attention_timeline_detailed": [
            {
                "timestamp": item.timestamp,
                "score": item.score,
                "severity": item.severity,
                "feature_contributions": item.details,
            }
            for item in timeline
        ],
        "attention_drops": enriched_drops,
        "total_drops": len(enriched_drops),
        "overall_score": overall_score,
        "key_insights": {
            "worst_segment": segment_summary["worst_segment"],
            "best_segment": segment_summary["best_segment"],
            "adaptive_thresholds": {
                "drop_threshold": adaptive_drop_threshold,
                "delta_threshold": adaptive_delta_threshold,
            },
        },
        "compliance_summary": {
            "status": "review_recommended" if enriched_drops else "pass",
            "note": "Rule-based compliance checks focus on visual clarity, readability, and brand-safety cues.",
        },
        "suggestions": video_suggestions,
    }
