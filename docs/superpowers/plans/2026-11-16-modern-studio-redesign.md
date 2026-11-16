# Modern Studio Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the visual and interaction design of `/` and `/setup` as a fast, cinematic OLED broadcast studio while preserving all audio, generation, networking, and setup behavior.

**Architecture:** Keep `Index` as the playback/mode owner and existing scenario/engine/API modules unchanged. Extract small presentational rack components shared by online and local modes, use existing Radix primitives for accessible dialogs/tabs, and implement motion with Tailwind CSS plus existing canvas/SVG.

**Tech Stack:** React 19, TanStack Start, Tailwind CSS v4, Radix UI, Lucide, Vitest, Testing Library, Canvas/SVG.

**Spec:** `docs/superpowers/specs/2026-11-16-modern-studio-redesign-design.md`

## Global Constraints

- Do not modify `src/lib/webAudioEngine.ts`, `src/lib/localStudio.ts`, `src/lib/demoScenario.ts`, or `src/lib/github.ts`.
- Preserve `?mode=demo|online|offline`; omitted/invalid mode remains `picker`, and only the active mode probes a server.
- Preserve scroll IDs `inspector`, `daw`, `studio`, `local-studio`, and `connect`.
- Use chassis `#0A0B0E`, rack `#12141A`, border `#1E222D`, amber `#FFB300`, Alex `#00F2FE`, Sam `#00E676`, and coral `#FF3366`.
- Use Space Grotesk and JetBrains Mono; add no fonts, animation frameworks, 3D libraries, video runtime, or other runtime dependencies.
- No fabricated telemetry, progress, waveform measurements, export links, or AI analysis.
- Picker mode shows a non-playing DAW preview; only its explicit Play action may activate and start the demo.
- Picker/demo header reads **“Prerecorded demo · no server”** with neutral status.
- Ducking and mastering activate/complete together during the real server `mixing` step.
- Every new raster asset must be responsive, compressed, and at most 250KB; the preferred backdrop is CSS only.
- Preserve all setup commands, configuration values, paths, and client names verbatim.
- Do not rewrite published git history or edit Lovable-managed generated files, migrations, or secrets.

## Review Focus

- Unknown server step strings: show real raw status without inventing a completed stage; pinned by Task 2's unknown-step test.
- Diff headers and empty diffs: do not count `+++`/`---` as changes or emit signals from removed lines; pinned by Task 2's diff tests.
- Zero-duration timelines and keyboard extremes: seek only within `[0, duration]`, never produce `NaN`; pinned by Task 6's keyboard tests.
- Picker/demo networking and playback: no server probe and no playback before explicit preview Play; pinned by Task 4's visibility tests and Task 11's manual mode-isolation check.
- Long diffs/JSON at 390px: contain overflow inside their panels; pinned by Task 11's responsive browser check.

---

### Task 1: OLED Studio Design Tokens

**Files:**
- Modify: `src/styles.css`
- Test: `src/test/studioTheme.test.ts`

**Interfaces:**
- Produces: existing Tailwind color utilities plus `--color-coral`, `.rack-panel`, `.signal-led`, `.hardware-button`, and reduced-motion global rules for all later tasks.

- [ ] **Step 1: Write the failing theme contract test**

Read `src/styles.css` with `readFileSync` and assert it contains each exact palette value, `@media (prefers-reduced-motion: reduce)`, and the four shared utility names.

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun run test -- src/test/studioTheme.test.ts`
Expected: FAIL on missing palette tokens/utilities.

- [ ] **Step 3: Implement the studio theme**

Replace the current generic orange/card treatment with the exact OLED tokens. Keep existing shadcn variable mappings compatible; map `--primary` to amber, `--alex` to cyan, `--sam` to mint, and expose coral for SFX/ducking. Build utilities with 1px borders, `border-t-white/10` specular highlights, focused glows, tactile active states, and visible `:focus-visible` rings. Add only transform/opacity ambient keyframes and disable nonessential animation/smooth scrolling under reduced motion.

- [ ] **Step 4: Verify the theme and existing suite**

Run: `bun run test -- src/test/studioTheme.test.ts && bun run build`
Expected: theme test PASS and production build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/styles.css src/test/studioTheme.test.ts
git commit --trailer "Co-Authored-By: Claude Code <noreply@anthropic.com>" -m "feat: add OLED studio design tokens"
```

