import json


def test_generate_demo_dialogue_writes_clips_and_provenance(tmp_path, monkeypatch):
    from scripts import generate_demo_dialogue as generator

    calls = []

    def fake_synthesize(text, voice_id, out, emotion="neutral"):
        calls.append((text, voice_id, emotion))
        clip = out.with_suffix(".mp3")
        clip.write_bytes(b"real-provider-bytes")
        return clip

    monkeypatch.setenv("TTS_PROVIDER", "edge")
    monkeypatch.setattr(generator, "synthesize", fake_synthesize)
    monkeypatch.setattr(generator, "probe_duration_ms", lambda path: 1234)
    dialogue = {
        "pr-402": [{
            "speaker": "Alex (Staff SRE)",
            "text": "On one pod?",
            "spoken_text": "On one pod?",
            "emotion": "deadpan",
            "overlap_ms": -300,
        }],
    }

    rows = generator.generate(dialogue, tmp_path)

    assert calls == [("On one pod?", "am_michael", "deadpan")]
    assert rows == [{
        "key": "pr-402-stem_01",
        "spoken_text": "On one pod?",
        "provider": "edge",
        "provider_voice_id": "en-GB-RyanNeural",
        "duration_ms": 1234,
    }]
    clip = tmp_path / "pr-402-stem_01.mp3"
    assert clip.read_bytes() == b"real-provider-bytes"
    assert json.loads((tmp_path / "manifest.json").read_text()) == rows


def test_probe_duration_ms_uses_ffprobe_container_duration(monkeypatch):
    from scripts import generate_demo_dialogue as generator

    class Result:
        stdout = "1.234500\n"

    calls = []

    def fake_run(command, **kwargs):
        calls.append((command, kwargs))
        return Result()

    monkeypatch.setattr(generator.subprocess, "run", fake_run)

    assert generator.probe_duration_ms("clip.mp3") == 1235
    command, kwargs = calls[0]
    assert command[:2] == ["ffprobe", "-v"]
    assert command[-1] == "clip.mp3"
    assert kwargs["check"] is True
