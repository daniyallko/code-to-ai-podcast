"""Background episode generation: git diff -> script -> TTS stems -> FFmpeg master."""
from __future__ import annotations

import threading
import time
import uuid
from pathlib import Path

from . import dsp_engine, git_source, scriptwriter, tts_provider
from .models import DEFAULT_PAN, SfxCue, Stem, TimelineManifest

EPISODES: dict[str, dict] = {}
_lock = threading.Lock()


def _update(eid: str, **kw) -> None:
    with _lock:
        EPISODES[eid].update(kw)


def build_session(manifest: TimelineManifest, lines: list[scriptwriter.Line], renders: Path, on_progress=None) -> None:
    for i, ln in enumerate(lines):
        stem_id = f"stem_{len(manifest.stems) + 1:02d}"
        voice = scriptwriter.VOICES[ln.speaker]
        spoken_text = ln.spoken_text or ln.text
        path = tts_provider.synthesize(spoken_text, voice, renders / manifest.session_id / "stems" / f"{stem_id}.wav", ln.emotion)
        dur = dsp_engine.probe_duration_ms(path)
        overlap = 0 if not manifest.stems else ln.overlap_ms
        start = max(0, manifest.total_duration_ms + overlap)
        manifest.stems.append(Stem(stem_id=stem_id, speaker=ln.speaker, voice_id=voice, text=ln.text, emotion=ln.emotion,  # type: ignore[arg-type]
                                   file_path=str(path), start_ms=start, duration_ms=dur, overlap_ms=overlap, pan=DEFAULT_PAN[ln.speaker], spoken_text=spoken_text))
        manifest.total_duration_ms = max(manifest.total_duration_ms, start + dur)
        if ln.sfx:
            manifest.sfx_cues.append(SfxCue(cue_id=f"cue_{len(manifest.sfx_cues) + 1}", sfx_id=ln.sfx, trigger_after_stem_id=stem_id,
                                            timestamp_ms=start + dur, gain_db=-4.0))
        if on_progress:
            on_progress(i + 1, len(lines))


def start(sessions: dict[str, TimelineManifest], assets: Path, renders: Path, fmt: str, source: str,
          base: str | None = None, head: str | None = None, length: str = "short", intensity: str = "spicy",
          lines: list[scriptwriter.Line] | None = None,
          custom_diff: str | None = None, custom_title: str | None = None) -> str:
    eid = f"ses_{uuid.uuid4().hex[:6]}"
    with _lock:
        EPISODES[eid] = {"id": eid, "format": fmt, "source": source, "status": "QUEUED", "step": "scripting",
                         "progress": 0.0, "error": None, "title": "", "diff": "", "created_at": time.time()}

    def run() -> None:
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
