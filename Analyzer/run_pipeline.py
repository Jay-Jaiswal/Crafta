from __future__ import annotations

import argparse
import json
from pathlib import Path

from intelligence import analyze_processed_video


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Run attention intelligence pipeline on processed frame-level JSON features."
    )
    parser.add_argument("--input", required=True, help="Path to input JSON with processed frame features")
    parser.add_argument("--output", required=True, help="Path to output JSON file")
    parser.add_argument("--drop-threshold", type=float, default=40.0, help="Score threshold for drops")
    parser.add_argument(
        "--delta-threshold",
        type=float,
        default=18.0,
        help="Sharp decline threshold between consecutive frames",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    input_path = Path(args.input)
    output_path = Path(args.output)

    payload = json.loads(input_path.read_text(encoding="utf-8"))
    result = analyze_processed_video(
        payload=payload,
        drop_threshold=args.drop_threshold,
        delta_threshold=args.delta_threshold,
    )

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(result, indent=2), encoding="utf-8")
    print(f"Analysis complete. Output written to {output_path}")


if __name__ == "__main__":
    main()
