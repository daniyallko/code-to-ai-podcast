# Fast First Run Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make a clean checkout reach a working demo or connected MCP server quickly by using locked installs, offline tests, and connection-first setup.

**Architecture:** Preserve the TanStack Start and Python MCP split. Isolate test speech at pytest fixtures, then reorder the existing guided/manual setup around runtime installation and a successful status check; keep development validation available but optional.

**Tech Stack:** Bun 1.3.13, Vite, Vitest, TypeScript, Python 3.11+, uv, pytest, FastAPI.

**Spec:** `docs/superpowers/specs/2026-11-10-fast-first-run-design.md`

## Global Constraints

- Keep the showcase in `src/` and the MCP server in `mcp-server/`; do not change their architecture.
- Do not edit `supabase/migrations/`, `drizzle/`, generated files, or secrets.
- Do not replace prerecorded demo speech with oscillator output or stretch speech to placeholder timings.
- Use Bun `1.3.13`, `bun install --frozen-lockfile`, `uv sync --locked`, and `uv run --no-sync` exactly where this plan specifies.
- Keep FFmpeg rendering validation and Kokoro installation available, but do not make them gates for MCP connection.
- Do not rewrite published git history.

## Review Focus

- Inherited `TTS_PROVIDER=edge` or ElevenLabs configuration: tests must stay offline; Task 2 adds a failing provider double and an inherited-environment test run.
- Missing development extras: runtime connection must still work; Task 3 pins runtime-only installation before the status check and development installation afterward.
- Repeated uv synchronization on agent startup: every generated agent configuration must include `--no-sync`; Task 3 tests every OS/agent configuration.
- Optional Kokoro downloads: they must remain after the Connected milestone; Task 3 checks prompt ordering.
- Windows/macOS/Linux command drift: Task 3 runs the same setup assertions for every supported OS.

---

### Task 1: Reproducible Web Quickstart

**Files:**
- Modify: `package.json:6-15`
- Modify: `README.md:17-26`
- Modify: `docker-compose.yml:8-16`

**Interfaces:**
- Consumes: Existing `bun.lock` and Bun scripts.
- Produces: `packageManager: "bun@1.3.13"`; one documented frozen-lockfile install path.

- [ ] **Step 1: Record the current unlocked-install failure mode**

Run: `test -f bun.lock && test ! -f package-lock.json && grep -n 'npm i' README.md`
Expected: exit 0; README advertises npm despite the Bun-only lockfile.

- [ ] **Step 2: Pin Bun and update the documented commands**

Add `"packageManager": "bun@1.3.13"` to `package.json`. Replace the Node/npm quickstart with Bun prerequisites and these commands:

```sh
git clone <this-repository-url>
cd <repository-name>
bun install --frozen-lockfile
bun run dev
```

Change the Compose web command to `bun install --frozen-lockfile && bun run dev --host 0.0.0.0 --port 3000`.

- [ ] **Step 3: Verify the locked web path**

Run: `bun install --frozen-lockfile && bun run test && bun run build`
Expected: install consumes `bun.lock` without modifying it; tests and production build exit 0.

- [ ] **Step 4: Commit**

```bash
git add package.json README.md docker-compose.yml
git commit -m "build: make web quickstart reproducible" -m "Co-Authored-By: Kimi <noreply@anthropic.com>"
```

### Task 2: Offline Deterministic Python Tests

**Files:**
- Create: `mcp-server/tests/conftest.py`
- Create: `mcp-server/tests/test_tts_isolation.py`
- Modify: `mcp-server/pyproject.toml:21-23`

**Interfaces:**
- Consumes: `src.tts_provider._edge`, `src.tts_provider._elevenlabs`, and pytest `monkeypatch`.
- Produces: An autouse `isolate_tts` fixture and registered `provider_boundary` marker; production APIs remain unchanged. Unmarked tests block provider entry points; marked tests must mock the external SDK/network boundary.

- [ ] **Step 1: Write the failing isolation tests**

Create tests with these exact assertions:

```python
import os
import pytest
from src import tts_provider


def test_suite_forces_offline_tts():
    assert os.environ["TTS_PROVIDER"] == "synthetic_demo"


def test_network_provider_entry_points_are_stubbed(tmp_path):
    for name in ("_edge", "_elevenlabs"):
        with pytest.raises(AssertionError, match="Network TTS disabled during tests"):
            getattr(tts_provider, name)("hello", "af_bella", tmp_path / "speech.wav")
```

- [ ] **Step 2: Run the environment test to verify it fails**

Run: `cd mcp-server && uv sync --locked --extra dev && TTS_PROVIDER=edge uv run --no-sync pytest -q tests/test_tts_isolation.py::test_suite_forces_offline_tts`
Expected: dependency installation succeeds, then the test FAILs because the autouse fixture does not exist. Do not run the provider-entry-point test before the fixture exists.

- [ ] **Step 3: Implement the autouse fixture**

