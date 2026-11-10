# Voice verification

- Copied the exact 13 caption/pronunciation rows and initial overlaps from the design spec.
- Generated 13 fresh Edge recordings using the existing generator and voice direction presets; no old recordings are referenced by the new registry.
- Uploaded via Lovable Assets, downloaded every final hosted URL, verified bytes against the generation output, and measured final hosted bytes with ffprobe.
- Hosted container durations in milliseconds: PR 8856, 1872, 3768, 9552, 5760, 10560, 8760, 5880; incident 9168, 9936, 10632, 7944, 10368.
- Python: 28 tests passed, including 11 new symbol, pronunciation, uncertainty, synthesis propagation and measured-placement cases.
- Website: 23 tests passed. Targeted lint passed for all five edited TypeScript files. Harness reported build OK. Whole-project lint was attempted but did not finish within the check window; no claim of whole-project lint success.
- Browser: PR played through a full loop with eight successful MP3 responses; incident played to completion with five successful MP3 responses. No page runtime errors. Screenshots inspected.
- Browser: temporary localhost server connected to a real repository; selected an actual commit, generated a real Edge single-narrator explainer, read it back through the page, played it and confirmed its MP3 download link.
- Separate real-provider smoke: generated a seven-stem Edge roast from the lock.py/acquire fixture and rendered its master; manifest contains both text fields and measured durations.
- No browser playbackRate change, audio stretching, mandatory LLM calls, new endpoints, migrations or provider changes.

## Not verified

Human listening is still required to assess prosody, intelligibility, interruptions and clipped words. Browser decoding, generation provenance and duration checks do not prove naturalness. Initial spec overlaps remain unchanged pending audition.

The existing published revision was not republished. Lovable manages the sandbox branch; no checkout, commit, push or history rewrite was performed, so this work was not explicitly switched to main.