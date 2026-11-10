# Fun Natural Voices Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make both demo scenarios and Local Studio sound distinct, funny, and natural through better writing, real neural voice direction, and final-clip timing metadata.

**Architecture:** Keep raw demo dialogue separate from asset metadata, then derive the existing Scenario, trace, and timeline from final prerecorded clips. Add a small provider-direction layer for live synthesis and propagate optional spoken text without changing browser buffer playback or the DSP pipeline.

**Tech Stack:** TypeScript, React, Vitest, Web Audio, Python 3.11+, pytest, Edge TTS, Kokoro ONNX, ElevenLabs REST, FFmpeg/ffprobe, Lovable assets.

**Spec:** `docs/superpowers/specs/2026-11-10-fun-natural-voices-design.md`

## Global Constraints

- Demo dialogue must use real prerecorded speech and final measured clip lengths; no oscillator speech or post-render stretching.
- Keep timeline, inspector, and filtergraph derived from the shared Scenario.
- Display `text`; synthesize `spoken_text ?? text`.
- Do not hand-edit generated files or Lovable asset descriptors; upload replacement MP3s through Lovable.
- Do not add a mandatory LLM, draft editor, database migration, browser secret, or new TTS dependency.
- Do not invent diff facts, test results, incident causes, or contained blast radius.
- Do not rewrite published git history.

## Review Focus

- Rewritten text paired with stale audio: Task 3 requires all 13 new recordings, exact spoken-text metadata, remote duration checks, and a listening pass.
- Unknown or misspelled emotion: Task 2 tests neutral fallback rather than invalid provider parameters.
- Diff with no risky-regex match: Task 4 requires an honest unknown blast radius, never “contained.”
- Agent script omitting `spoken_text`: Task 4 tests the backward-compatible caption-text fallback.
- Interruptions landing on final speech rather than trailing silence: Task 3 includes per-scenario audition and overlap adjustment without retiming clips.

---

### Task 1: Typed Dialogue and Truthful Timing Metadata

**Files:**
- Create: `src/lib/demoDialogue.ts`
- Modify: `src/lib/demoScenario.ts:3-16,81-166,213-240`
- Modify: `src/lib/demoSpeech.ts:15-29`
- Test: `src/test/demo-speech.test.ts`

**Interfaces:**
- Consumes: Existing 13 hosted clips and measured durations.
- Produces: `DemoDialogueLine = { speaker, text, spoken_text, emotion, overlap_ms }`; `DEMO_DIALOGUE: Record<"pr-402" | "incident", DemoDialogueLine[]>`; optional `DemoStem.spoken_text`; `DEMO_SPEECH` values `{ url, duration_ms, spoken_text }`.

- [ ] **Step 1: Write failing metadata and trace tests**

Expand `demo-speech.test.ts` to cover both scenarios and all 13 stems. Assert each raw line's `spoken_text` equals its speech-registry entry, each layout duration comes only from `DEMO_SPEECH`, and playback fetches/decodes every clip. Assert PR SFX trace offsets are `[-900, 0, 0, -200]` and incident offsets are `[-3000, 0, 0]`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun install --frozen-lockfile && bun run test -- src/test/demo-speech.test.ts`
Expected: FAIL because speech metadata lacks `spoken_text`, raw tuples contain placeholder durations, and SFX requests hard-code `offset_ms: 0`.

- [ ] **Step 3: Implement the schema without changing current dialogue or assets**

Move current lines into `demoDialogue.ts` as objects, using current caption text for both `text` and `spoken_text`; remove raw duration fields. Make `layout()` consume `DEMO_DIALOGUE[key]` and registry durations. Add registry `spoken_text`, carry it onto stems, and derive each SFX trace offset from `cue.timestamp_ms - trigger.start_ms - trigger.duration_ms`. Leave RPC append arguments unchanged until the server accepts spoken text in Task 4.

- [ ] **Step 4: Run regression checks**

Run: `bun run test -- src/test/demo-speech.test.ts && bun run test && bun run build`
Expected: PASS; all 13 existing clips still play with unchanged captions and timeline values except trace offsets now matching actual SFX placement.