### Task 2: Shared Rack and Presentation Components

**Files:**
- Create: `src/lib/episodePresentation.ts`
- Create: `src/components/showcase/GenerationProgress.tsx`
- Create: `src/components/showcase/CopyButton.tsx`
- Create: `src/components/showcase/DiffView.tsx`
- Create: `src/components/showcase/FormatCards.tsx`
- Test: `src/test/episodePresentation.test.ts`
- Test: `src/test/sharedStudioComponents.test.tsx`

**Interfaces:**
- Produces: `export type GenerationStage` and `generationStages(job: Pick<Episode, "step" | "status">): GenerationStage[]`, where stage IDs are `scripting | voices | ducking | mastering` and states are `pending | active | complete | failed`.
- Produces: `diffStats(diff: string): { additions: number; deletions: number }` and `diffSignals(diff: string): { id: string; label: string }[]`.
- Produces: `<GenerationProgress job={Episode} masterUrl?: string />`, `<CopyButton text={string} label?: string className?: string />`, `<DiffView diff={string} maxLines?: number showSignals?: boolean />`, and `<FormatCards value={EpisodeFormat} onChange={(value: EpisodeFormat) => void} />`.

- [ ] **Step 1: Write failing pure presentation tests**

Cover this exact mapping: `scripting` activates only scripting; `voices` completes scripting; `mixing` activates both ducking and mastering; `done` or `COMPLETED` completes all four; `FAILED` marks the current real stage failed; an unknown step leaves all visual stages pending. Assert `diffStats("+++ b/a.ts\n--- a/a.ts\n+one\n-two")` equals `{ additions: 1, deletions: 1 }`, empty diff returns zeroes, and signals inspect added lines only.

- [ ] **Step 2: Write failing shared-component tests**

Mock `navigator.clipboard.writeText`. Assert CopyButton announces `Copied` after success and `Copy failed` after rejection. Assert FormatCards renders exactly `roast`, `explainer`, and `postmortem` choices and calls `onChange`. Assert DiffView caps lines at `maxLines` and exposes additions/deletions through text/classes, not color alone.

- [ ] **Step 3: Run tests to verify they fail**

Run: `bun run test -- src/test/episodePresentation.test.ts src/test/sharedStudioComponents.test.tsx`
Expected: FAIL because the modules do not exist.

- [ ] **Step 4: Implement the shared presentation units**

Map the server's three working steps to four visual stages without timers. Display an unrecognized `job.step` verbatim above the rack while leaving all visual stages pending. Use the existing loudness copy `-16 LUFS`; show queue position only for a truthy `job.queue_position`, and render an MP3 link only for a supplied `masterUrl`. Detect only conservative added-line signals for `console.log`, `debugger`, and skipped tests; label them “signals.” Use native buttons/details, Lucide icons, status roles, and no JSON/diff syntax dependency.

- [ ] **Step 5: Run tests to verify they pass**

Run: `bun run test -- src/test/episodePresentation.test.ts src/test/sharedStudioComponents.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/episodePresentation.ts src/components/showcase/GenerationProgress.tsx src/components/showcase/CopyButton.tsx src/components/showcase/DiffView.tsx src/components/showcase/FormatCards.tsx src/test/episodePresentation.test.ts src/test/sharedStudioComponents.test.tsx
git commit --trailer "Co-Authored-By: Claude Code <noreply@anthropic.com>" -m "feat: add shared broadcast rack components"
```

### Task 3: Broadcast Header and Cinematic Mode Deck

**Files:**
- Create: `src/components/showcase/StudioHeader.tsx`
- Modify: `src/components/showcase/HeroSection.tsx`
- Test: `src/test/studioHeaderHero.test.tsx`

**Interfaces:**
- Produces: `type HeaderStatus = { tone: "neutral" | "busy" | "connected" | "offline"; label: string; detail?: string }` and `<StudioHeader status={HeaderStatus} />`.
- Consumes: existing `<Dialog>` primitives and unchanged `HeroSection` props `{ mode, onMode, onWarmOnline }`.

