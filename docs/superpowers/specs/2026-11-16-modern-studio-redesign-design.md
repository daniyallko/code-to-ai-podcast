# Modern Studio Redesign Design

Date: 2026-11-16

## Intent

Redesign **Code To AI Podcast** so a visitor understands within ten seconds that they can create a podcast from code for free, and that the creator has strong design, AI, and audio-engineering craft.

The product itself must provide that proof. The site will feel like a creative, moody broadcast studio built into a precise developer tool, not a generic AI SaaS landing page.

The redesign covers both routes:

- `/`: the complete home studio and its demo, online, and offline modes.
- `/setup`: the installation and client-connection guide.

## Selected visual reference

Use the MotionSites **Murmur Podcast** reference as a directional reference, not a template to copy:

- Cinematic depth and atmospheric lighting.
- A focused, glowing episode-player composition.
- Staggered entrances and layered ambient motion.
- Clear podcast identity.

Adapt those qualities to a **moody broadcast studio**. Do not use Murmur's branding, fictional episode content, purple-glass SaaS treatment, or large autoplay background video.

Reference: https://motionsites.ai/?prompt=murmur

## Goals

1. Communicate “Turn Code Diffs into Broadcast Podcasts” and the free creation workflow immediately.
2. Make the working multitrack DAW the visual and interactive centerpiece.
3. Expose the real AI, JSON-RPC, FFmpeg, sidechain-ducking, and mastering pipeline in a way that feels understandable and crafted.
4. Give online, demo, and offline modes one coherent studio interface while preserving their separate networking behavior.
5. Carry the same visual system through `/setup` without changing its instructions.
6. Remain fast, responsive, accessible, and smooth at 1440px, 1024px, and 390px.

## Non-goals and anti-goals

- No changes to the audio graph, speech timing, scenario derivation, server endpoints, API payloads, or generation behavior.
- No new backend, authentication, database, payment, analytics, or account system.
- No generic purple-gradient AI branding, buzzword pills, ornamental glass cards, or fake telemetry.
- No heavy WebGL/3D runtime, large autoplay video, or animation framework solely for decoration.
- No separate marketing mockup disconnected from the actual studio.
- No fabricated server capacity, latency, levels, queue state, export availability, or AI detections.
- No rewrite of published git history.

## Hard preservation constraints

### Audio and shared data

- Keep `src/lib/webAudioEngine.ts` functionally intact, including `StudioEngine`, `TrackKey`, `TRACKS`, scheduling, mixing, seeking, looping, `levels()`, and `duckingAt` behavior.
- Keep `src/lib/demoScenario.ts` as the shared source for demo dialogue, durations, traces, filtergraphs, and ducking curves.
- Preserve caption text versus pronunciation-only `spoken_text` separation and measured audio placement.
- Preserve live-episode conversion through `episodeToScenario`.
- Reuse the existing DAW, inspector, and visualizers for demo and completed live episodes.

### Networking and modes

- Keep `cloudApi`, `localApi`, `useLocalServer`, `useCloudServer`, `warmCloud`, and all endpoint contracts intact.
- Preserve `?mode=demo|online|offline`; omitted or invalid mode remains `picker`.
- Only the active mode may probe its server. Online mode must never touch localhost.
- Do not keep inactive mode panels mounted merely to animate them.
- Preserve existing scroll target IDs: `inspector`, `daw`, `studio`, `local-studio`, and `connect`.

### Component contracts

Redesign these existing modules rather than replacing the product architecture:

- Inline header in `src/routes/index.tsx` (it may be extracted into a presentational component).
- `HeroSection.tsx`
- `GitHubStudioPanel.tsx`
- `LocalStudioPanel.tsx` and `SetupPromptCard.tsx`
- `MultiTrackDaw.tsx`
- `SidechainVisualizer.tsx`
- `FiltergraphDiagram.tsx`
- `McpProtocolInspector.tsx`
- `src/routes/setup.tsx`

Existing props and callbacks may be wrapped or extended for presentation, but current behavior must remain intact.

## Design system

### Palette

Use Tailwind CSS v4 tokens in `src/styles.css`:

- Chassis: `#0A0B0E`.
- Rack/panel surface: `#12141A`.
- Border: `#1E222D`.
- Broadcast amber: `#FFB300`.
- Alex cyan: `#00F2FE`.
- Sam mint: `#00E676`.
- SFX/ducking coral: `#FF3366`.

Use specular 1px highlights such as `border-t-white/10` and restrained, focused signal glows. Avoid general-purpose gray drop shadows.

The cinematic opening may use muted indigo and warm amber atmospheric lighting derived from Murmur, but the working console uses the OLED palette above.

### Typography

- Display and headings: Space Grotesk, tight tracking.
- Data, timecodes, commit SHAs, and protocol traces: JetBrains Mono with tabular numbers.
- Keep the existing font setup and `display=swap`; do not add another font family.

### Surfaces and controls

- Panels resemble purposeful rack units with clear labels and dense but readable spacing.
- Buttons depress by 1px or use `active:scale-[0.98]`.
- Mute/solo and mode controls have unambiguous backlit states, not color alone.
- Use Lucide icons instead of decorative Unicode/emoji in new or redesigned controls. Existing SFX meaning must remain clear.
- Touch targets are at least 44×44px where space permits, especially transport and mode controls.

