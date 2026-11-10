import subprocess, time
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

def test_episode_end_to_end(tmp_path, monkeypatch):
    subprocess.run(["git", "init", "-q", str(tmp_path)], check=True)
    (tmp_path / "a.py").write_text("x = 1\n")
    subprocess.run(["git", "-C", str(tmp_path), "add", "."], check=True)
    subprocess.run(["git", "-C", str(tmp_path), "-c", "user.email=a@b", "-c", "user.name=a", "commit", "-qm", "init"], check=True)
    (tmp_path / "a.py").write_text("x = 2  # cache ttl\n")
    monkeypatch.setenv("STUDIO_REPO", str(tmp_path))
    assert git_source.info()["dirty"] is True
    eid = episodes.start(SESSIONS, ASSETS_DIR, RENDERS, "explainer", "working")
    for _ in range(300):
        if episodes.EPISODES[eid]["status"] in ("COMPLETED", "FAILED"): break
        time.sleep(0.2)
    assert episodes.EPISODES[eid]["status"] == "COMPLETED", episodes.EPISODES[eid]["error"]
    assert SESSIONS[eid].output_path
