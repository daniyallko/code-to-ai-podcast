"""Deterministic FFmpeg filter_complex builder + ffprobe / loudnorm telemetry."""
from __future__ import annotations

import json
import re
import shutil
import subprocess
import time
from pathlib import Path

import soundfile as sf

from .models import AudioMetrics, TimelineManifest


def has_ffmpeg() -> bool:
    return shutil.which("ffmpeg") is not None and shutil.which("ffprobe") is not None


def probe_duration_ms(path: Path) -> int:
    if shutil.which("ffprobe"):
        out = subprocess.run(
            ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)],
            capture_output=True, text=True, check=True,
        ).stdout.strip()
        return int(round(float(out) * 1000))
    return int(round(sf.info(path).duration * 1000))


def pan_expr(pan: float) -> str:
    """Map pan [-1,1] to a mono->stereo matrix. -0.6 -> 0.8/0.2 (left), +0.6 -> 0.2/0.8 (right)."""
    left = round(0.5 - pan / 2 * (0.6 / 0.6) * 0.5, 2) if pan else 0.5
    left = 0.8 if pan <= -0.6 else 0.2 if pan >= 0.6 else left
    return f"pan=stereo|c0={left}*c0|c1={round(1 - left, 2)}*c0"


def build_filter_complex(m: TimelineManifest, ducking_ratio: float = 6.0, normalize_lufs: float = -16.0) -> tuple[str, int]:
    """Returns (filter_complex, bgm_input_index). Input order: stems, sfx cues, bgm."""
    parts: list[str] = []
    labels: list[str] = []
    for i, st in enumerate(m.stems):
        parts.append(f"[{i}:a]aformat=channel_layouts=mono,adelay={st.start_ms}|{st.start_ms},{pan_expr(st.pan)}[d{i}]")
        labels.append(f"[d{i}]")
    base = len(m.stems)
    for j, cue in enumerate(m.sfx_cues):
        parts.append(f"[{base + j}:a]adelay={cue.timestamp_ms}|{cue.timestamp_ms},volume={cue.gain_db}dB[s{j}]")
        labels.append(f"[s{j}]")
    bgm_idx = base + len(m.sfx_cues)
    parts.append(f"{''.join(labels)}amix=inputs={len(labels)}:normalize=0[voice_bus]")
    parts.append("[voice_bus]asplit=2[vb_key][vb_mix]")
    parts.append(f"[{bgm_idx}:a]volume=-8dB,atrim=0:{m.total_duration_ms / 1000:.3f}[bgm]")
    parts.append(f"[bgm][vb_key]sidechaincompress=threshold=0.03:ratio={ducking_ratio}:attack=50:release=600[bgm_ducked]")
    parts.append(f"[vb_mix][bgm_ducked]amix=inputs=2:normalize=0,loudnorm=I={normalize_lufs}:TP=-1.5:LRA=11[master]")
    return ";".join(parts), bgm_idx


def build_command(m: TimelineManifest, assets: Path, out: Path, ducking_ratio: float, normalize_lufs: float) -> list[str]:
    fc, _ = build_filter_complex(m, ducking_ratio, normalize_lufs)
    cmd = ["ffmpeg", "-y", "-hide_banner"]
    for st in m.stems:
        cmd += ["-i", st.file_path]
    for cue in m.sfx_cues:
        cmd += ["-i", str(assets / f"{cue.sfx_id}.wav")]
    cmd += ["-stream_loop", "-1", "-i", str(assets / f"{m.bgm_track_id}.wav")]
    cmd += ["-filter_complex", fc, "-map", "[master]", "-ar", "44100", "-c:a", "libmp3lame", "-b:a", "192k", str(out)]
    return cmd


def measure_loudness(path: Path) -> dict:
    proc = subprocess.run(
        ["ffmpeg", "-hide_banner", "-i", str(path), "-af", "loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json", "-f", "null", "-"],
        capture_output=True, text=True,
    )
    match = re.search(r"\{[^{}]*\"input_i\"[^{}]*\}", proc.stderr, re.S)
    return json.loads(match.group(0)) if match else {}


def render(m: TimelineManifest, assets: Path, out_dir: Path, ducking_ratio: float = 6.0, normalize_lufs: float = -16.0) -> tuple[Path, AudioMetrics, str]:
    if not m.stems:
        raise ValueError("Session has no dialogue stems to render")
    out_dir.mkdir(parents=True, exist_ok=True)
    out = out_dir / "master.mp3"
    fc, _ = build_filter_complex(m, ducking_ratio, normalize_lufs)
    t0 = time.perf_counter()
    if not has_ffmpeg():
        raise RuntimeError("ffmpeg/ffprobe not found on PATH; install ffmpeg to render the master mix")
    subprocess.run(build_command(m, assets, out, ducking_ratio, normalize_lufs), check=True, capture_output=True)
    elapsed = int((time.perf_counter() - t0) * 1000)
    ln = measure_loudness(out)
    metrics = AudioMetrics(
        integrated_lufs=float(ln.get("input_i", normalize_lufs)),
        true_peak_dbtp=float(ln.get("input_tp", -1.5)),
        loudness_range_lu=float(ln.get("input_lra", 0.0)),
        render_time_ms=elapsed,
    )
    return out, metrics, fc
