import pytest

from src import tts_provider


@pytest.fixture(autouse=True)
def isolate_tts(monkeypatch, request):
    monkeypatch.setenv("TTS_PROVIDER", "synthetic_demo")
    if request.node.get_closest_marker("provider_boundary"):
        return

    def block_network_tts(*_args, **_kwargs):
        raise AssertionError("Network TTS disabled during tests")

    monkeypatch.setattr(tts_provider, "_edge", block_network_tts)
    monkeypatch.setattr(tts_provider, "_elevenlabs", block_network_tts)