- [ ] **Step 1: Write failing header/hero interaction tests**

Assert neutral status does not contain “offline”; the headline is exactly `Turn Code Diffs into Broadcast Podcasts.`; all three mode buttons call `onMode` with their existing mode key; opening an agent config exposes `role="dialog"`, Escape closes it, and focus returns to its trigger.

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun run test -- src/test/studioHeaderHero.test.tsx`
Expected: FAIL on missing header/headline/dialog semantics.

- [ ] **Step 3: Implement the header and hero**

Create the compact hardware header with real status text/detail, brand link, GitHub link, `/setup` link, and a link to the existing audio-spec section only if a real target exists. Rebuild HeroSection with CSS-only moody studio lighting, the exact headline, free creation copy, three routing cards, and restrained staggered entrances. Replace the hand-built modal with the existing Radix Dialog components and preserve `AGENTS` configuration content and warm-online hover/focus behavior.

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun run test -- src/test/studioHeaderHero.test.tsx`
Expected: PASS, including focus return.

- [ ] **Step 5: Commit**

```bash
git add src/components/showcase/StudioHeader.tsx src/components/showcase/HeroSection.tsx src/test/studioHeaderHero.test.tsx
git commit --trailer "Co-Authored-By: Claude Code <noreply@anthropic.com>" -m "feat: redesign studio header and mode deck"
```

### Task 4: Route Composition and Picker DAW Preview

**Files:**
- Create: `src/lib/studioMode.ts`
- Modify: `src/routes/index.tsx`
- Test: `src/test/studioMode.test.ts`

**Interfaces:**
- Produces: `studioVisibility(mode: Mode, hasLiveEpisode: boolean): { showDaw: boolean; showTelemetry: boolean }`.
- Extends: `MultiTrackDaw` receives optional `masterUrl?: string | null` and `preview?: boolean`; SidechainVisualizer and FiltergraphDiagram receive `playing={playing}` in Task 7.
- Produces internally: `activateMode(next: Mode, playDemo?: boolean)` and `liveMasterUrl: string | null`.

- [ ] **Step 1: Write failing visibility tests**

Assert picker returns `{ showDaw: true, showTelemetry: false }`; demo returns both true; online/offline without an episode return both false; either mode with a completed loaded episode returns both true.

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun run test -- src/test/studioMode.test.ts`
Expected: FAIL because `studioVisibility` is absent.

- [ ] **Step 3: Recompose the home route**

Render StudioHeader from actual mode/connection state without adding probes. Use `studioVisibility` to render only the DAW in picker and full inspector/DAW/DSP in demo or after live load. Preserve engine ownership and callbacks. Remove automatic playback from ordinary demo-mode selection; only picker preview Play calls `activateMode("demo", true)`. In `loadEpisode`, set `liveMasterUrl` with `createApi(base ?? LOCAL_URL).masterUrl(ep.id)`; clear it in `activateMode` and when selecting a built-in scenario, not in the live-scenario initialization effect. Replace smooth-scroll calls with a helper that uses `behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth"`.

- [ ] **Step 4: Verify mode behavior and regressions**

Run: `bun run test -- src/test/studioMode.test.ts src/test/app-routing.test.tsx src/test/demo-speech.test.ts`
Expected: PASS with unchanged speech/engine tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/studioMode.ts src/routes/index.tsx src/test/studioMode.test.ts
git commit --trailer "Co-Authored-By: Claude Code <noreply@anthropic.com>" -m "feat: add cinematic picker studio preview"
```

### Task 5: Online GitHub Ingestion Console

**Files:**
- Modify: `src/components/showcase/GitHubStudioPanel.tsx`
- Modify: `src/routes/index.tsx`
- Test: `src/test/githubStudioPanel.test.tsx`

**Interfaces:**
- Consumes: Task 2 shared rack components and real `GhItem`, `Episode`, `cloudApi`, `parseRepo`, `listItems`, and `fetchDiff` contracts.
- Extends: props with optional `onBusyChange?: (busy: boolean) => void` for header activity only; polling and `onLoad(ep, cloudApi.base)` remain unchanged.

- [ ] **Step 1: Write failing ingestion tests**

Mock `@/lib/github` and `@/lib/localStudio`. Assert invalid input shows the existing guidance without calling `listItems`; Ctrl+Enter and Meta+Enter on the repository input each invoke the same load path as submit; format selection updates `aria-pressed`; Generate remains disabled without a nonempty diff; a fetched diff exposes a disclosure and real addition/deletion totals.

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun run test -- src/test/githubStudioPanel.test.tsx`
Expected: FAIL on keyboard shortcuts, disclosure, and diff totals.

