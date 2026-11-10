# Fun Natural Voices Design

## Intent

The demo should sound like two distinct engineers reacting to each other, not readers taking turns with generic copy. Local Studio should use the same personalities and actual vocal direction. Existing prerecorded playback and measured-duration orchestration are sound; this design replaces the writing, casting, and ignored emotion controls without introducing oscillator speech or post-production time-stretching.

## Goals

- Give Alex a dry, unhurried voice and Sam a brighter, quicker voice, stable across demo and Local Studio.
- Rewrite both demo scenarios around concrete code/log facts, short reactions, callbacks, and purposeful interruptions.
- Generate new real speech for every rewritten line, upload it through Lovable, and measure the final MP3 before updating timeline metadata.
- Separate natural caption text from pronunciation-friendly spoken text.
- Make `emotion` select modest provider settings at synthesis time instead of being metadata-only.
- Improve deterministic Local Studio drafts with changed symbols and honest uncertainty; retain agent-written scripts for richer writing.
- Make Docker use real speech by default and correct the privacy claim for networked TTS.

## Non-goals

- Adding a mandatory LLM call, new TTS dependency, draft-editing UI, or new API endpoint.
- Changing DAW buffer playback, FFmpeg mastering, or the shared Scenario architecture.
- Post-render speech stretching, oscillator dialogue, synthetic laughter/breaths, or fixed placeholder durations.
- Hand-editing Lovable-generated asset descriptors.
- Claiming automated tests can establish natural prosody.

## Anti-goals

- Jokes that invent test results, root causes, or safety claims absent from the diff/log.
- Rewritten captions playing stale recordings.
- Exaggerated pitch/rate settings that make hosts sound like caricatures.
- Captions polluted with pronunciation spellings such as “p ninety nine.”
- Networked TTS being described as fully local or private.

## Constraints

- `src/lib/demoScenario.ts` remains the source for Scenario layout, timeline, inspector, and filtergraph; raw dialogue moves to a dependency-free `demoDialogue.ts` so generation tools can read it without loading asset metadata.
- Every rewritten demo line uses a real prerecorded MP3 and its final measured `ffprobe` container duration, rounded to milliseconds.
- Speech pace/pitch changes happen only during synthesis. Never change browser `playbackRate` or stretch a finished clip to fit old timing.
- Existing negative-overlap placement remains; tune each overlap after listening to final clips.
- API keys remain server-side. Edge remains the default free neural provider; Kokoro remains opt-in.
- `synthetic_demo` is test-only and never a user-facing default.

## Implementation Decisions

These are builder defaults chosen from the code, not additional user requirements:

- Cast abstract `am_michael` / Alex as Edge `en-GB-RyanNeural`, and `af_bella` / Sam as `en-US-JennyNeural`. Keep Kokoro IDs unchanged. Allow provider-specific `TTS_VOICE_ALEX` and `TTS_VOICE_SAM` overrides.
- Use `ffprobe` duration of the final uploaded MP3 as the metadata convention. The existing registry differs from container durations by roughly 26–47 ms; new metadata must record one convention rather than silently mixing them.
- Add `spoken_text` as optional data on shared stems for backward compatibility, but require it for every prerecorded demo line. Synthesize `spoken_text ?? text`; display `text`.
- Derive SFX `offset_ms` in the JSON-RPC trace from the cue timestamp and its trigger stem, fixing the current hard-coded zero without duplicating offset data.
- Keep the deterministic scriptwriter free. Extract changed Python function names and use them in drafts; when no risky pattern matches, say the blast radius is unclear rather than “contained.”
- Defer a full draft-before-voice editor. Improve the existing agent prompt instead.

### Voice Direction Presets

Apply these modest settings at synthesis time. Unknown emotions use neutral. ElevenLabs uses stability `0.35` and style `0.35` for expressive rows marked `*`, otherwise stability `0.60` and style `0.10`; no post-render adjustment.

| Emotions | Edge rate | Edge pitch | Kokoro speed | ElevenLabs |
|---|---:|---:|---:|---:|
| neutral, focused | +0% | +0Hz | 1.00 | standard |
| excited, cheerful, hopeful * | +5% | +2Hz | 1.05 | expressive |
| curious, relieved * | +2% | +1Hz | 1.02 | expressive |
| exasperated * | +3% | -1Hz | 1.03 | expressive |
| hesitant, resigned, grim | -4% | -2Hz | 0.96 | standard |
| skeptical, sarcastic, cynical | -2% | -1Hz | 0.98 | standard |
| deadpan, dry, smug | -3% | -2Hz | 0.97 | standard |

