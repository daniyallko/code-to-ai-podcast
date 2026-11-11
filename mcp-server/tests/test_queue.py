import time
from pathlib import Path
from src import episodes


def test_max_two_concurrent_renders_by_default():
    assert episodes.MAX_CONCURRENT == 2


def test_cleanup_removes_finished_episodes_older_than_two_hours(tmp_path: Path):
    now = time.time()
    (tmp_path / "ses_old").mkdir()
    episodes.EPISODES["ses_old"] = {"status": "COMPLETED", "created_at": now - 2 * 3600 - 5}
    episodes.EPISODES["ses_new"] = {"status": "COMPLETED", "created_at": now - 60}
    sessions = {"ses_old": object()}
    assert episodes.cleanup(sessions, tmp_path, now) == 1
    assert "ses_old" not in episodes.EPISODES and "ses_new" in episodes.EPISODES
    assert not (tmp_path / "ses_old").exists() and "ses_old" not in sessions
    episodes.EPISODES.pop("ses_new")
