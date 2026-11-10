# Local Studio: one-prompt setup, live connection, generate podcasts from your code

## What the user will see (home page)

1. **Headline**: "Generate audio podcasts for your code — free." Subtext: runs on your computer, free local voices, no credits.
2. **"Copy setup prompt" card** — one big prompt the user pastes into Claude Code / Cursor / Codex / Antigravity / VS Code. The prompt tells the agent to:
   - detect the OS, install FFmpeg + uv if missing,
   - clone/download the project, `uv sync`, run tests,
   - register the `studio-engineer` MCP in that agent's own config,
   - start the local companion server (`--transport sse --port 8000`) pointed at the user's current code folder,
   - report back "Connected — open the site".
   A small OS/agent picker tweaks the prompt; the existing Setup guide stays as the manual fallback.
3. **Connection status pill** (top of page, always visible): Not connected / Checking / Connected (shows repo name, branch, voice engine). Auto-checks every 5 s.
4. **Local Studio panel** (unlocked when connected):
   - **Source picker**: list of recent local commits, uncommitted changes (working diff), or compare two commits/branches. Selecting one shows the diff in the existing diff viewer.
   - **Format**: PR roast podcast (2 hosts), Code explainer (single narrator walking through the change), Incident postmortem. Options: length (short/medium), intensity, voice engine.
   - **Generate** button with progress steps (scripting → voices → mixing → mastering).
   - Result plays in the existing multi-track DAW, ducking visualizer, filtergraph and JSON-RPC inspector, plus a Download MP3 button and a list of past episodes.
5. When not connected, the current simulated PR #402 demo remains, labelled "Demo".

## How generation works (free)

- The local server reads git directly (commits, diffs) — the site never uploads code anywhere.
- Script writing: the local server builds the dialogue from the diff with a built-in template scriptwriter (files changed, risky patterns, tests touched) — free, no AI calls. Each episode also offers "Improve with my agent": copies a prompt that asks the connected agent to rewrite the script via the MCP tools, which then appears on the page automatically.
- Voices: Kokoro (free, local) by default; synthetic fallback if Kokoro isn't installed.

## Technical details

- **mcp-server/src/http_app.py**: CORS for the site origin + localhost; new endpoints
  `GET /api/status`, `GET /api/git/commits`, `GET /api/git/diff?from&to|working`,
  `POST /api/episodes` (format, source, options) → job id, `GET /api/episodes/{id}` (progress, timeline manifest, stems), `GET /api/episodes/{id}/stems/{stem}.wav` and `/master.mp3`, `GET /api/episodes` list. SSE `/sse` emits JSON-RPC-style events for the inspector.
- **mcp-server/src/git_source.py** (new): safe `git log`/`git diff` via subprocess with arg lists, repo path from `--repo` flag / `STUDIO_REPO` env, size caps.
- **mcp-server/src/scriptwriter.py** (new): diff → stems for roast / explainer / postmortem formats.
- **mcp-server/src/server.py**: add `--repo` arg; add MCP tools `list_local_commits`, `get_local_diff`, `generate_episode`, and `submit_script(episode_id, lines)` for the "improve with agent" path; add explainer speaker (narrator) to models/pan.
- Background job runner (thread) reusing tts_provider + dsp_engine; tests for git_source and scriptwriter.
- **Frontend**: `src/lib/localStudio.ts` (typed client + status polling hook), `src/lib/setupPrompt.ts` (prompt builder per OS/agent), `src/components/showcase/SetupPromptCard.tsx`, `ConnectionStatus.tsx`, `LocalStudioPanel.tsx`; adapt `StudioEngine` to load a scenario built from a live episode (stems URLs + measured durations) so the DAW/visualizer/inspector reuse existing code; update hero copy and head meta.
- Browsers allow an https page to call `http://localhost`; the server must send CORS headers. Safari may block it — the status pill will explain this and suggest Chrome/Edge.

## Limits to be aware of

- The public website can only talk to the server while it's running on the visitor's own computer.
- Agents can't be "pushed" commands from the website; the paste-prompt is the one-time bridge.
