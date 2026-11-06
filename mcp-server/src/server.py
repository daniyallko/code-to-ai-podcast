"""StudioEngineer MCP — FastMCP server exposing Tools, Resources and Prompts over stdio or SSE."""
from __future__ import annotations

import argparse
import json
import uuid
from pathlib import Path

from mcp.server.fastmcp import FastMCP

from . import dsp_engine, tts_provider
from .assets_generator import ASSETS_DIR, catalog, ensure_assets
from .models import DEFAULT_PAN, SfxCue, Stem, TimelineManifest

ROOT = Path(__file__).resolve().parent.parent
RENDERS = ROOT / "renders"
SESSIONS: dict[str, TimelineManifest] = {}

mcp = FastMCP("studio-engineer")
ensure_assets()


def _session(session_id: str) -> TimelineManifest:
    if session_id not in SESSIONS:
        raise ValueError(f"Unknown session_id {session_id!r}")
    return SESSIONS[session_id]


# ---------------- Resources ----------------
@mcp.resource("audio://sessions/{session_id}/timeline", mime_type="application/json")
def timeline(session_id: str) -> str:
    return _session(session_id).model_dump_json(indent=2)


@mcp.resource("audio://library/sfx-catalog", mime_type="application/json")
def sfx_catalog() -> str:
    return json.dumps(catalog(), indent=2)


@mcp.resource("audio://sessions/{session_id}/metrics", mime_type="application/json")
def metrics(session_id: str) -> str:
    m = _session(session_id)
    by_speaker: dict[str, int] = {}
    for s in m.stems:
        by_speaker[s.speaker] = by_speaker.get(s.speaker, 0) + s.duration_ms
    return json.dumps({
        "session_id": session_id,
        "status": m.status,
        "loudness": m.metrics.model_dump() if m.metrics else None,
        "stem_count": len(m.stems),
        "sfx_count": len(m.sfx_cues),
        "interruptions": sum(1 for s in m.stems if s.overlap_ms < 0),
        "speaking_ms_by_speaker": by_speaker,
        "total_duration_ms": m.total_duration_ms,
    }, indent=2)


# ---------------- Prompts ----------------
@mcp.prompt(name="pr-roast-podcast")
def pr_roast_podcast(pr_diff: str, intensity: str = "spicy") -> str:
    return f"""You are an autonomous podcast showrunner using the StudioEngineer MCP tools.
Produce a 2-host episode debating this pull request at {intensity} intensity.

Hosts:
- "Alex (Staff SRE)" (voice_id am_michael): cynical, obsessed with race conditions, p99 latency and pager fatigue.
- "Sam (Builder)" (voice_id af_bella): optimistic product engineer who loves shipping fast.

Procedure:
1. create_session with a punchy title.
2. Read audio://library/sfx-catalog.
3. Call append_dialogue_stem 8-14 times, alternating hosts. When a host interrupts, use a NEGATIVE overlap_ms between -150 and -350. Use small positive gaps (150-400) otherwise.
4. Read audio://sessions/{{session_id}}/timeline to verify placement.
5. insert_sfx_cue at comedic turning points (record_scratch for reversals, pager_alert when Alex predicts an outage, keyboard_clack for code reading).
6. render_master_mix with normalize_lufs=-16.0 and report the metrics.

PR diff:
```diff
{pr_diff}
```"""


@mcp.prompt(name="incident-postmortem-war-room")
def incident_postmortem_war_room(incident_log: str) -> str:
    return f"""You are producing an investigative audio postmortem using StudioEngineer MCP.
Alex (Staff SRE) walks through the timeline; Sam (Builder) asks the questions a product team would ask.
Cover detection, blast radius, root cause, mitigation and follow-ups. Keep it blameless.
Use pager_alert at the moment of detection and transition_whoosh between phases.
Use overlap_ms of -150 to -250 when Sam interjects. Finish with render_master_mix.

Incident log:
```
{incident_log}
```"""