- [ ] **Step 5: Commit**

```bash
git add src/lib/demoDialogue.ts src/lib/demoScenario.ts src/lib/demoSpeech.ts src/test/demo-speech.test.ts
git commit -m "refactor: bind demo dialogue to speech metadata" -m "Co-Authored-By: Kimi <noreply@anthropic.com>"
```

### Task 2: Real Voice Casting and Direction

**Files:**
- Modify: `mcp-server/src/tts_provider.py:39-100`
- Modify: `mcp-server/pyproject.toml:21-23`
- Create: `mcp-server/tests/test_tts_provider.py`
- Modify: `docker-compose.yml:1-7`
- Modify: `src/components/showcase/HeroSection.tsx:29-32`
- Modify: `mcp-server/README.md:11,27-34,45-49`
- Modify: `src/routes/setup.tsx:110-113`

**Interfaces:**
- Consumes: Existing abstract voice IDs and `emotion` arguments.
- Produces: `direction_for(emotion: str) -> dict`, `resolve_voice(voice_id: str, provider: str) -> str`, cached `_get_kokoro(model: str, voices: str)`; provider functions accept emotion while public `synthesize(...)` signature remains unchanged.

- [ ] **Step 1: Write failing provider-boundary tests**

Mark the module with `pytestmark = pytest.mark.provider_boundary` and register that marker in `pyproject.toml` if absent. The fast-first-run plan permits marked adapter tests while their external boundaries are mocked. Mock the Edge `Communicate`, Kokoro class, and ElevenLabs `httpx.post` boundaries. Assert:
- Alex/Sam resolve to the exact Edge voices in the spec; full Neural names and `TTS_VOICE_ALEX`/`TTS_VOICE_SAM` overrides win.
- `excited` reaches Edge as `rate="+5%", pitch="+2Hz"`, Kokoro as `speed=1.05`, and ElevenLabs with expressive settings from the spec.
- `deadpan` uses `-3%`, `-2Hz`, and the spec's exact `0.97` Kokoro speed.
- Unknown emotion uses all neutral values.
- Two Kokoro syntheses with the same model paths construct one cached engine.
- No provider call changes audio after synthesis.

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd mcp-server && uv sync --locked --extra dev && uv run --no-sync pytest -q tests/test_tts_provider.py`
Expected: FAIL because emotion is ignored, old Edge mapping remains, and Kokoro reconstructs its engine per line.

- [ ] **Step 3: Implement direction and voice resolution**

Add the exact preset table from the spec. Pass Edge rate/pitch into `Communicate`, Kokoro speed into `create`, and ElevenLabs stability/style into the request's `voice_settings`. Resolve environment overrides server-side. Cache Kokoro construction with a small bounded cache keyed by model/voice paths; preserve final duration probing in callers.

- [ ] **Step 4: Make real speech the default and correct documentation**

Change Compose's default to `edge`. Document voice overrides, network requirements, and `synthetic_demo` as test-only. Replace the hero's absolute privacy claim with: local code/diff analysis and rendering; selected cloud TTS providers receive generated dialogue text, while Kokoro keeps speech generation local.

- [ ] **Step 5: Run provider and regression checks**

Run: `cd mcp-server && uv run --no-sync pytest -q && cd .. && docker compose config && bun run test && bun run build`
Expected: tests/build PASS; Compose resolves Edge unless explicitly overridden; no provider unit test performs network access.

- [ ] **Step 6: Commit**

```bash
git add mcp-server/src/tts_provider.py mcp-server/pyproject.toml mcp-server/tests/test_tts_provider.py docker-compose.yml src/components/showcase/HeroSection.tsx mcp-server/README.md src/routes/setup.tsx
git commit -m "feat: direct neural voices with emotion presets" -m "Co-Authored-By: Kimi <noreply@anthropic.com>"
```

### Task 3: Rewrite and Re-record Both Demo Scenarios

**Files:**
- Modify: `src/lib/demoDialogue.ts`
- Modify: `src/lib/demoSpeech.ts`
- Modify: `src/lib/demoScenario.ts:140-166`
- Create: `scripts/export-demo-dialogue.ts`
- Create: `mcp-server/scripts/generate_demo_dialogue.py`
- Modify: `.gitignore`
- Replace through Lovable: `src/assets/dialogue/*.mp3.asset.json`
- Test: `src/test/demo-speech.test.ts`

**Interfaces:**
- Consumes: Task 1's `DEMO_DIALOGUE` and Task 2's `synthesize`/`resolve_voice` direction layer.
- Produces: 13 final MP3s; registry entries `{ url, duration_ms, spoken_text, provider: "edge", provider_voice_id }`; candidate duration manifest under ignored `artifacts/demo-dialogue/`.

- [ ] **Step 1: Apply the exact rewrite and write the failing freshness test**

Copy all caption text, spoken text, emotions, initial overlaps, and the stem-06 pager move from the spec. Extend `demo-speech.test.ts` to require `provider` and `provider_voice_id`, exact equality between each new raw `spoken_text` and its registry transcript, and final positive durations.

- [ ] **Step 2: Run the freshness test to verify it fails**

Run: `bun run test -- src/test/demo-speech.test.ts`
Expected: FAIL because registry transcripts and provenance still describe the old recordings.

- [ ] **Step 3: Add repeatable candidate generation**

Make `scripts/export-demo-dialogue.ts` print only `JSON.stringify(DEMO_DIALOGUE)`. Make the Python generator read that JSON from stdin, synthesize each line by scenario/stem ID through `tts_provider.synthesize`, probe each returned clip, and write candidate files plus a JSON report containing key, spoken text, provider, resolved voice, and duration. Ignore `artifacts/demo-dialogue/`.

- [ ] **Step 4: Generate all 13 candidates with real Edge speech**

Run: `bun scripts/export-demo-dialogue.ts | uv --directory mcp-server run --no-sync python -m scripts.generate_demo_dialogue --output-dir ../artifacts/demo-dialogue`
Expected: 13 nonempty MP3s and 13 report rows; no `synthetic_demo`, oscillator audio, missing line, or placeholder duration.

- [ ] **Step 5: Audition candidates before publishing**

Listen to both full sequences at normal speed. Confirm Alex/Sam contrast, intelligible pronunciation, and natural reactions; adjust only raw spoken text, synthesis presets, or per-line overlaps and regenerate affected clips. Do not stretch audio. Record any remaining limitation honestly.

- [ ] **Step 6: Publish final clips and measure remote artifacts**

Upload the final MP3s through Lovable's asset flow and replace all 13 asset references there. For each final remote URL, run `ffprobe -v error -show_entries format=duration -of csv=p=0 <url>`; set `duration_ms` to rounded container seconds × 1000 and copy exact generation transcript/provider/voice into `DEMO_SPEECH`. Never point rewritten text at an old URL.

- [ ] **Step 7: Verify timing, trace, and full application**

Run: `bun run test -- src/test/demo-speech.test.ts && bun run test && bun run lint && bun run build`
Expected: PASS for all 13 stems; starts derive from final durations; SFX request offsets match playback; no speech `playbackRate` override exists.

- [ ] **Step 8: Audition the published demo**

Play both hosted scenarios end to end. Confirm captions match audible meaning, no important word is clipped by overlap, pager follows stem 06, and no old recording remains. If this pass cannot be performed, mark the task incomplete rather than claiming naturalness.

- [ ] **Step 9: Commit**

```bash
git add src/lib/demoDialogue.ts src/lib/demoSpeech.ts src/lib/demoScenario.ts src/test/demo-speech.test.ts scripts/export-demo-dialogue.ts mcp-server/scripts/generate_demo_dialogue.py .gitignore src/assets/dialogue
git commit -m "feat: rerecord demo with sharper host dialogue" -m "Co-Authored-By: Kimi <noreply@anthropic.com>"
```

### Task 4: Diff-Specific Live Scripts and Spoken Text

**Files:**
- Modify: `mcp-server/src/scriptwriter.py:20-93`
- Modify: `mcp-server/src/models.py:13-23`
- Modify: `mcp-server/src/episodes.py:21-30`
- Modify: `mcp-server/src/server.py:61-95,109-123,173-181`
- Modify: `src/lib/setupPrompt.ts:35-36`
- Modify: `src/lib/demoScenario.ts:213-220`
- Test: `mcp-server/tests/test_local_studio.py`
- Test: `mcp-server/tests/test_dsp_pipeline.py`
- Test: `src/test/demo-speech.test.ts`

**Interfaces:**
- Consumes: Task 2's directed `synthesize` and Task 1's optional frontend `spoken_text`.
- Produces: `Line.spoken_text: str | None = None` as the final dataclass field, `Stem.spoken_text: str | None = None`, `to_spoken_text(text: str) -> str`, and `analyze(diff)["symbols"]: list[str]`; existing callers without spoken text remain valid.

- [ ] **Step 1: Write failing writing and spoken-text tests**

Using the existing lock diff, assert the explainer mentions `acquire`, all formats omit `the logic is updated`, and a no-risk diff never claims `contained` or `Small, honestly`. Assert `to_spoken_text("Update _LOCKS in lock.py; watch p99")` produces readable spoken text with `locks`, `lock dot py`, and `p ninety nine`. Mock synthesis and prove `spoken_text` reaches TTS while `text` remains the caption; omitting it synthesizes `text`. Prove each measured duration still determines the next start.

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd mcp-server && uv run --no-sync pytest -q tests/test_local_studio.py tests/test_dsp_pipeline.py`
Expected: FAIL on generic copy, missing symbols/spoken-text fields, and missing pronunciation normalization.

- [ ] **Step 3: Implement factual deterministic drafts**

Extract added/removed Python function names into `analyze()["symbols"]`. Rewrite stock lines to use concrete files, symbols, risks, and test presence, with one idea per stem and short reactions. For unknown risk/blast radius, explicitly say the diff is insufficient to establish it. Preserve roast/explainer/postmortem formats, host names, intensity, length, SFX, and overlap interfaces.

- [ ] **Step 4: Propagate spoken text through both generation paths**

Add optional fields without reordering existing positional arguments. Default `Line.spoken_text` through `to_spoken_text(text)` when absent. In `episodes.build_session` and `append_dialogue_stem`, synthesize `spoken_text or text`, store both, and retain immediate `probe_duration_ms`. Parse optional `spoken_text` in `submit_script` using keyword arguments. Now that the server accepts it, include `spoken_text ?? text` in demo trace append requests and extend `src/test/demo-speech.test.ts` to assert it while captions retain `text`.

- [ ] **Step 5: Improve agent showrunner instructions**

Require changed symbols/behavior, short reaction lines, callbacks grounded in the input, purposeful rather than mandatory interruptions, natural caption `text`, and optional pronunciation-only `spoken_text`. Forbid invented outcomes and stock filler. Keep 8–14 lines as guidance, not a reason to pad generic copy.

- [ ] **Step 6: Run all regression checks**

Run: `cd mcp-server && TTS_PROVIDER=edge uv run --no-sync pytest -q && cd .. && bun run test && bun run build`
Expected: PASS; inherited Edge configuration still uses test isolation; no network request occurs; generated manifests expose both text fields.

- [ ] **Step 7: Smoke-test one real local episode**

Generate a short roast with Edge from the lock-diff fixture, inspect its manifest, and listen to the master. Confirm changed symbols are audible, captions remain natural, direction is applied, and measured clip lengths drive placement. Keep this networked check separate from unit tests.

- [ ] **Step 8: Commit**

```bash
git add mcp-server/src/scriptwriter.py mcp-server/src/models.py mcp-server/src/episodes.py mcp-server/src/server.py mcp-server/tests/test_local_studio.py mcp-server/tests/test_dsp_pipeline.py src/lib/setupPrompt.ts src/lib/demoScenario.ts src/test/demo-speech.test.ts
git commit -m "feat: make local scripts specific and speakable" -m "Co-Authored-By: Kimi <noreply@anthropic.com>"
```