In `mcp-server/tests/conftest.py`, define `isolate_tts(monkeypatch, request)` with `@pytest.fixture(autouse=True)`. Set `TTS_PROVIDER` to `synthetic_demo`. Unless the test has the `provider_boundary` marker, monkeypatch both network provider functions to a test double that raises `AssertionError("Network TTS disabled during tests")` whenever called. Register `provider_boundary: provider adapter tests with mocked external boundaries` under `[tool.pytest.ini_options]` in `pyproject.toml`.

- [ ] **Step 4: Run the isolation and existing suites**

Run: `cd mcp-server && uv run --no-sync pytest -q tests/test_tts_isolation.py && TTS_PROVIDER=edge uv run --no-sync pytest -q`
Expected: all tests PASS; no Edge/ElevenLabs request occurs; render tests still use local synthetic audio and FFmpeg when available.

- [ ] **Step 5: Commit**

```bash
git add mcp-server/tests/conftest.py mcp-server/tests/test_tts_isolation.py mcp-server/pyproject.toml
git commit -m "test: keep MCP tests offline by default" -m "Co-Authored-By: Kimi <noreply@anthropic.com>"
```

### Task 3: Connection-First Guided and Manual Setup

**Files:**
- Create: `src/lib/setupCommands.ts`
- Modify: `src/lib/setupPrompt.ts:21-32`
- Modify: `src/components/showcase/AgentConfigs.ts:16-20,127-155`
- Modify: `src/routes/setup.tsx:103-123`
- Modify: `mcp-server/README.md:17-36`
- Test: `src/test/setupPrompt.test.ts`

**Interfaces:**
- Consumes: Task 2's offline suite and Task 1's installed web dependencies.
- Produces: `UV_SYNC_RUNTIME = "uv sync --locked"` and `UV_DEV_VALIDATION = "uv sync --locked --extra dev && uv run --no-sync pytest -q"`; all agent argument lists contain `"run", "--no-sync", "python"`.

- [ ] **Step 1: Write failing setup contract tests**

Create `src/test/setupPrompt.test.ts`. For each `OsKey`, assert:
- `buildSetupPrompt(...)` contains the two literal commands from the Interfaces block.
- Runtime sync, server start, `/api/status`, and `Connected` occur in that order; `pytest` and `kokoro` occur after `Connected`.
- `prereqSteps(os)` contains `uv sync --locked` and has no mandatory `Run the tests` step.
- Every `getAgents(os).config` uses `--no-sync`; JSON configurations place it between `run` and `python`.

Use literal strings in assertions rather than importing the new constants, so the tests catch accidental command changes.

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun run test -- src/test/setupPrompt.test.ts`
Expected: FAIL because setup currently uses `uv sync --extra dev`, requires pytest before Connected, and omits `--no-sync`.

- [ ] **Step 3: Add shared commands and reorder the guided prompt**

Create `setupCommands.ts` with the exact constants from Interfaces. Rewrite `buildSetupPrompt` so its required sequence is prerequisites, clone, runtime sync, companion server start, status verification, agent registration/restart, then Connected. Put `UV_DEV_VALIDATION` and Kokoro in an explicit optional follow-up after Connected. Use `uv --directory <absolute-path> run --no-sync ...` for the companion server.

- [ ] **Step 4: Update manual setup and agent startup commands**

Use `UV_SYNC_RUNTIME` in `prereqSteps`; remove the mandatory test step. Add `--no-sync` after every uv `run` in `args`. Add an Optional development-validation panel to `src/routes/setup.tsx` using `UV_DEV_VALIDATION`, and update the Inspector command to `uv ... run --no-sync`.

- [ ] **Step 5: Correct the Python quickstart**

Document `uv sync --locked`, `uv run --no-sync python -m src.server ...`, and optional `UV_DEV_VALIDATION` in `mcp-server/README.md`. Keep stdio, SSE, Docker, and Kokoro instructions accurate; do not describe synthetic demo audio as real speech.

- [ ] **Step 6: Run setup and regression checks**

Run: `bun run test -- src/test/setupPrompt.test.ts && bun run test && bun run build && cd mcp-server && uv sync --locked --extra dev && TTS_PROVIDER=edge uv run --no-sync pytest -q`
Expected: all commands exit 0; generated setup text passes every OS/agent contract.

- [ ] **Step 7: Smoke-test the actual connection milestone**

Run the documented runtime-only install and SSE command, then `curl -fsS http://127.0.0.1:8000/api/status`.
Expected: status returns HTTP success with `"ok": true` and the selected repository name before development validation is run.

- [ ] **Step 8: Commit**

```bash
git add src/lib/setupCommands.ts src/lib/setupPrompt.ts src/components/showcase/AgentConfigs.ts src/routes/setup.tsx src/test/setupPrompt.test.ts mcp-server/README.md
git commit -m "feat: connect MCP before optional validation" -m "Co-Authored-By: Kimi <noreply@anthropic.com>"
```
