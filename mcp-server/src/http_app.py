"""FastAPI wrapper: MCP SSE transport at /sse plus a CORS-enabled REST view at /api/sessions."""
from __future__ import annotations

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from mcp.server.fastmcp import FastMCP

from .models import TimelineManifest


def build_app(mcp: FastMCP, sessions: dict[str, TimelineManifest]) -> FastAPI:
    app = FastAPI(title="StudioEngineer MCP")
    app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

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
