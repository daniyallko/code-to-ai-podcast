import os

import pytest

from src import tts_provider


def test_suite_forces_offline_tts():
    assert os.environ["TTS_PROVIDER"] == "synthetic_demo"


def test_network_provider_entry_points_are_stubbed(tmp_path):
    for name in ("_edge", "_elevenlabs"):
        with pytest.raises(AssertionError, match="Network TTS disabled during tests"):
            getattr(tts_provider, name)("hello", "af_bella", tmp_path / "speech.wav")