- [ ] **Step 3: Implement the ingestion console**

Retain all state, effects, request bodies, and polling. Restyle repository fetch, existing commit/PR choices as a scrollable ledger using only `GhItem` data, FormatCards, length control, and Generate action. Use DiffView inside an accessible disclosure and derive stats/signals from the selected diff. Replace local step pills with GenerationProgress; retain queue/error/retry and the real cloud master URL. Notify `onBusyChange` on busy transitions and cleanup without lifting job ownership. Wire the online panel callback into Index's header status and reset that presentational busy state on mode changes.

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun run test -- src/test/githubStudioPanel.test.tsx src/test/sharedStudioComponents.test.tsx`
Expected: PASS and no GitHub/API module edits.

- [ ] **Step 5: Commit**

```bash
git add src/components/showcase/GitHubStudioPanel.tsx src/routes/index.tsx src/test/githubStudioPanel.test.tsx
git commit --trailer "Co-Authored-By: Claude Code <noreply@anthropic.com>" -m "feat: redesign GitHub ingestion console"
```

### Task 6: Multitrack Broadcast DAW

**Files:**
- Modify: `src/components/showcase/MultiTrackDaw.tsx`
- Modify: `src/routes/index.tsx`
- Test: `src/test/multiTrackDaw.test.tsx`

**Interfaces:**
- Consumes: all existing DAW props/callbacks plus optional `masterUrl?: string | null` and `preview?: boolean` from Task 4.
- Produces: keyboard timeline slider with ArrowLeft/ArrowRight = 100ms, Shift+Arrow = 1000ms, Home/End boundaries; unchanged `onSeek(ms)` callback.

- [ ] **Step 1: Write failing transport and keyboard tests**

Render with a mocked engine and `duration={10_000}`. Assert ArrowRight at zero calls `onSeek(100)`, Shift+ArrowRight calls `onSeek(1000)`, End calls `onSeek(10_000)`, and a zero-duration timeline never emits `NaN`. Assert mute/solo expose `aria-pressed`, canvas has an accessible BGM envelope label, and no Export link appears when `masterUrl` is absent.

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun run test -- src/test/multiTrackDaw.test.tsx`
Expected: FAIL on slider semantics, canvas label, and toggle states.

- [ ] **Step 3: Implement the broadcast DAW**

Keep scenario timing, lane order, ducking calculation, levels, mute/solo, and seek callbacks. Build the metallic transport with Lucide Play/Pause/Square/Repeat icons, dual real timecode, real VU values, and Export only for a real master URL. Pass `masterUrl` and `preview` from Index. Add a focused playhead/cue ruler with pointer and keyboard seeking, backlit 44px mute/solo controls, text alternatives, and responsive horizontal scrolling. Drive a restrained rack glow from the existing real level values only during playback. Keep waveform bars explicitly decorative and derive placement/width from real stem timing; do not claim measured amplitude. Add the optional preview label without changing transport callback behavior.

- [ ] **Step 4: Verify DAW and audio regressions**

Run: `bun run test -- src/test/multiTrackDaw.test.tsx src/test/demo-speech.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/showcase/MultiTrackDaw.tsx src/routes/index.tsx src/test/multiTrackDaw.test.tsx
git commit --trailer "Co-Authored-By: Claude Code <noreply@anthropic.com>" -m "feat: rebuild accessible multitrack DAW"
```

### Task 7: DSP Scope and Real Filtergraph Flow

**Files:**
- Modify: `src/components/showcase/SidechainVisualizer.tsx`
- Modify: `src/components/showcase/FiltergraphDiagram.tsx`
- Modify: `src/routes/index.tsx`
- Test: `src/test/dspVisualizers.test.tsx`

