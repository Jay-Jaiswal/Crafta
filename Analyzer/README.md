# Core Intelligence Layer (Analyzer)

This folder contains the rule-based intelligence pipeline that converts processed frame-level video features into video quality, structural effectiveness, and compliance-oriented insights.

## Input

Provide JSON with this structure:

```json
{
  "video_name": "youtube_short.mp4",
  "metadata": {
    "duration": 30,
    "fps": 30
  },
  "frames": [
    {
      "timestamp": 0.0,
      "motion": 0.12,
      "brightness": 145,
      "face_presence": 1,
      "scene_change": 0,
      "repetition": 0.1,
      "pacing_consistency": 0.7
    }
  ]
}
```

Notes:
- `motion`, `face_presence`, `scene_change`, and `repetition` support either `0..1` or `0..100` scales.
- `brightness` supports `0..255`, `0..1`, or `0..100`.
- `pacing_consistency` supports `0..1` or `0..100` and is optional.
- If `repetition` is missing, the pipeline derives it from low-motion/static streaks.
- If `pacing_consistency` is missing, the pipeline derives it from motion rhythm deltas.

## Output

The output JSON includes:
- `attention_timeline`
- `attention_timeline_detailed`
- `attention_drops`
- `key_insights` (best segment, worst segment, adaptive thresholds)
- `compliance_summary`
- `overall_score`
- per-drop `issues`, `causes`, `cause_codes`, `fixes`, `compliance_checks`
- segment-level and video-level `suggestions`

Severity levels are standardized as:
- `critical`
- `medium`
- `low`

Note:
- The analyzer does not track user behavior.
- It interprets intrinsic video signals (visual dynamics, exposure, focal subject clarity, scene progression, pacing, repetition) to identify quality and compliance risk cues.

## Run

From this folder:

```bash 
python run_pipeline.py --input sample_input.json --output output/analysis.json
```
