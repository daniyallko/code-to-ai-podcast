import sys
from types import SimpleNamespace

import numpy as np
import pytest
import soundfile as sf

from src import tts_provider

pytestmark = pytest.mark.provider_boundary


@pytest.fixture(autouse=True)
def clear_kokoro_cache():
    getter = getattr(tts_provider, "_get_kokoro", None)
    if getter is not None:
        getter.cache_clear()
    yield
    if getter is not None:
        getter.cache_clear()


class FakeEdgeCommunicate:
    calls = []

    def __init__(self, text, voice, rate="+0%", pitch="+0Hz"):
        self.text = text
        self.voice = voice
        self.rate = rate
        self.pitch = pitch
        self.calls.append(self)

    async def save(self, path):
        with open(path, "wb") as audio:
            audio.write(b"real edge bytes")


@pytest.fixture
def edge_boundary(monkeypatch):
    FakeEdgeCommunicate.calls = []
    monkeypatch.setitem(sys.modules, "edge_tts", SimpleNamespace(Communicate=FakeEdgeCommunicate))
    monkeypatch.setenv("TTS_PROVIDER", "edge")
    monkeypatch.delenv("TTS_VOICE_ALEX", raising=False)
    monkeypatch.delenv("TTS_VOICE_SAM", raising=False)
    return FakeEdgeCommunicate.calls


def test_edge_casts_hosts_and_applies_exact_direction(edge_boundary, tmp_path):
    tts_provider.synthesize("Alex", "am_michael", tmp_path / "alex.wav", emotion="excited")
    tts_provider.synthesize("Sam", "af_bella", tmp_path / "sam.wav", emotion="deadpan")

    assert [(call.voice, call.rate, call.pitch) for call in edge_boundary] == [
        ("en-US-AndrewMultilingualNeural", "+5%", "+2Hz"),
        ("en-US-AvaMultilingualNeural", "-3%", "-2Hz"),
    ]
    assert (tmp_path / "alex.mp3").read_bytes() == b"real edge bytes"


def test_edge_preserves_full_names_and_honors_host_overrides(edge_boundary, monkeypatch, tmp_path):
    tts_provider.synthesize("Custom", "en-US-CustomNeural", tmp_path / "custom.wav", emotion="misspelled")
    monkeypatch.setenv("TTS_VOICE_ALEX", "en-GB-OverrideNeural")
    monkeypatch.setenv("TTS_VOICE_SAM", "en-US-OverrideNeural")
    tts_provider.synthesize("Alex", "am_michael", tmp_path / "alex.wav")
    tts_provider.synthesize("Sam", "af_bella", tmp_path / "sam.wav")

    assert [(call.voice, call.rate, call.pitch) for call in edge_boundary] == [
        ("en-US-CustomNeural", "+0%", "+0Hz"),
        ("en-GB-OverrideNeural", "+0%", "+0Hz"),
        ("en-US-OverrideNeural", "+0%", "+0Hz"),
    ]


class FakeKokoro:
    instances = []

    def __init__(self, model, voices):
        self.model = model
        self.voices = voices
        self.calls = []
        self.instances.append(self)

    def create(self, text, voice, speed, lang):
        self.calls.append({"text": text, "voice": voice, "speed": speed, "lang": lang})
        return np.array([0.0, 0.25, -0.25, 0.0], dtype=np.float32), 24000


@pytest.fixture
def kokoro_boundary(monkeypatch):
    FakeKokoro.instances = []
    monkeypatch.setitem(sys.modules, "kokoro_onnx", SimpleNamespace(Kokoro=FakeKokoro))
    monkeypatch.setenv("TTS_PROVIDER", "kokoro")
    monkeypatch.setenv("KOKORO_MODEL", "test-model.onnx")
    monkeypatch.setenv("KOKORO_VOICES", "test-voices.bin")
    return FakeKokoro.instances


def test_kokoro_reuses_engine_and_applies_exact_speeds(kokoro_boundary, monkeypatch, tmp_path):
    monkeypatch.setenv("TTS_VOICE_ALEX", "must-not-replace-kokoro-id")
    for index, (voice, emotion) in enumerate([
        ("am_michael", "excited"),
        ("af_bella", "deadpan"),
        ("af_bella", "unknown"),
    ]):
        tts_provider.synthesize("text", voice, tmp_path / f"line-{index}.wav", emotion=emotion)

    assert len(kokoro_boundary) == 1
    assert [call["speed"] for call in kokoro_boundary[0].calls] == [1.05, 0.97, 1.0]
    assert kokoro_boundary[0].calls[0]["voice"] == "am_michael"
    samples, sample_rate = sf.read(tmp_path / "line-0.wav")
    assert sample_rate == 24000
    np.testing.assert_allclose(samples, [0.0, 0.25, -0.25, 0.0], atol=1e-6)


def test_elevenlabs_applies_expressive_and_neutral_settings(monkeypatch, tmp_path):
    monkeypatch.setenv("TTS_PROVIDER", "elevenlabs")
    monkeypatch.setenv("ELEVENLABS_API_KEY", "test-key")
    calls = []

    def fake_post(url, **kwargs):
        calls.append({"url": url, **kwargs})
        return SimpleNamespace(content=b"elevenlabs bytes", raise_for_status=lambda: None)

    monkeypatch.setattr(tts_provider.httpx, "post", fake_post)
    tts_provider.synthesize("excited", "voice-a", tmp_path / "excited.wav", emotion="excited")
    tts_provider.synthesize("neutral", "voice-b", tmp_path / "neutral.wav", emotion="unknown")

    assert calls[0]["json"] == {
        "text": "excited",
        "model_id": "eleven_multilingual_v2",
        "voice_settings": {"stability": 0.35, "style": 0.35},
    }
    assert calls[1]["json"]["voice_settings"] == {"stability": 0.60, "style": 0.10}
    assert (tmp_path / "excited.mp3").read_bytes() == b"elevenlabs bytes"