## Exact Demo Rewrite

`text` is the caption. `spoken_text` is the generation input. Generate all 13 replacement clips even where the words look similar; persona and direction must be consistent.

### PR #402

| Stem | Speaker | Emotion | Initial overlap_ms | text | spoken_text |
|---|---|---|---:|---|---|
| 01 | Sam | excited | 600 | “PR #402: I replaced Redlock with one dictionary lookup. The benchmark says checkout is 10× faster.” | “PR four oh two. I replaced Red lock with one dictionary lookup. The benchmark says checkout is ten times faster.” |
| 02 | Alex | deadpan | -300 | “On one pod?” | same |
| 03 | Sam | hesitant | -120 | “…Sure. If you want to be picky.” | same |
| 04 | Alex | cynical | -220 | “On 40 pods, two checkouts can lock the same cart. That isn’t a benchmark. It’s a duplicate-charge generator.” | “On forty pods, two checkouts can lock the same cart. That is not a benchmark. It is a duplicate charge generator.” |
| 05 | Sam | smug | 120 | “So double charging isn’t a race condition. It’s a revenue strategy.” | same |
| 06 | Alex | exasperated | -250 | “And the TTL argument does nothing. Locks never leave the dictionary, so memory grows until the pod dies. Faster checkout, surprise outage.” | “And the T T L argument does nothing. Locks never leave the dictionary, so memory grows until the pod dies. Faster checkout, surprise outage.” |
| 07 | Sam | resigned | 180 | “Fine. Redlock returns, the benchmark stays, and I’ll write a two-pod test. A real one.” | “Fine. Red lock returns, the benchmark stays, and I will write a two pod test. A real one.” |
| 08 | Alex | dry | -180 | “Approved. Keep the speed. Lose the business model.” | same |

Move `pager_alert` to stem 06; keep the other SFX types and derive their real offsets. These overlaps are starting values for generation/audition, not permission to retime audio.

### Incident INC-2291

| Stem | Speaker | Emotion | Initial overlap_ms | text | spoken_text |
|---|---|---|---:|---|---|
| 01 | Alex | grim | 500 | “02:13. Checkout p99 hits 4.8 seconds—12× our 400 ms SLO.” | “Two thirteen A M. Checkout p ninety nine hits four point eight seconds. Twelve times our four hundred millisecond S L O.” |
| 02 | Sam | curious | -180 | “34 seconds later, a pod is OOM-killed. Then Redis hits 9,812 connections. Which one started it?” | “Thirty four seconds later, a pod is O O M killed. Then Redis hits nine thousand eight hundred twelve connections. Which one started it?” |
| 03 | Alex | focused | -140 | “The log doesn’t prove that yet. It proves latency, memory pressure, and nearly 10,000 Redis connections. No root-cause fan fiction.” | “The log does not prove that yet. It proves latency, memory pressure, and nearly ten thousand Redis connections. No root cause fan fiction.” |
| 04 | Sam | relieved | 160 | “After the 02:19 rollback, p99 recovers to 312 milliseconds. So… fixed?” | “After the two nineteen rollback, p ninety nine recovers to three hundred twelve milliseconds. So, fixed?” |
| 05 | Alex | dry | -160 | “Latency recovered. 41 duplicate orders did not roll back. Follow-up: idempotent checkout—and fewer victory laps.” | “Latency recovered. Forty one duplicate orders did not roll back. Follow-up: idempotent checkout, and fewer victory laps.” |

## Success Measures

- Both scenarios audition as distinct, natural conversations with no clipped important words and no stale caption/audio mismatch.
- All 13 final remote MP3s match `DEMO_SPEECH` spoken text and `ffprobe`-derived durations; starts and SFX traces derive from those values.
- Provider unit tests prove voice casting and direction parameters reach Edge, Kokoro, and ElevenLabs SDK/network boundaries.
- The lock-diff explainer names `acquire`; no format emits “the logic is updated” or the unconditional “Small, honestly. It’s a contained change.”
- Docker resolves `TTS_PROVIDER=edge` unless explicitly overridden.
- The hero no longer claims code never leaves the machine when networked speech is used.
- Web tests/build/lint and Python tests pass; a separate listening and real-provider smoke pass is documented honestly.
