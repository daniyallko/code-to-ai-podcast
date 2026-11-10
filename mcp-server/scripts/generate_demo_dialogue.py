"""Generate measurable demo-speech candidates from the shared dialogue source."""
from __future__ import annotations

import argparse
import json
import math
import os
from pathlib import Path
import subprocess
import sys

from src.tts_provider import resolve_voice, synthesize


def probe_duration_ms(path: str | Path) -> int:
    result = subprocess.run(
        [
            "ffprobe", "-v", "error", "-show_entries", "format=duration",
            "-of", "csv=p=0", str(path),
        ],
        check=True,
        capture_output=True,
        text=True,
    )
    return math.floor(float(result.stdout.strip()) * 1000 + 0.5)


def generate(dialogue: dict[str, list[dict]], output_dir: Path) -> list[dict]:
    output_dir.mkdir(parents=True, exist_ok=True)
    provider = os.environ.get("TTS_PROVIDER", "edge").lower()
    rows = []
    for scenario, lines in dialogue.items():
        for index, line in enumerate(lines, start=1):
            key = f"{scenario}-stem_{index:02d}"
            voice_id = "am_michael" if line["speaker"].startswith("Alex") else "af_bella"
            clip = synthesize(
                line["spoken_text"],
                voice_id,
                output_dir / f"{key}.mp3",
                emotion=line["emotion"],
            )
            rows.append({
                "key": key,
                "spoken_text": line["spoken_text"],
                "provider": provider,
                "provider_voice_id": resolve_voice(voice_id, provider),
                "duration_ms": probe_duration_ms(clip),
            })
    (output_dir / "manifest.json").write_text(json.dumps(rows, indent=2) + "\n")
    return rows


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output-dir", type=Path, required=True)
    args = parser.parse_args()
    rows = generate(json.load(sys.stdin), args.output_dir)
    print(json.dumps(rows, indent=2))


if __name__ == "__main__":
    main()
