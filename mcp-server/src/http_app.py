"""FastAPI wrapper: MCP SSE transport at /sse plus a CORS-enabled REST API for the web Local Studio."""
from __future__ import annotations

import os
from pathlib import Path
from typing import Literal, Optional

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from mcp.server.fastmcp import FastMCP
from pydantic import BaseModel, Field

from . import dsp_engine, episodes, git_source
from .models import TimelineManifest


class EpisodeRequest(BaseModel):
    format: Literal["roast", "explainer", "postmortem"] = "roast"
    source: Literal["working", "commit", "range"] = "working"
    base: Optional[str] = Field(default=None, max_length=100)
    head: Optional[str] = Field(default=None, max_length=100)
    length: Literal["short", "medium"] = "short"
    intensity: Literal["mild", "spicy"] = "spicy"


def build_app(mcp: FastMCP, sessions: dict[str, TimelineManifest], assets: Path, renders: Path) -> FastAPI:
    app = FastAPI(title="StudioEngineer MCP")

    @app.middleware("http")
    async def private_network(request: Request, call_next):
        # Chrome Private Network Access: lets the public showcase site call this localhost server.
        resp = await call_next(request)
        resp.headers["Access-Control-Allow-Private-Network"] = "true"
        return resp

    app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

    @app.get("/api/status")
    def status() -> dict:
        return {"ok": True, "server": "studio-engineer", "version": "0.2.0",
                "tts_provider": os.environ.get("TTS_PROVIDER", "synthetic_demo"),
                "ffmpeg": dsp_engine.has_ffmpeg(), "repo": git_source.info()}

    @app.get("/api/git/commits")
    def commits(limit: int = 30) -> list[dict]:
        try:
            return git_source.commits(limit)
        except Exception as e:  # noqa: BLE001
            raise HTTPException(400, str(e))

    @app.get("/api/git/diff")
    def diff(source: str = "working", base: Optional[str] = None, head: Optional[str] = None) -> dict:
        try:
            return git_source.diff(source, base, head)
        except Exception as e:  # noqa: BLE001
            raise HTTPException(400, str(e))

    @app.post("/api/episodes")
    def create(req: EpisodeRequest) -> dict:
        eid = episodes.start(sessions, assets, renders, req.format, req.source, req.base, req.head, req.length, req.intensity)
        return {"id": eid}

    @app.get("/api/episodes")
    def list_eps() -> list[dict]:
        return sorted(({k: v for k, v in e.items() if k != "diff"} for e in episodes.EPISODES.values()),
                      key=lambda e: -e["created_at"])

    @app.get("/api/episodes/{eid}")
    def get_ep(eid: str) -> dict:
        if eid not in episodes.EPISODES:
            raise HTTPException(404, "episode not found")
        ep = dict(episodes.EPISODES[eid])
        m = sessions.get(eid)
        ep["manifest"] = m.model_dump(exclude={"output_path"}) if m else None
        if ep["manifest"]:
            for s in ep["manifest"]["stems"]:
                s.pop("file_path", None)
        return ep

    @app.get("/api/episodes/{eid}/stems/{stem_id}")
    def stem_audio(eid: str, stem_id: str):
        m = sessions.get(eid)
        if not m:
            raise HTTPException(404, "episode not found")
        try:
            return FileResponse(m.stem(stem_id).file_path)
        except KeyError:
            raise HTTPException(404, "stem not found")

    @app.get("/api/episodes/{eid}/master.mp3")
    def master(eid: str):
        m = sessions.get(eid)
        if not m or not m.output_path:
            raise HTTPException(404, "master not rendered yet")
        return FileResponse(m.output_path, media_type="audio/mpeg", filename=f"{eid}.mp3")

    @app.get("/api/sessions")
    def list_sessions() -> list[dict]:
        return [m.model_dump(exclude={"stems", "sfx_cues"}) for m in sessions.values()]

    @app.get("/api/sessions/{session_id}")
    def get_session(session_id: str) -> dict:
        if session_id not in sessions:
            raise HTTPException(404, "session not found")
        return sessions[session_id].model_dump()

    app.mount("/", mcp.sse_app())  # serves GET /sse and POST /messages/
    return app
