"""Multi-provider TTS: Edge (cloud), Kokoro-82M ONNX (local), or ElevenLabs (cloud).

Select with TTS_PROVIDER=edge|kokoro|elevenlabs|synthetic_demo (default edge: free Microsoft neural voices, no key).
synthetic_demo is a non-speech placeholder tone for offline tests only.
"""
from __future__ import annotations

import os
from functools import lru_cache
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


_DIRECTION_GROUPS = [
    (("neutral", "focused"), {"rate": "+0%", "pitch": "+0Hz", "speed": 1.00, "stability": 0.60, "style": 0.10}),
    (("excited", "cheerful", "hopeful"), {"rate": "+5%", "pitch": "+2Hz", "speed": 1.05, "stability": 0.35, "style": 0.35}),
    (("curious", "relieved"), {"rate": "+2%", "pitch": "+1Hz", "speed": 1.02, "stability": 0.35, "style": 0.35}),
    (("exasperated",), {"rate": "+3%", "pitch": "-1Hz", "speed": 1.03, "stability": 0.35, "style": 0.35}),
    (("hesitant", "resigned", "grim"), {"rate": "-4%", "pitch": "-2Hz", "speed": 0.96, "stability": 0.60, "style": 0.10}),
    (("skeptical", "sarcastic", "cynical"), {"rate": "-2%", "pitch": "-1Hz", "speed": 0.98, "stability": 0.60, "style": 0.10}),
    (("deadpan", "dry", "smug"), {"rate": "-3%", "pitch": "-2Hz", "speed": 0.97, "stability": 0.60, "style": 0.10}),
]
_DIRECTIONS = {emotion: direction for emotions, direction in _DIRECTION_GROUPS for emotion in emotions}


def direction_for(emotion: str) -> dict[str, str | float]:
    """Return modest synthesis settings; unknown emotions stay neutral."""
    return dict(_DIRECTIONS.get(emotion.strip().lower(), _DIRECTIONS["neutral"]))


EDGE_VOICES = {
    "am": "en-US-AndrewMultilingualNeural",
    "af": "en-US-AvaMultilingualNeural",
    "bm": "en-US-BrianMultilingualNeural",
    "bf": "en-US-EmmaMultilingualNeural",
}


def resolve_voice(voice_id: str, provider: str) -> str:
    """Resolve abstract host IDs for a provider, preserving local Kokoro IDs."""
    provider = provider.lower()
    if provider == "kokoro":
        return voice_id
    if voice_id == "am_michael" and (override := os.environ.get("TTS_VOICE_ALEX")):
        return override
    if voice_id == "af_bella" and (override := os.environ.get("TTS_VOICE_SAM")):
        return override
    if provider == "edge":
        return voice_id if "Neural" in voice_id else EDGE_VOICES.get(voice_id[:2], "en-US-GuyNeural")
    return voice_id


@lru_cache(maxsize=2)
def _get_kokoro(model: str, voices: str):
    from kokoro_onnx import Kokoro  # optional dependency

    return Kokoro(model, voices)


def _kokoro(text: str, voice_id: str, out: Path, emotion: str = "neutral") -> Path:
    model = os.environ.get("KOKORO_MODEL", "kokoro-v1.0.onnx")
    voices = os.environ.get("KOKORO_VOICES", "voices-v1.0.bin")
    direction = direction_for(emotion)
    samples, sr = _get_kokoro(model, voices).create(
        text,
        voice=resolve_voice(voice_id or "af_bella", "kokoro"),
        speed=direction["speed"],
        lang="en-us",
    )
    sf.write(out, samples, sr)
    return out


def _elevenlabs(text: str, voice_id: str, out: Path, emotion: str = "neutral") -> Path:
    key = os.environ.get("ELEVENLABS_API_KEY")
    if not key:
        raise RuntimeError("ELEVENLABS_API_KEY is not set")
    direction = direction_for(emotion)
    r = httpx.post(
        f"https://api.elevenlabs.io/v1/text-to-speech/{resolve_voice(voice_id, 'elevenlabs')}?output_format=mp3_44100_128",
        headers={"xi-api-key": key, "Content-Type": "application/json"},
        json={
            "text": text,
            "model_id": "eleven_multilingual_v2",
            "voice_settings": {"stability": direction["stability"], "style": direction["style"]},
        },
        timeout=60,
    )
    r.raise_for_status()
    mp3 = out.with_suffix(".mp3")
    mp3.write_bytes(r.content)
    return mp3


def _edge(text: str, voice_id: str, out: Path, emotion: str = "neutral") -> Path:
    import threading
    import asyncio
    import edge_tts

    direction = direction_for(emotion)
    voice = resolve_voice(voice_id, "edge")
    mp3 = out.with_suffix(".mp3")
    err: list[BaseException] = []

    def run() -> None:
        try:
            communicate = edge_tts.Communicate(
                text,
                voice,
                rate=direction["rate"],
                pitch=direction["pitch"],
            )
            asyncio.run(communicate.save(str(mp3)))
        except BaseException as e:  # noqa: BLE001
            err.append(e)

    import time as _time
    for attempt in range(3):  # retry transient Edge throttling / dropped sockets
        err.clear()
        t = threading.Thread(target=run)
        t.start()
        t.join()
        if not err:
            break
        _time.sleep(0.8 * (attempt + 1))
    if err:
        raise RuntimeError(f"edge-tts failed (needs internet): {err[0]}")
    return mp3


def synthesize(text: str, voice_id: str, out: Path, emotion: str = "neutral") -> Path:
    out.parent.mkdir(parents=True, exist_ok=True)
    provider = os.environ.get("TTS_PROVIDER", "edge").lower()
    if provider == "kokoro":
        try:
            return _kokoro(text, voice_id, out, emotion)
        except Exception:  # noqa: BLE001 - missing model/runtime: fall back to cloud voices
            if os.environ.get("KOKORO_FALLBACK", "edge").lower() != "edge":
                raise
            return _edge(text, voice_id, out, emotion)
    if provider == "elevenlabs":
        return _elevenlabs(text, voice_id, out, emotion)
    if provider == "synthetic_demo":
        return _synthetic_voice(text, voice_id, out)
    return _edge(text, voice_id, out, emotion)
