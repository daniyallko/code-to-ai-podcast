# Mode picker, cleaner home page, smarter setup prompt

## What visitors will see
1. **Three clear buttons at the top** (under the headline):
   - **Play interactive PR roast demo**
   - **Turn any GitHub repo into a podcast (online)**
   - **Get offline setup prompt (your local code)**
   Only the chosen mode's section is shown; the others stay hidden. A small "Switch mode" link returns to the picker.
2. **Online mode**: connects to your Oracle server right away and shows a live status pill ("Connecting…" → "Online server ready" with voice + version). Once a repo is loaded, demo-only pieces (scenario tabs, PR #402 diff, demo captions, "back to demo") are hidden — only that repo's commits/PRs, the generated episode, player, visualizer and filtergraph remain.
3. **Offline mode**: shows the setup prompt and local status. Once the local server is detected, the prompt collapses to "Connected to <repo name>" and only the local commits/episodes appear. Demo pieces hidden the same way.
4. **One mode at a time**: while online, the page never checks localhost (no failed-connection noise); while offline, it never contacts the online server. Demo mode checks neither.
5. Updated text: headline and descriptions explain "free audio podcasts for your code — online for public repos, offline for private code", and the status pill in the header reflects the active mode only.

## Smarter setup prompt (re-paste safe)
Rewritten so the agent first checks, then only does what's missing:
- Step 0: request http://localhost:8000/api/status. If it returns ok with this repo → just report "Already connected" and stop.
- If ~/studio-engineer-mcp exists → `git pull` + `uv sync` (fast no-op when up to date) instead of re-cloning; skip installing ffmpeg/git/uv when `--version` succeeds.
- If the companion is running for a different folder → restart it pointed at the current project only.
- Only register the MCP entry if "studio-engineer" isn't already in the agent config.
The page polls localhost quickly (every 2s while waiting, 10s once connected) so the connection appears seconds after the agent finishes.

## Faster online connection
- Status check fires immediately on choosing online mode (and is pre-warmed when hovering the button), short timeout, one retry, cached for the session so switching back is instant.
- Clear states: connecting, ready, unreachable (with retry button).

## Server
- `server.py`: add `--host` flag (default `127.0.0.1` for local safety; also reads `HOST` env).
- `Dockerfile`: CMD passes `--host 0.0.0.0`. After publishing you'll `git pull` and rebuild on Oracle.

## Technical details
- `src/routes/index.tsx`: add `mode: "picker" | "demo" | "online" | "offline"` state; conditionally render GitHubStudioPanel / SetupPromptCard+LocalStudioPanel / demo; pass `showDemoChrome={mode==="demo"}` to McpProtocolInspector to hide scenario tabs/diff.
- `src/lib/localStudio.ts`: `useLocalServer(enabled)` and new `useCloudServer(enabled)`; adaptive polling interval; no requests when disabled.
- `HeroSection.tsx`: replace launch CTA with the three-button picker.
- `src/lib/setupPrompt.ts`: idempotent check-first steps; update `setupPrompt.test.ts`.
- Mode persisted in URL search param (`?mode=online`) so refresh keeps it.
- Verify with Playwright: each mode hides the others, online mode makes zero localhost requests, demo still plays.