## Home page structure

### 1. Broadcast header

Create a compact studio top bar containing:

- Brand mark and a connection LED.
- Real connection state in online/offline modes: green when connected, amber while checking or busy, red when offline.
- In picker/demo mode, show a neutral **“Prerecorded demo · no server”** state. Do not show a misleading red offline light or probe either server.
- A monospace server chip derived from real API/status data. Show the known host and TTS provider when available; do not invent CPU or latency values.
- Links to the GitHub repository, MCP/setup documentation, and audio specification where a real existing destination is available. Do not add dead links.

On mobile, keep brand and status visible; collapse secondary links into a compact accessible menu or wrap them without obscuring the workflow.

### 2. Cinematic hero and mode deck

Headline: **“Turn Code Diffs into Broadcast Podcasts.”**

Supporting copy must state that visitors can create from a public GitHub repository for free and can try the interactive demo.

The moody broadcast-studio scene will be a lightweight composition of CSS lighting, subtle chassis/grid texture, console silhouettes, signal meters, and the real mode/player interface. No large video or 3D dependency. Decorative layers are non-interactive and hidden from assistive technology.

Use a three-channel routing switcher:

1. **ONLINE** — Zero setup; paste a public GitHub repository.
2. **INTERACTIVE DEMO** — PR Roast #402; live multitrack studio.
3. **OFFLINE / LOCAL** — Connect Cursor, Claude Desktop, Windsurf, or Cline.

The active channel has a glowing route indicator plus text/icon state. Mode changes use short transform/opacity transitions with stable layout. Reduced-motion users get immediate state changes.

Keep the existing agent picker/modal behavior, but add correct dialog semantics, focus management, Escape dismissal, and focus return.

In the default picker mode, show a non-playing demo DAW preview below the hero so the actual studio is visible immediately. Use the existing demo scenario and do not autoplay audio. Pressing Play activates `?mode=demo` and the real interactive studio; no server probe is introduced. Online/offline modes continue to show the full DAW only after a completed live episode loads.

### 3. Online ingestion console

Restyle `GitHubStudioPanel` as a single purposeful ingestion workflow:

- Repository input accepting the same inputs as today, with visible `owner/repo` / URL guidance.
- Fetch/generate action with Cmd+Enter and Ctrl+Enter keyboard support where it does not conflict with text entry.
- Existing commit/PR choices presented as a ledger with message, author, short SHA, date, and real diff statistics when available.
- Use an existing avatar if already supplied; otherwise use initials. Do not add another avatar fetch solely for decoration.
- Three tactile format cards: PR Roast, Code Explainer, Incident Postmortem, with host identity and a restrained waveform motif.
- A collapsible monospace diff peek with red deletions, green additions, and keyboard-accessible disclosure controls.

Code-smell labels are optional presentation derived locally only when a rule actually matches the displayed diff. Label them as “signals,” not authoritative AI analysis. Do not add a network analyzer or make claims without evidence.

Generation status becomes a four-stage rack:

1. Scripting with the real configured LLM/provider label when known.
2. Synthesizing neural voices.
3. FFmpeg sidechain ducking.
4. Mastering toward the existing loudness target.

Stages must reflect the existing `Episode.step`/`progress` values rather than simulated timers. The server reports `scripting`, `voices`, `mixing`, and `done`; the visual **FFmpeg sidechain ducking** and **Mastering** stages must activate and complete together during the single real `mixing` step. Show a live queue ticket only when `queue_position` exists. Preserve errors, retry, cancellation behavior if present, and final episode loading.

### 4. Multitrack DAW centerpiece

Keep the existing transport and track behavior while redesigning the console:

- Metallic play/pause control with a restrained active signal ring.
- Real `MM:SS.mmm / MM:SS.mmm` timecode using existing timing helpers.
- Loop, stop, mute, solo, seek, and audio loading/error states.
- Master volume only if an existing functional volume control is available; otherwise do not add a decorative volume slider.
- Export MP3 only when a real master URL or existing export asset is available. Do not imply demo export works without a real file.

Track order remains Alex, Sam, SFX, BGM. Each lane has a channel strip with host/track identity, color, mute, and solo. Selected/highlighted states remain connected to inspector packets.

Waveforms remain driven by real stem data or existing measured/precomputed peaks. Use canvas or SVG refs for high-frequency drawing; do not introduce per-frame decorative React state beyond the existing shared playhead mechanism.

The BGM lane visualizes the existing `duckingAt` envelope. The playhead remains precise and scrubbable. Add keyboard semantics and seeking to timeline interactions, with clear focus styling and accessible time labels.

On mobile, channel identity remains readable, controls stack, and the timeline retains horizontal scrolling rather than shrinking tracks into unusability.

### 5. DSP scope and filtergraph

`SidechainVisualizer` becomes a hardware-inspired oscilloscope/VU analyzer:

