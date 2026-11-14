"""Background episode generation: git diff -> script -> TTS stems -> FFmpeg master."""
from __future__ import annotations

import os
import shutil
import threading
import time
import uuid
from pathlib import Path

from . import dsp_engine, git_source, scriptwriter, tts_provider
from .models import DEFAULT_PAN, SfxCue, Stem, TimelineManifest

EPISODES: dict[str, dict] = {}
_lock = threading.Lock()
# Cap parallel renders (FFmpeg is CPU-bound); extra episodes wait as QUEUED.
MAX_CONCURRENT = max(1, int(os.environ.get("MAX_CONCURRENT_RENDERS", "2")))
_slots = threading.BoundedSemaphore(MAX_CONCURRENT)
RETENTION_S = int(os.environ.get("RENDER_RETENTION_SECONDS", str(2 * 3600)))


def cleanup(sessions: dict, renders: Path, now: float | None = None) -> int:
    """Delete finished episodes (and their audio) older than RETENTION_S."""
    now = now or time.time()
    with _lock:
        old = [k for k, v in EPISODES.items()
               if v["status"] in ("COMPLETED", "FAILED") and now - v["created_at"] > RETENTION_S]
        for k in old:
            EPISODES.pop(k, None)
    for k in old:
        sessions.pop(k, None)
        shutil.rmtree(renders / k, ignore_errors=True)
    return len(old)


def queue_position(eid: str) -> int:
    with _lock:
        q = sorted((v["created_at"], k) for k, v in EPISODES.items() if v["status"] == "QUEUED")
    return next((i + 1 for i, (_, k) in enumerate(q) if k == eid), 0)


def _update(eid: str, **kw) -> None:
    with _lock:
        EPISODES[eid].update(kw)


def build_session(manifest: TimelineManifest, lines: list[scriptwriter.Line], renders: Path, on_progress=None) -> None:
    from concurrent.futures import ThreadPoolExecutor
    base = len(manifest.stems)
    done = [0]
    lock = threading.Lock()

    def synth(i: int):
        ln = lines[i]
        stem_id = f"stem_{base + i + 1:02d}"
        voice = scriptwriter.VOICES[ln.speaker]
        spoken_text = ln.spoken_text or ln.text
        path = tts_provider.synthesize(spoken_text, voice, renders / manifest.session_id / "stems" / f"{stem_id}.wav", ln.emotion)
        dur = dsp_engine.probe_duration_ms(path)
        with lock:
            done[0] += 1
            if on_progress:
                on_progress(done[0], len(lines))
        return stem_id, voice, spoken_text, path, dur

    workers = max(1, int(os.environ.get("TTS_PARALLEL", "6")))
    with ThreadPoolExecutor(max_workers=workers) as pool:
        results = list(pool.map(synth, range(len(lines))))

    # Place in script order using measured durations.
    for ln, (stem_id, voice, spoken_text, path, dur) in zip(lines, results):
        overlap = 0 if not manifest.stems else ln.overlap_ms
        start = max(0, manifest.total_duration_ms + overlap)
        manifest.stems.append(Stem(stem_id=stem_id, speaker=ln.speaker, voice_id=voice, text=ln.text, emotion=ln.emotion,  # type: ignore[arg-type]
                                   file_path=str(path), start_ms=start, duration_ms=dur, overlap_ms=overlap, pan=DEFAULT_PAN[ln.speaker], spoken_text=spoken_text))
        manifest.total_duration_ms = max(manifest.total_duration_ms, start + dur)
        if ln.sfx:
            manifest.sfx_cues.append(SfxCue(cue_id=f"cue_{len(manifest.sfx_cues) + 1}", sfx_id=ln.sfx, trigger_after_stem_id=stem_id,
                                            timestamp_ms=start + dur, gain_db=-4.0))


def start(sessions: dict[str, TimelineManifest], assets: Path, renders: Path, fmt: str, source: str,
          base: str | None = None, head: str | None = None, length: str = "short", intensity: str = "spicy",
          lines: list[scriptwriter.Line] | None = None,
          custom_diff: str | None = None, custom_title: str | None = None) -> str:
    cleanup(sessions, renders)
    eid = f"ses_{uuid.uuid4().hex[:6]}"
    with _lock:
        EPISODES[eid] = {"id": eid, "format": fmt, "source": source, "status": "QUEUED", "step": "scripting",
                         "progress": 0.0, "error": None, "title": "", "diff": "", "created_at": time.time()}

    def run() -> None:
        with _slots:
            _run()

    def _run() -> None:
        try:
            if source == "custom":
                d = {"title": (custom_title or "Pasted diff").strip(), "diff": (custom_diff or "")[:git_source.MAX_DIFF_CHARS]}
            else:
                d = git_source.diff(source, base, head)
            _update(eid, title=d["title"], diff=d["diff"], status="RUNNING")
            script = lines or scriptwriter.write(d["diff"], fmt, d["title"], length, intensity)
            m = TimelineManifest(session_id=eid, title=d["title"] or "Episode")
            sessions[eid] = m
            _update(eid, step="voices", progress=0.1)
            build_session(m, script, renders, lambda i, n: _update(eid, progress=0.1 + 0.6 * i / n))
            _update(eid, step="mixing", progress=0.75)
            m.status = "MIXING"
            out, met, fc = dsp_engine.render(m, assets, renders / eid)
            m.metrics, m.output_path, m.status = met, str(out), "COMPLETED"
            _update(eid, step="done", status="COMPLETED", progress=1.0, filter_complex=fc)
        except Exception as e:  # noqa: BLE001
            _update(eid, status="FAILED", error=str(e))

    threading.Thread(target=run, daemon=True).start()
    return eid