**Interfaces:**
- Extends: `SidechainVisualizer({ scenario, positionMs, playing }: { scenario: Scenario; positionMs: number; playing: boolean })`.
- Extends: `FiltergraphDiagram({ filterComplex, playing }: { filterComplex: string; playing: boolean })`.
- Produces: `filterExcerpt(filterComplex: string, filterName: string): string | null` for displaying actual matching filter chains.

- [ ] **Step 1: Write failing DSP tests**

Assert `filterExcerpt` returns the chain containing a custom real sidechain ratio and `null` for an absent filter. Assert both canvases/diagrams have text alternatives, node selection works on click and focus, and `playing={false}` exposes no active signal-pulse state.

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun run test -- src/test/dspVisualizers.test.tsx`
Expected: FAIL on new props/helper/accessibility states.

- [ ] **Step 3: Implement the scope and signal flow**

Restyle the existing six-second ducking scope as a hardware analyzer using `duckingAt`; label values as scenario-derived and avoid analyser claims. Redraw from shared position only while visible/playing, retaining a static paused frame and resize handling. Turn filter nodes into connected rack modules with actual excerpts from the supplied filterComplex, keyboard-selected details, subdued edges, and optional playback pulses. Preserve the full generated filtergraph in a scrollable disclosure and pass `playing` from Index.

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun run test -- src/test/dspVisualizers.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/showcase/SidechainVisualizer.tsx src/components/showcase/FiltergraphDiagram.tsx src/routes/index.tsx src/test/dspVisualizers.test.tsx
git commit --trailer "Co-Authored-By: Claude Code <noreply@anthropic.com>" -m "feat: redesign DSP scope and filtergraph"
```

### Task 8: Synchronized Protocol Inspector

**Files:**
- Create: `src/components/showcase/JsonTree.tsx`
- Modify: `src/components/showcase/McpProtocolInspector.tsx`
- Test: `src/test/mcpProtocolInspector.test.tsx`

**Interfaces:**
- Produces: `<JsonTree value={unknown} name?: string />` using native collapsible object/array nodes and syntax-colored primitives.
- Consumes: Task 2 CopyButton/DiffView and all existing inspector props/callbacks.

- [ ] **Step 1: Write failing inspector tests**

Select a packet and assert request/response labels appear, object nodes collapse/expand, and CopyButton receives the selected packet JSON. Assert selecting a packet still calls `onSelect` with the original object and started mode shows only packets at or before `positionMs`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun run test -- src/test/mcpProtocolInspector.test.tsx`
Expected: FAIL on collapsible JSON and copy behavior.

- [ ] **Step 3: Implement the telemetry inspector**

Preserve packet timing, scenario/custom-diff controls, selection, and DAW highlighting. Replace raw pre blocks with bounded JsonTree panels and copy actions for request/response JSON. Reuse DiffView, add real message count/status, contained scrolling, `min-w-0` mobile constraints, and clear selected-packet styling.

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun run test -- src/test/mcpProtocolInspector.test.tsx src/test/sharedStudioComponents.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/showcase/JsonTree.tsx src/components/showcase/McpProtocolInspector.tsx src/test/mcpProtocolInspector.test.tsx
git commit --trailer "Co-Authored-By: Claude Code <noreply@anthropic.com>" -m "feat: add collapsible protocol telemetry"
```

### Task 9: Offline Studio and Connection Workflow

**Files:**
- Modify: `src/components/showcase/LocalStudioPanel.tsx`
- Modify: `src/components/showcase/SetupPromptCard.tsx`
- Modify: `src/routes/index.tsx`
- Test: `src/test/offlineStudio.test.tsx`

**Interfaces:**
- Consumes: Task 2 shared rack components and unchanged local API/connection types.
- Extends: `LocalStudioPanel` props with optional `onBusyChange?: (busy: boolean) => void`; `ConnectionStatus({ conn })` remains available for StudioHeader.

- [ ] **Step 1: Write failing offline workflow tests**

