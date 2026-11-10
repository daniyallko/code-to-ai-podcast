# StudioEngineer MCP

An MCP server that lets an LLM produce multi-track podcasts. The showcase site at the repo root is the interactive demo.

```mermaid
flowchart LR
  LLM[Claude / Cursor] -- JSON-RPC 2.0 stdio|SSE --> S[FastMCP server.py]
  S -- Prompts --> P[pr-roast-podcast / incident-postmortem-war-room]
  S -- Tools --> T[create_session · append_dialogue_stem · insert_sfx_cue · render_master_mix]
  S -- Resources --> R[audio://sessions/id/timeline · /metrics · audio://library/sfx-catalog]
  T --> TTS[tts_provider: kokoro | elevenlabs | synthetic_demo]
  T --> DSP[dsp_engine: ffmpeg -filter_complex]
  DSP --> MP3[(master.mp3 @ -16 LUFS)]
  S -- /api/sessions + /sse --> WEB[Web DAW Showcase]
```

## Quickstart

Install only the locked runtime dependencies to connect. Development validation is optional and comes after the server is working.

```bash
cd mcp-server
uv sync --locked
uv run --no-sync python -m src.server --transport stdio             # Claude Desktop / Cursor
uv run --no-sync python -m src.server --transport sse --port 8000   # web showcase live mode
```

Optional development validation:

```bash
uv sync --locked --extra dev && uv run --no-sync pytest -q
```

Claude Desktop (`claude_desktop_config.json`):

```json
{ "mcpServers": { "studio-engineer": {
  "command": "uv",
  "args": ["--directory", "/abs/path/mcp-server", "run", "--no-sync", "python", "-m", "src.server"],
  "env": { "TTS_PROVIDER": "edge" } } } }
```

Edge provides real neural speech over the network without an API key. For fully local speech, run `uv sync --locked --extra kokoro`, download `kokoro-v1.0.onnx` and `voices-v1.0.bin`, then set `TTS_PROVIDER=kokoro` plus `KOKORO_MODEL` and `KOKORO_VOICES` to their paths. `synthetic_demo` is deterministic test audio, not real speech.

Or `docker compose up` from the repo root (server on :8000, showcase on :3000).

## DSP math

- **Placement:** `start_ms = max(0, total_duration_ms + overlap_ms)`. Negative overlap = interruption. `adelay=start|start` shifts both channels.
- **Panning:** mono→stereo matrix. Alex (pan −0.6): `c0=0.8*c0|c1=0.2*c0` (≈ −12 dB opposite side). Sam reversed.
- **Ducking:** `sidechaincompress=threshold=0.03:ratio=6:attack=50:release=600`. Threshold 0.03 ≈ −30 dBFS; speech peaking ~−6 dBFS is 24 dB over, so gain reduction ≈ 24·(1−1/6) ≈ 20 dB at peaks and ~12 dB on average speech.
- **Loudness:** `loudnorm=I=-16:TP=-1.5:LRA=11` (EBU R128 / podcast standard). A second pass with `print_format=json` reports real integrated LUFS, true peak and LRA into `AudioMetrics`.

## Notes

- Requires `ffmpeg`/`ffprobe` for rendering; durations fall back to `soundfile` without them.
- Assets in `./assets` are synthesized on first boot (no downloads, no copyright).
- Pinned to `mcp<2` (FastMCP API).