# ---------------- Tools ----------------
@mcp.tool()
def create_session(title: str, bpm: int = 95, bgm_track_id: str = "lofi_synth_bed") -> dict:
    """Create a new multi-track podcast session and return its id."""
    if not (ASSETS_DIR / f"{bgm_track_id}.wav").exists():
        raise ValueError(f"Unknown bgm_track_id {bgm_track_id!r}")
    sid = f"ses_{uuid.uuid4().hex[:6]}"
    SESSIONS[sid] = TimelineManifest(session_id=sid, title=title, bpm=bpm, bgm_track_id=bgm_track_id)
    return {"session_id": sid, "status": "DRAFT", "timeline_uri": f"audio://sessions/{sid}/timeline"}


@mcp.tool()
def append_dialogue_stem(session_id: str, speaker: str, voice_id: str, text: str, emotion: str = "neutral", overlap_ms: int = 0) -> dict:
    """Synthesize a line of dialogue and append it to the timeline. Negative overlap_ms creates an interruption."""
    m = _session(session_id)
    if speaker not in DEFAULT_PAN:
        raise ValueError(f"speaker must be one of {list(DEFAULT_PAN)}")
    stem_id = f"stem_{len(m.stems) + 1:02d}"
    path = tts_provider.synthesize(text, voice_id, RENDERS / session_id / "stems" / f"{stem_id}.wav", emotion)
    duration = dsp_engine.probe_duration_ms(path)
    start = max(0, m.total_duration_ms + overlap_ms)
    stem = Stem(stem_id=stem_id, speaker=speaker, voice_id=voice_id, text=text, emotion=emotion,  # type: ignore[arg-type]
                file_path=str(path), start_ms=start, duration_ms=duration, overlap_ms=overlap_ms, pan=DEFAULT_PAN[speaker])
    m.stems.append(stem)
    m.total_duration_ms = max(m.total_duration_ms, start + duration)
    return stem.model_dump(exclude={"file_path"})


@mcp.tool()
def insert_sfx_cue(session_id: str, sfx_id: str, trigger_after_stem_id: str, offset_ms: int = 0, gain_db: float = -3.0) -> dict:
    """Place a sound effect right after a given stem ends (plus offset_ms)."""
    m = _session(session_id)
    if not (ASSETS_DIR / f"{sfx_id}.wav").exists():
        raise ValueError(f"Unknown sfx_id {sfx_id!r}")
    s = m.stem(trigger_after_stem_id)
    cue = SfxCue(cue_id=f"cue_{len(m.sfx_cues) + 1}", sfx_id=sfx_id, trigger_after_stem_id=trigger_after_stem_id,
                 timestamp_ms=max(0, s.start_ms + s.duration_ms + offset_ms), gain_db=gain_db)
    m.sfx_cues.append(cue)
    return cue.model_dump()


@mcp.tool()
def render_master_mix(session_id: str, normalize_lufs: float = -16.0, ducking_ratio: float = 6.0) -> dict:
    """Render the session through the FFmpeg sidechain + loudnorm pipeline to master.mp3."""
    m = _session(session_id)
    m.status = "MIXING"
    try:
        out, met, fc = dsp_engine.render(m, ASSETS_DIR, RENDERS / session_id, ducking_ratio, normalize_lufs)
    except Exception:
        m.status = "DRAFT"
        raise
    m.metrics, m.output_path, m.status = met, str(out), "COMPLETED"
    return {"status": m.status, "output": str(out), "filter_complex": fc, "metrics": met.model_dump()}


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--transport", choices=["stdio", "sse"], default="stdio")
    ap.add_argument("--port", type=int, default=8000)
    args = ap.parse_args()
    if args.transport == "stdio":
        mcp.run("stdio")
    else:
        import uvicorn
        from .http_app import build_app

        uvicorn.run(build_app(mcp, SESSIONS), host="0.0.0.0", port=args.port)


if __name__ == "__main__":
    main()
