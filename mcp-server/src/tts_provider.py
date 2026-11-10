"""Dual TTS engine: Kokoro-82M ONNX (local), ElevenLabs (cloud), or a synthetic demo voice.

Select with TTS_PROVIDER=edge|kokoro|elevenlabs|synthetic_demo (default edge: free Microsoft neural voices, no key).
synthetic_demo is a non-speech placeholder tone for offline tests only.
"""
from __future__ import annotations

import os
from pathlib import Path

import httpx
import numpy as np
import soundfile as sf

SR = 24000


def _synthetic_voice(text: str, voice_id: str, out: Path) -> Path:
    """Formant-filtered pulse train sized to ~150 wpm. Deterministic, dependency-free."""
    words = max(1, len(text.split()))
    seconds = max(0.8, words / 2.5)
    t = np.arange(int(seconds * SR)) / SR
    f0 = 110.0 if voice_id.startswith("am") else 190.0
    phase = np.cumsum(f0 * (1 + 0.08 * np.sin(2 * np.pi * 0.7 * t)) / SR)
    pulse = (phase % 1 < 0.08).astype(np.float32)
    syll = 4.6
    env = np.clip(np.sin(np.pi * ((t * syll) % 1)), 0, 1) ** 0.6
    from scipy.signal import lfilter  # local import keeps module import cheap

    y = np.zeros_like(t)
    for fc, bw, g in ((650, 90, 0.012), (1600, 120, 0.008)):
        r = np.exp(-2 * np.pi * bw / SR)
        y += lfilter([1.0], [1, -2 * r * np.cos(2 * np.pi * fc / SR), r * r], pulse) * g
    y = y * env * np.minimum(1, np.minimum(t * 20, (seconds - t) * 20))
    sf.write(out, y.astype(np.float32), SR)
    return out


def _kokoro(text: str, voice_id: str, out: Path) -> Path:
    from kokoro_onnx import Kokoro  # optional dependency

    model = os.environ.get("KOKORO_MODEL", "kokoro-v1.0.onnx")
    voices = os.environ.get("KOKORO_VOICES", "voices-v1.0.bin")
    samples, sr = Kokoro(model, voices).create(text, voice=voice_id or "af_bella", speed=1.0, lang="en-us")
    sf.write(out, samples, sr)
    return out


def _elevenlabs(text: str, voice_id: str, out: Path) -> Path:
    key = os.environ.get("ELEVENLABS_API_KEY")
    if not key:
        raise RuntimeError("ELEVENLABS_API_KEY is not set")
    r = httpx.post(
        f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}?output_format=mp3_44100_128",
        headers={"xi-api-key": key, "Content-Type": "application/json"},
        json={"text": text, "model_id": "eleven_multilingual_v2"},
        timeout=60,
    )
    r.raise_for_status()
    mp3 = out.with_suffix(".mp3")
    mp3.write_bytes(r.content)
    return mp3


EDGE_VOICES = {"am": "en-US-GuyNeural", "af": "en-US-AriaNeural", "bm": "en-GB-RyanNeural", "bf": "en-GB-SoniaNeural"}


def _edge(text: str, voice_id: str, out: Path) -> Path:
    import threading
    import asyncio
    import edge_tts

    voice = voice_id if "Neural" in voice_id else EDGE_VOICES.get(voice_id[:2], "en-US-GuyNeural")
    mp3 = out.with_suffix(".mp3")
    err: list[BaseException] = []

    def run() -> None:
        try:
            asyncio.run(edge_tts.Communicate(text, voice).save(str(mp3)))
        except BaseException as e:  # noqa: BLE001
            err.append(e)

    t = threading.Thread(target=run)
    t.start()
    t.join()
    if err:
        raise RuntimeError(f"edge-tts failed (needs internet): {err[0]}")
    return mp3


def synthesize(text: str, voice_id: str, out: Path, emotion: str = "neutral") -> Path:
    out.parent.mkdir(parents=True, exist_ok=True)
    provider = os.environ.get("TTS_PROVIDER", "edge").lower()
    if provider == "kokoro":
        return _kokoro(text, voice_id, out)
    if provider == "elevenlabs":
        return _elevenlabs(text, voice_id, out)
    if provider == "synthetic_demo":
        return _synthetic_voice(text, voice_id, out)
    return _edge(text, voice_id, out)