Assert disconnected state retains the localhost guidance and `/setup` path, source/format controls keep their existing values, SetupPromptCard exposes labelled groups rather than orphaned tablists, and completed jobs retain real download/improve actions.

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun run test -- src/test/offlineStudio.test.tsx src/test/setupPrompt.test.ts`
Expected: new UI assertions FAIL; existing prompt-generation tests remain PASS.

- [ ] **Step 3: Implement the offline rack**

Preserve every effect, request, polling interval, history action, and setup prompt string. Restyle connection/source/commit/format/preview/history regions with shared rack components and GenerationProgress. Convert SetupPromptCard segmented choices to labelled groups with `aria-pressed`, reuse CopyButton, and notify busy state without changing job ownership. Wire the local panel callback into the same Index header busy state used by online mode.

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun run test -- src/test/offlineStudio.test.tsx src/test/setupPrompt.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/showcase/LocalStudioPanel.tsx src/components/showcase/SetupPromptCard.tsx src/routes/index.tsx src/test/offlineStudio.test.tsx
git commit --trailer "Co-Authored-By: Claude Code <noreply@anthropic.com>" -m "feat: redesign offline broadcast workflow"
```

### Task 10: Matching Accessible Setup Guide

**Files:**
- Modify: `src/routes/setup.tsx`
- Test: `src/test/setupPage.test.tsx`

**Interfaces:**
- Consumes: StudioHeader, CopyButton, existing Radix Tabs, `OSES`, `getAgents`, `prereqSteps`, and setup command constants.

- [ ] **Step 1: Write failing setup navigation tests**

Render the route and assert the existing Kokoro commands remain visible, OS/agent selection is keyboard navigable, each tab has an associated tabpanel, code blocks expose copy actions, and the back-to-studio link remains present.

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun run test -- src/test/setupPage.test.tsx src/test/setupKokoro.test.tsx`
Expected: new semantics assertions FAIL; content assertions remain PASS.

- [ ] **Step 3: Implement the setup design**

Apply StudioHeader with `{ tone: "neutral", label: "Local setup guide" }` and a numbered rack journey for install, connect, use, and optional material. Preserve all existing text/commands. Use Radix Tabs with roving keyboard focus and associated panels for agent choices; use labelled groups where a selection changes the whole guide rather than tab content. Reuse CopyButton with failure feedback and constrain code overflow at mobile widths.

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun run test -- src/test/setupPage.test.tsx src/test/setupKokoro.test.tsx src/test/setupPrompt.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/routes/setup.tsx src/test/setupPage.test.tsx
git commit --trailer "Co-Authored-By: Claude Code <noreply@anthropic.com>" -m "feat: redesign accessible MCP setup guide"
```

### Task 11: Whole-Product Verification and Polish

**Files:**
- Modify only files needed to fix verified regressions from the preceding tasks.
- Review: `docs/superpowers/specs/2026-11-16-modern-studio-redesign-design.md`

**Interfaces:**
- Consumes: every prior task; produces no new public API.

- [ ] **Step 1: Prove protected modules and dependencies are unchanged**

Run: `git diff --exit-code -- src/lib/webAudioEngine.ts src/lib/localStudio.ts src/lib/demoScenario.ts src/lib/github.ts package.json bun.lock`
Expected: exit 0 with no diff.

- [ ] **Step 2: Run the complete automated gate**

Run: `bun run test && bun run lint && bun run build`
Expected: all tests PASS, lint exits 0, production build succeeds without new heavy visual chunks.

- [ ] **Step 3: Check both routes at all required sizes**

Run the production app and inspect `/` and `/setup` at 1440px, 1024px, and 390px. Verify no page-wide horizontal overflow, readable channel labels, contained diff/JSON/code scrolling, 44px primary touch targets, stable asset layout, and primary controls visible before decorative detail on mobile.

- [ ] **Step 4: Check real interaction and performance**

Verify keyboard-only dialog/tab/timeline operation, reduced motion, no picker/demo server requests, online never contacting localhost, explicit preview Play, playback pause/stop/seek/loop/mute/solo, inspector highlighting, online/local generation progress, real MP3 links, and no decorative offscreen animation. Record any unchecked live-server dependency explicitly instead of claiming it passed.

- [ ] **Step 5: Review and commit final fixes**

Compare the result against every spec section. Commit only verified regression fixes, then rerun Step 2.

```bash
git add src
git commit --trailer "Co-Authored-By: Claude Code <noreply@anthropic.com>" -m "fix: polish studio responsiveness and accessibility"
```
