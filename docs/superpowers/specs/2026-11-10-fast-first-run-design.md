# Fast First Run Design

## Intent

A new user should reach a working web demo or connected local MCP server without waiting for speech-network calls, development-only dependencies, or optional voice models. The current guided setup blocks connection on `uv sync --extra dev && uv run pytest -q`; the tests make 14 serial Edge TTS requests. This design makes the default path local, locked, and connection-first.

## Goals

- Make the default Python test suite deterministic and offline, even when the caller inherited `TTS_PROVIDER=edge`.
- Install only runtime dependencies before the first MCP connection.
- Report connection after `/api/status` succeeds; move development tests and Kokoro downloads after that milestone.
- Use the committed Bun and uv lockfiles for documented installs.
- Prevent later `uv run` commands from repeating dependency synchronization.
- Keep full local rendering validation available as an explicit follow-up.

## Non-goals

- Changing the TanStack Start or Python MCP architecture.
- Making Kokoro, ElevenLabs, Docker image publishing, or CI mandatory.
- Parallelizing episode generation or changing TTS provider behavior.
- Removing integration/render coverage or using synthetic speech in the product demo.
- Editing database migrations, generated files, secrets, or Lovable-managed gateway configuration.

## Anti-goals

- A setup that reports success before the server status check passes.
- A test suite that silently contacts a network TTS provider.
- A quickstart that resolves unpinned dependencies despite committed lockfiles.
- A faster path that hides the commands needed for thorough validation.

## Constraints

- The showcase remains the TanStack Start app in `src/`; the Python MCP server remains in `mcp-server/`.
- Demo data and the JSON-RPC trace remain derived from `src/lib/demoScenario.ts`.
- Prerecorded speech and measured clip lengths remain mandatory for demo dialogue; synthetic voice-like oscillator output must not replace speech.
- Local Studio continues to talk only to the user's localhost MCP server.
- FFmpeg remains required for generation/rendering, but full render validation no longer blocks connection.
- No secret values enter the repository.

## Implementation Decisions

These are builder defaults chosen from the existing code, not additional user requirements:

- Standardize the web quickstart on Bun `1.3.13`, matching `bun.lock` and the existing Docker Compose runtime.
- Add `packageManager: "bun@1.3.13"` to `package.json` and use `bun install --frozen-lockfile`.
- Add an autouse pytest fixture that forces `TTS_PROVIDER=synthetic_demo` and replaces Edge/ElevenLabs provider functions with a failing test double. Explicit `provider_boundary` tests may call those functions only with mocked SDK/network boundaries. This preserves coverage of session, timeline, DSP, rendering, and provider adapters while making accidental network access fail loudly.
- Use `uv sync --locked` before connection and `uv run --no-sync` for server, agent, and validation commands.
- Keep the existing tests rather than splitting them into marker-selected suites; once speech is synthetic and local, an extra suite taxonomy adds no setup benefit.
- Put development validation in the setup page's existing Optional section.
- Defer Docker BuildKit restructuring and prebuilt images; the primary guided path has a larger, proven bottleneck.

## Success Measures

- `TTS_PROVIDER=edge uv run --no-sync pytest -q` passes without invoking Edge or ElevenLabs.
- The guided prompt reaches the Connected instruction only after runtime sync, server start, and `/api/status`, with pytest appearing later as optional validation.
- All documented uv invocations use the lockfile for installation and `--no-sync` for subsequent runs.
- A clean web checkout has one documented install path: `bun install --frozen-lockfile`, then `bun run dev`.
- Web tests, web build, and Python tests pass after their respective dependencies are installed.
