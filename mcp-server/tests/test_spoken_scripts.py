from pathlib import Path

import pytest
from src import episodes, scriptwriter, server
from src.models import TimelineManifest

DIFF = "diff --git a/lock.py b/lock.py\n+_LOCKS = {}\n+def acquire():\n+    return _LOCKS\n"


def test_changed_symbols_are_extracted():
    assert scriptwriter.analyze(DIFF)["symbols"] == ["acquire"]


def test_explainer_names_acquire():
    assert any("acquire" in line.text for line in scriptwriter.write(DIFF, "explainer"))


def test_pronunciation_normalization():
    assert scriptwriter.to_spoken_text("Update _LOCKS in lock.py; watch p99") == "Update locks in lock dot py; watch p ninety nine"


@pytest.mark.parametrize("fmt", ["roast", "explainer", "postmortem"])
def test_unknown_blast_radius_is_not_invented(fmt):
    lines = scriptwriter.write("diff --git a/main.py b/main.py\n+value = 1\n", fmt)
    assert any("cannot establish" in line.text for line in lines)


@pytest.mark.parametrize("spoken", [None, "locks in lock dot py"])
def test_episode_preserves_caption_and_measured_placement(tmp_path, monkeypatch, spoken):
    calls = []
    monkeypatch.setattr(episodes.tts_provider, "synthesize", lambda text, voice, path, emotion: calls.append(text) or path)
    monkeypatch.setattr(episodes.dsp_engine, "probe_duration_ms", lambda path: 1234)
    first = scriptwriter.Line(scriptwriter.ALEX, "_LOCKS in lock.py", spoken_text=spoken)
    second = scriptwriter.Line(scriptwriter.SAM, "Okay.", overlap_ms=-200)
    manifest = TimelineManifest(session_id="test", title="test")
    episodes.build_session(manifest, [first, second], tmp_path)
    assert calls[0] == "locks in lock dot py"
    assert manifest.stems[0].text == "_LOCKS in lock.py"
    assert manifest.stems[0].spoken_text == "locks in lock dot py"
    assert manifest.stems[1].start_ms == 1034


@pytest.mark.parametrize("spoken", [None, "locks"])
def test_direct_append_preserves_caption_and_spoken_text(tmp_path, monkeypatch, spoken):
    calls = []
    monkeypatch.setattr(server.tts_provider, "synthesize", lambda text, voice, path, emotion: calls.append(text) or path)
    monkeypatch.setattr(server.dsp_engine, "probe_duration_ms", lambda path: 987)
    sid = server.create_session("test")["session_id"]
    try:
        result = server.append_dialogue_stem(sid, scriptwriter.ALEX, "am_michael", "_LOCKS", spoken_text=spoken)
        assert calls == [spoken or "_LOCKS"]
        assert result["text"] == "_LOCKS"
        assert result["spoken_text"] == (spoken or "_LOCKS")
        assert result["duration_ms"] == 987
    finally:
        server.SESSIONS.pop(sid, None)


def test_submit_script_uses_keyword_spoken_text(monkeypatch):
    captured = {}
    def fake_start(*args, **kwargs):
        captured.update(kwargs)
        return "test"
    monkeypatch.setattr(server.episodes, "start", fake_start)
    server.submit_script([{"speaker": scriptwriter.ALEX, "text": "_LOCKS", "spoken_text": "locks", "sfx": "pager_alert"}])
    line = captured["lines"][0]
    assert line.spoken_text == "locks"
    assert line.sfx == "pager_alert"

def test_spoken_text_drops_hashes_and_paths():
    s = scriptwriter.to_spoken_text("commit 3a9c7b12d4e5f6a7b8c9 in src/auth/oauth_handler_v2.py")
    assert "3a9c" not in s and "src" not in s and "oauth handler v2" in s


def test_clean_title_strips_prefix_and_number():
    assert scriptwriter.clean_title("fix(auth): refresh tokens (#402)") == "refresh tokens"


def test_roast_quotes_real_code_and_calls_smells():
    d = "diff --git a/app.js b/app.js\n+  console.log('user is', user)\n+  // TODO remove\n"
    text = " ".join(l.text for l in scriptwriter.write_rules(d, "roast", "x"))
    assert "console.log('user is', user)" in text and "TODO" in text


def test_groq_failure_falls_back(monkeypatch):
    monkeypatch.setenv("GROQ_API_KEY", "x")
    from src import llm_writer
    monkeypatch.setattr(llm_writer.httpx, "post", lambda *a, **k: (_ for _ in ()).throw(RuntimeError("down")))
    assert scriptwriter.write(DIFF, "roast")
