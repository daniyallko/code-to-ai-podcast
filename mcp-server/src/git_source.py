"""Read-only access to the user's local git repository (commits + diffs)."""
from __future__ import annotations

import os
import re
import subprocess
from pathlib import Path

MAX_DIFF_CHARS = 60_000
_REF = re.compile(r"^[A-Za-z0-9._/~^@{}-]{1,100}$")


def repo_path() -> Path:
    return Path(os.environ.get("STUDIO_REPO") or os.getcwd()).resolve()


def _git(*args: str) -> str:
    r = subprocess.run(["git", "-C", str(repo_path()), *args], capture_output=True, text=True, timeout=20)
    if r.returncode != 0:
        raise RuntimeError(r.stderr.strip() or "git command failed")
    return r.stdout


def _ref(ref: str) -> str:
    if not _REF.match(ref) or ref.startswith("-"):
        raise ValueError(f"Invalid git ref {ref!r}")
    return ref


def info() -> dict:
    try:
        top = _git("rev-parse", "--show-toplevel").strip()
        branch = _git("rev-parse", "--abbrev-ref", "HEAD").strip()
        dirty = bool(_git("status", "--porcelain").strip())
        return {"is_repo": True, "repo_name": Path(top).name, "branch": branch, "dirty": dirty}
    except Exception as e:  # noqa: BLE001
        return {"is_repo": False, "repo_name": repo_path().name, "branch": None, "dirty": False, "error": str(e)}


def commits(limit: int = 30) -> list[dict]:
    limit = max(1, min(int(limit), 100))
    out = _git("log", f"-n{limit}", "--pretty=format:%H%x1f%h%x1f%an%x1f%ad%x1f%s", "--date=iso-strict")
    rows = []
    for line in out.splitlines():
        p = line.split("\x1f")
        if len(p) == 5:
            rows.append({"sha": p[0], "short": p[1], "author": p[2], "date": p[3], "subject": p[4]})
    return rows


def diff(source: str = "working", base: str | None = None, head: str | None = None) -> dict:
    """source: 'working' (uncommitted), 'commit' (head vs its parent), 'range' (base..head)."""
    if source == "working":
        text = _git("diff", "HEAD") or _git("diff")
        title = "Uncommitted changes"
    elif source == "commit":
        h = _ref(head or "HEAD")
        text = _git("show", "--format=", h)
        title = _git("log", "-1", "--pretty=%s", h).strip()
    elif source == "range":
        b, h = _ref(base or "HEAD~1"), _ref(head or "HEAD")
        text = _git("diff", f"{b}..{h}")
        title = f"{b}..{h}"
    else:
        raise ValueError("source must be working, commit or range")
    truncated = len(text) > MAX_DIFF_CHARS
    return {"title": title, "diff": text[:MAX_DIFF_CHARS], "truncated": truncated}
