"""Procedurally synthesize royalty-free SFX and BGM so the repo works after `git clone`."""
from __future__ import annotations

from pathlib import Path

import numpy as np
import soundfile as sf

SR = 44100
ASSETS_DIR = Path(__file__).resolve().parent.parent / "assets"

SFX_CATALOG: dict[str, dict[str, str]] = {
    "lofi_synth_bed": {"kind": "bgm", "description": "Warm 4-chord lofi loop with vinyl crackle (95 BPM)"},
    "keyboard_clack": {"kind": "sfx", "description": "Short mechanical switch burst"},
    "record_scratch": {"kind": "sfx", "description": "Frequency-swept noise burst for comedic beats"},
    "pager_alert": {"kind": "sfx", "description": "Classic SRE pager two-tone beep"},
    "transition_whoosh": {"kind": "sfx", "description": "Filtered white-noise sweep"},
}


def _t(seconds: float) -> np.ndarray:
    return np.arange(int(seconds * SR)) / SR


def _onepole(x: np.ndarray, k: np.ndarray | float) -> np.ndarray:
    y = np.zeros_like(x)
    k_arr = np.broadcast_to(k, x.shape)
    acc = 0.0
    for i in range(len(x)):
        acc += k_arr[i] * (x[i] - acc)
        y[i] = acc
    return y


def lofi_synth_bed(rng: np.random.Generator) -> np.ndarray:
    bar = 60 / 95 * 4
    chords = [[220, 261.6, 329.6, 392], [174.6, 220, 261.6, 329.6], [196, 246.9, 293.7, 349.2], [164.8, 207.7, 246.9, 329.6]]
    t = _t(bar * 4)
    out = np.zeros_like(t)
    for ci, chord in enumerate(chords):
        mask = (t >= ci * bar) & (t < (ci + 1) * bar)
        tb = t[mask] - ci * bar
        env = np.minimum(1, tb * 8) * np.exp(-tb * 0.6)
        for f in chord:
            out[mask] += (np.sin(2 * np.pi * f * t[mask]) + 0.3 * np.sin(4 * np.pi * f * t[mask])) * env * 0.03
    beat = t % (bar / 2)
    out += np.where(beat < 0.12, np.sin(2 * np.pi * 55 * t) * np.exp(-beat * 30) * 0.25, 0)
    crackle = np.where(rng.random(len(t)) > 0.9992, rng.uniform(-0.15, 0.15, len(t)), rng.normal(0, 0.002, len(t)))
    return np.stack([out + crackle, out * 0.95 + crackle], axis=1)


def keyboard_clack(rng: np.random.Generator) -> np.ndarray:
    t = _t(0.25)
    return rng.uniform(-1, 1, len(t)) * np.exp(-(t % 0.07) * 160) * 0.6


def record_scratch(rng: np.random.Generator) -> np.ndarray:
    t = _t(0.6)
    f = 300 + 1600 * np.abs(np.sin(2 * np.pi * 3 * t))
    return _onepole(rng.uniform(-1, 1, len(t)), np.clip(f / SR * 6, 0, 1)) * np.exp(-t * 2) * 0.9


def pager_alert(_: np.random.Generator) -> np.ndarray:
    t = _t(1.2)
    f = np.where((t // 0.15) % 2 == 1, 880.0, 1175.0)
    gate = (t % 0.15) < 0.13
    return np.sign(np.sin(2 * np.pi * f * t)) * 0.18 * gate


def transition_whoosh(rng: np.random.Generator) -> np.ndarray:
    t = _t(1.0)
    shape = np.sin(np.pi * t / 1.0)
    return _onepole(rng.uniform(-1, 1, len(t)), 0.01 + 0.25 * shape) * shape * 0.7


GENERATORS = {
    "lofi_synth_bed": lofi_synth_bed,
    "keyboard_clack": keyboard_clack,
    "record_scratch": record_scratch,
    "pager_alert": pager_alert,
    "transition_whoosh": transition_whoosh,
}


def ensure_assets(directory: Path = ASSETS_DIR) -> Path:
    directory.mkdir(parents=True, exist_ok=True)
    rng = np.random.default_rng(42)
    for name, gen in GENERATORS.items():
        path = directory / f"{name}.wav"
        if not path.exists():
            data = gen(rng).astype(np.float32)
            sf.write(path, np.clip(data, -1, 1), SR, subtype="PCM_16")
    return directory


def catalog(directory: Path = ASSETS_DIR) -> list[dict]:
    ensure_assets(directory)
    items = []
    for name, meta in SFX_CATALOG.items():
        info = sf.info(directory / f"{name}.wav")
        items.append({"id": name, **meta, "file": f"{name}.wav", "duration_ms": int(info.duration * 1000)})
    return items


if __name__ == "__main__":
    print(ensure_assets())
