"""Generate two synthetic videos for quick accuracy testing.

Outputs:
- backend/test_videos/good_test.mp4
- backend/test_videos/bad_test.mp4

The good video has strong motion/variation and frequent scene changes.
The bad video is mostly static, dim, and repetitive.
"""

from __future__ import annotations

from pathlib import Path

import cv2
import numpy as np


FPS = 24
DURATION_SEC = 12
FRAME_COUNT = FPS * DURATION_SEC
SIZE = (640, 360)


def _writer(path: Path) -> cv2.VideoWriter:
    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    return cv2.VideoWriter(str(path), fourcc, FPS, SIZE)


def _draw_face(frame: np.ndarray, center: tuple[int, int], scale: float = 1.0) -> None:
    x, y = center
    r = int(26 * scale)
    cv2.circle(frame, (x, y), r, (230, 220, 200), -1)
    cv2.circle(frame, (x - int(8 * scale), y - int(6 * scale)), int(3 * scale), (20, 20, 20), -1)
    cv2.circle(frame, (x + int(8 * scale), y - int(6 * scale)), int(3 * scale), (20, 20, 20), -1)
    cv2.ellipse(frame, (x, y + int(6 * scale)), (int(10 * scale), int(6 * scale)), 0, 10, 170, (30, 30, 30), 2)


def generate_good_video(out_path: Path) -> None:
    w, h = SIZE
    writer = _writer(out_path)

    for i in range(FRAME_COUNT):
        t = i / FPS
        hue = (i * 4) % 180
        hsv = np.full((h, w, 3), (hue, 130, 190), dtype=np.uint8)
        frame = cv2.cvtColor(hsv, cv2.COLOR_HSV2BGR)

        # Moving subject and changing geometry for strong temporal variation.
        x = int(70 + (w - 140) * ((np.sin(t * 1.4) + 1) / 2))
        y = int(h * (0.35 + 0.2 * np.cos(t * 1.1)))
        cv2.rectangle(frame, (x - 45, y - 30), (x + 45, y + 30), (20, 180, 255), -1)
        _draw_face(frame, (x, y - 45), 0.9)

        if i % 18 < 9:
            cv2.line(frame, (0, int(h * 0.8)), (w, int(h * 0.2)), (255, 255, 255), 3)
        else:
            cv2.circle(frame, (int(w * 0.8), int(h * 0.75)), 40, (255, 120, 40), -1)

        cv2.putText(frame, "GOOD HOOK", (20, 45), cv2.FONT_HERSHEY_SIMPLEX, 1.0, (10, 10, 10), 3, cv2.LINE_AA)
        cv2.putText(frame, f"Scene {1 + (i // 48)}", (20, h - 24), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (245, 245, 245), 2, cv2.LINE_AA)

        writer.write(frame)

    writer.release()


def generate_bad_video(out_path: Path) -> None:
    w, h = SIZE
    writer = _writer(out_path)

    base = np.full((h, w, 3), (28, 28, 35), dtype=np.uint8)
    cv2.putText(base, "BAD STATIC", (18, 40), cv2.FONT_HERSHEY_SIMPLEX, 0.95, (70, 70, 80), 2, cv2.LINE_AA)

    for i in range(FRAME_COUNT):
        frame = base.copy()

        # Minimal movement and low contrast to mimic weak engagement content.
        shift = 1 if (i % 30 == 0) else 0
        cv2.rectangle(frame, (190 + shift, 140), (450 + shift, 230), (45, 45, 50), -1)
        cv2.putText(frame, "same shot", (240, 195), cv2.FONT_HERSHEY_SIMPLEX, 0.75, (85, 85, 95), 2, cv2.LINE_AA)

        if i % 120 == 0:
            cv2.circle(frame, (95, 300), 12, (65, 65, 75), -1)

        writer.write(frame)

    writer.release()


def main() -> None:
    backend_root = Path(__file__).resolve().parents[1]
    out_dir = backend_root / "test_videos"
    out_dir.mkdir(parents=True, exist_ok=True)

    good_path = out_dir / "good_test.mp4"
    bad_path = out_dir / "bad_test.mp4"

    generate_good_video(good_path)
    generate_bad_video(bad_path)

    print(f"Generated: {good_path}")
    print(f"Generated: {bad_path}")


if __name__ == "__main__":
    main()
