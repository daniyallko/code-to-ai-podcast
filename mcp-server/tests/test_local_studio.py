import time
from src import git_source, scriptwriter, episodes
from src.server import SESSIONS, ASSETS_DIR, RENDERS

DIFF = "diff --git a/lock.py b/lock.py\n+import redis\n+def acquire(): pass\n-old = 1\n"

def test_analyze_counts_and_risks():
    a = scriptwriter.analyze(DIFF)
    assert a["files"] == ["lock.py"] and a["added"] == 2 and a["removed"] == 1
    assert a["risks"][0][0] == "locking"

def test_explainer_is_single_narrator():
    lines = scriptwriter.write(DIFF, "explainer", "x")
    assert {l.speaker for l in lines} == {scriptwriter.ALEX}

def test_roast_alternates_hosts_with_interruptions():
    lines = scriptwriter.write(DIFF, "roast", "x")
    assert {l.speaker for l in lines} == {scriptwriter.ALEX, scriptwriter.SAM}
    assert any(l.overlap_ms < 0 for l in lines)

def test_rejects_option_like_ref():
    import pytest
    with pytest.raises(ValueError):
        git_source.diff("commit", head="--output=/tmp/x")

def test_episode_end_to_end(monkeypatch):
    monkeypatch.setattr(git_source, "diff", lambda *a, **k: {"title": "t", "diff": DIFF, "truncated": False})
    eid = episodes.start(SESSIONS, ASSETS_DIR, RENDERS, "explainer", "working")
    for _ in range(300):
        if episodes.EPISODES[eid]["status"] in ("COMPLETED", "FAILED"): break
        time.sleep(0.2)
    assert episodes.EPISODES[eid]["status"] == "COMPLETED", episodes.EPISODES[eid]["error"]
    assert SESSIONS[eid].output_path


def test_custom_diff_source_skips_git(monkeypatch, tmp_path):
    from src import episodes, git_source
    monkeypatch.setattr(git_source, "diff", lambda *a, **k: (_ for _ in ()).throw(AssertionError("git called")))
    captured = {}
    import src.scriptwriter as sw
    monkeypatch.setattr(sw, "write", lambda diff, *a, **k: captured.setdefault("diff", diff) and [])
    eid = episodes.start({}, tmp_path, tmp_path, "explainer", "custom", custom_diff="+print(1)", custom_title="Repo PR")
    import time
    for _ in range(50):
        if episodes.EPISODES[eid]["status"] not in ("QUEUED", "RUNNING"):
            break
        time.sleep(0.05)
    assert episodes.EPISODES[eid]["title"] == "Repo PR"
    assert captured["diff"] == "+print(1)"
