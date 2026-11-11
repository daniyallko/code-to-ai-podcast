<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Project rules
- The showcase is the TanStack Start app in `src/` (not Next.js) because this platform only runs TanStack Start; the Python MCP server lives in `mcp-server/` and runs outside Lovable.
- Demo data and the JSON-RPC trace are derived from `src/lib/demoScenario.ts` so timeline, inspector and filtergraph stay consistent.
- Demo dialogue uses prerecorded speech assets and measured clip lengths; do not synthesize voice-like oscillator noise or stretch speech to placeholder timings.
- Keep caption text and pronunciation-only spoken_text separate through demo metadata and both local synthesis paths; measured output durations determine placement so pronunciation cannot desynchronize playback.
- The web Local Studio talks only to the user's own localhost server (mcp-server/src/http_app.py /api/*); live episodes are converted to the demo Scenario shape so DAW/inspector/visualizer are reused.
- The home page studio reads public GitHub diffs in the browser and posts them as source="custom" to the hosted server (CLOUD_URL), so the server needs no git or GitHub token.
