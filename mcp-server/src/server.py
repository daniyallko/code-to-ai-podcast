"""StudioEngineer MCP — FastMCP server exposing Tools, Resources and Prompts over stdio or SSE."""
from __future__ import annotations

import argparse
import json
import uuid
from pathlib import Path

from mcp.server.fastmcp import FastMCP

import os

from . import dsp_engine, episodes, git_source, scriptwriter, tts_provider
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
3. Aim for 8-14 short lines, not generic padding. Cite actual changed files, symbols, behavior and risks. Use short grounded reactions and callbacks to those facts. Interrupt only for a purposeful correction or question, using overlap_ms between -150 and -350; otherwise use small positive gaps (150-400). Keep natural caption text; optional spoken_text must change pronunciation only (identifiers, numbers, acronyms), never meaning. Never invent outcomes, test results, safety claims or root causes.
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
Cover only detection, blast radius, root cause and mitigation supported by the log; explicitly distinguish unknowns and proposed follow-ups. Keep it blameless. Use concrete facts, short grounded reactions and callbacks, not generic padding or invented outcomes. Keep natural caption text; optional spoken_text changes pronunciation only.
Use pager_alert at the moment of detection and transition_whoosh between phases.
Use overlap_ms of -150 to -250 only for purposeful interjections, not every turn. Finish with render_master_mix.

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
def append_dialogue_stem(session_id: str, speaker: str, voice_id: str, text: str, emotion: str = "neutral", overlap_ms: int = 0, spoken_text: str | None = None) -> dict:
    """Synthesize a line of dialogue and append it to the timeline. Negative overlap_ms creates an interruption."""
    m = _session(session_id)
    if speaker not in DEFAULT_PAN:
        raise ValueError(f"speaker must be one of {list(DEFAULT_PAN)}")
    stem_id = f"stem_{len(m.stems) + 1:02d}"
    spoken_text = spoken_text or text
    path = tts_provider.synthesize(spoken_text, voice_id, RENDERS / session_id / "stems" / f"{stem_id}.wav", emotion)
    duration = dsp_engine.probe_duration_ms(path)
    start = max(0, m.total_duration_ms + overlap_ms)
    stem = Stem(stem_id=stem_id, speaker=speaker, voice_id=voice_id, text=text, emotion=emotion,  # type: ignore[arg-type]
                file_path=str(path), start_ms=start, duration_ms=duration, overlap_ms=overlap_ms, pan=DEFAULT_PAN[speaker], spoken_text=spoken_text)
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


@mcp.tool()
def list_local_commits(limit: int = 20) -> list[dict]:
    """List recent commits in the connected local repository."""
    return git_source.commits(limit)


@mcp.tool()
def get_local_diff(source: str = "working", base: str | None = None, head: str | None = None) -> dict:
    """Get a diff: source='working' (uncommitted), 'commit' (head), or 'range' (base..head)."""
    return git_source.diff(source, base, head)


@mcp.tool()
def generate_episode(format: str = "roast", source: str = "working", base: str | None = None, head: str | None = None,
                     length: str = "short", intensity: str = "spicy") -> dict:
    """Generate a full episode from local code (format: roast|explainer|postmortem). Appears on the web Local Studio."""
    return {"episode_id": episodes.start(SESSIONS, ASSETS_DIR, RENDERS, format, source, base, head, length, intensity)}


@mcp.tool()
def submit_script(lines: list[dict], format: str = "roast", source: str = "working", base: str | None = None, head: str | None = None) -> dict:
    """Render an agent-written script. lines: [{speaker: 'Alex (Staff SRE)'|'Sam (Builder)', text, emotion?, overlap_ms?, sfx?, spoken_text?}]."""
    parsed = []
    for ln in lines:
        if ln.get("speaker") not in DEFAULT_PAN or not str(ln.get("text", "")).strip():
            raise ValueError("each line needs a valid speaker and text")
        spoken_text = ln.get("spoken_text")
        if spoken_text is not None and not isinstance(spoken_text, str):
            raise ValueError("spoken_text must be a string when supplied")
        parsed.append(scriptwriter.Line(speaker=ln["speaker"], text=str(ln["text"])[:600], emotion=str(ln.get("emotion", "neutral")),
                                        overlap_ms=int(ln.get("overlap_ms", 250)), sfx=ln.get("sfx"),
                                        spoken_text=spoken_text[:600] if spoken_text is not None else None))
    return {"episode_id": episodes.start(SESSIONS, ASSETS_DIR, RENDERS, format, source, base, head, lines=parsed)}


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--transport", choices=["stdio", "sse"], default="stdio")
    ap.add_argument("--port", type=int, default=8000)
    ap.add_argument("--host", default=os.environ.get("HOST", "127.0.0.1"), help="Interface to bind for SSE/HTTP (use 0.0.0.0 in Docker)")
    ap.add_argument("--repo", default=None, help="Path of the local git repo to read commits/diffs from")
    args = ap.parse_args()
    if args.repo:
        os.environ["STUDIO_REPO"] = args.repo
    if args.transport == "stdio":
        mcp.run("stdio")
    else:
        import uvicorn
        from .http_app import build_app

        uvicorn.run(build_app(mcp, SESSIONS, ASSETS_DIR, RENDERS), host=args.host, port=args.port)


if __name__ == "__main__":
    main()