- Show the active ducking/gain-reduction curve from scenario data and the current playhead.
- Use real engine levels where already exposed.
- Label what is measured versus derived; do not claim analyser data that the engine does not provide.
- Pause decorative drawing when playback is inactive or the panel is hidden.
- Provide a concise text alternative for canvas visuals.

`FiltergraphDiagram` becomes a clean signal-flow diagram for the real `filterComplex` string:

- Nodes and edges represent actual sources, mixing, sidechain compression, and loudness normalization.
- Use neon edges sparingly, with optional signal pulses tied to actual playback state.
- Interactive nodes/disclosures must be keyboard accessible.
- Preserve a readable textual filtergraph for small screens and assistive technology.

### 6. Protocol inspector

Present the inspector as synchronized studio telemetry:

- Packets remain aligned to the shared playhead and scenario.
- Selecting a packet retains DAW stem/cue highlighting.
- Add syntax-colored JSON, collapsible parameter/response sections, and copy-to-clipboard with success/failure feedback.
- Preserve packet selection and scenario switching behavior.
- Long payloads remain contained and scrollable without breaking mobile layout.

### 7. Offline/local studio

Give local mode the same rack language as online mode without merging their network behavior.

- Preserve `ConnectionStatus`, `LocalStudioPanel`, and `SetupPromptCard` behavior.
- Make disconnected state and the path to `/setup` especially clear.
- Keep existing commit/source/format/job/history functionality.
- Render local server and repository status only from real `ConnState`/`ServerStatus` data.

## Setup page redesign

Apply the same header, OLED tokens, typography, panels, focus states, and responsive rules to `/setup`.

Organize the existing guide into a clear installation journey:

1. Install prerequisites/server.
2. Choose an MCP client.
3. Connect using the exact existing configuration.
4. Create the first episode.
5. Optional troubleshooting and advanced material.

Preserve every working command, path, configuration value, and client name exactly. Use accessible tabs/disclosures and copy buttons for code blocks. Do not turn the guide into a marketing page or hide essential instructions behind animation.

## Motion language

- One restrained staggered entrance for hero copy and the primary console.
- Short channel-routing and panel transitions using CSS or the Web Animations API.
- Existing playback `requestAnimationFrame` remains authoritative for timing; decorative motion must never drive audio.
- Waveform breathing and ambient light movement are subtle and pause when not useful.
- No perpetual animation on every panel.
- Honor `prefers-reduced-motion`: disable ambient movement, pulses, smooth scrolling, and nonessential transitions.
- Avoid magnetic cursor effects on touch devices and avoid any effect that delays activation or harms pointer accuracy.

## Responsive behavior

### 1440px desktop

- DAW is the dominant workstation.
- Inspector and DSP panels may use a two-column studio arrangement.
- Hero and working controls remain within a readable max-width with cinematic negative space.

### 1024px tablet

- Racks reflow without overlapping.
- Transport remains visible and usable.
- Secondary telemetry stacks below primary creation/playback tasks.

### 390px mobile

- Creation controls appear before decorative scene detail.
- Header secondary links collapse or wrap.
- Mode cards, format cards, transport, and channel controls stack.
- DAW timeline scrolls horizontally with an obvious affordance.
- JSON, diffs, code blocks, and filtergraph text never force page-wide horizontal scrolling.

## Accessibility requirements

- Semantic buttons, links, tabs, disclosures, and dialog behavior.
- Keyboard-operable mode selection, seeking, track controls, diff/details, inspector packets, and setup tabs.
- Visible focus indicators and logical focus order.
- Connection, generation, copy, and error feedback exposed through appropriate status semantics without noisy per-frame announcements.
- Color-independent host, mute/solo, connection, and diff states.
- Text alternatives for canvases and meaningful waveform summaries.
- Reduced-motion support across both routes.

## Performance requirements

- No new 3D, video, or general animation runtime dependency.
- Prefer CSS, existing canvas, SVG, and small local assets. Any new raster backdrop should be responsive, compressed, and no larger than 250KB.
- No layout shift from late-loading decorative assets.
- Keep primary interaction available before nonessential animation finishes.
- Avoid continuous offscreen animation and unnecessary React renders.
- Preserve the existing audio decode/scheduling behavior even if it is not itself optimal; audio-engine optimization is outside this redesign.
- Production build must complete without new chunk-size regressions attributable to heavy visual dependencies.

## Verification

Run and report:

- `bun run test`
- `bun run lint`
- `bun run build`

Add focused tests for new pure UI behavior where useful, including keyboard shortcuts, accessible timeline seeking, mode semantics, and any local diff-signal formatter. Do not weaken existing speech, routing, setup, or engine tests.

Manually check `/` and `/setup` at 1440px, 1024px, and 390px; keyboard-only operation; reduced motion; online/demo/offline isolation; and real playback with mute, solo, seek, loop, inspector selection, and live-episode loading.

A visual result is not accepted if it is slow, sluggish, horizontally broken, or prevents the existing studio workflows.

## Builder discretion

The builder may decide component extraction, exact CSS token names, canvas/SVG rendering details, small spacing differences, and whether native CSS or Web Animations best implements a transition. These choices must not change behavior, add heavy dependencies, or weaken the requirements above.
