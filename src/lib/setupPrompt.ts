import type { OsKey } from "@/components/showcase/AgentConfigs";
import { UV_DEV_VALIDATION, UV_SYNC_RUNTIME } from "@/lib/setupCommands";

export const AGENT_NAMES: Record<string, string> = {
  "claude-code": "Claude Code",
  cursor: "Cursor",
  codex: "Codex",
  antigravity: "Antigravity",
  vscode: "VS Code (Copilot agent)",
  claude: "Claude Desktop",
};

const OS_NAME: Record<OsKey, string> = { mac: "macOS", windows: "Windows", linux: "Linux" };

export function buildSetupPrompt(os: OsKey, agent: string, repoUrl: string): string {
  const name = AGENT_NAMES[agent] ?? "my coding agent";
  const install = {
    mac: "brew install ffmpeg git, and uv via: curl -LsSf https://astral.sh/uv/install.sh | sh",
    windows: "winget install Gyan.FFmpeg and Git.Git, and uv via: powershell -c \"irm https://astral.sh/uv/install.ps1 | iex\"",
    linux: "sudo apt install -y ffmpeg git libsndfile1 (or dnf), and uv via: curl -LsSf https://astral.sh/uv/install.sh | sh",
  }[os];
  return `Set up the StudioEngineer MCP server for me so I can generate free audio podcasts about my code. I'm on ${OS_NAME[os]} using ${name}. Do every step yourself, ask me only if something fails.

1. Check for ffmpeg, git and uv. If missing, install them: ${install}.
2. Clone ${repoUrl} into ~/studio-engineer-mcp (skip if it already exists, otherwise git pull). Then in its mcp-server folder run: ${UV_SYNC_RUNTIME}.
3. Start the local companion server in the background so the website can connect, pointing it at THIS project folder (the repo I have open right now):
   uv --directory <absolute path to mcp-server> run --no-sync python -m src.server --transport sse --port 8000 --repo "<absolute path of my current project>"
4. Verify by requesting http://localhost:8000/api/status — it must return "ok": true with my repo name.
5. Register the MCP server named "studio-engineer" in ${name}'s MCP config (use the correct config file for ${name} on ${OS_NAME[os]}; merge, don't overwrite other servers). Command: uv, args: ["--directory", "<absolute path to mcp-server>", "run", "--no-sync", "python", "-m", "src.server", "--transport", "stdio"], env: { "TTS_PROVIDER": "edge" } (free, clear neural voices; needs internet). Use forward slashes in paths.
6. Tell me: "Connected — open the StudioEngineer site, your repo should show as connected." Also remind me to restart ${name} so the new MCP tools load.

Optional follow-up, only after Connected:
- For development validation, run in mcp-server: ${UV_DEV_VALIDATION}.
- For fully offline voices, if I agree, install the kokoro extra (uv sync --locked --extra kokoro), download kokoro-v1.0.onnx and voices-v1.0.bin, and set TTS_PROVIDER=kokoro with KOKORO_MODEL/KOKORO_VOICES paths.

After setup, you can use these tools: list_local_commits, get_local_diff, generate_episode (format roast | explainer | postmortem), submit_script, plus create_session / append_dialogue_stem / insert_sfx_cue / render_master_mix.`;
}

export function buildImprovePrompt(format: string, source: string, title: string): string {
  return `Using the studio-engineer MCP tools: call get_local_diff with source="${source}" ("${title}"), read the diff carefully, then write a sharp, accurate ${format === "explainer" ? "single-narrator code explainer (speaker \"Alex (Staff SRE)\" only)" : format === "postmortem" ? "blameless incident-style postmortem between Alex and Sam" : "2-host PR roast between \"Alex (Staff SRE)\" (cynical SRE) and \"Sam (Builder)\" (optimistic builder)"} of 8-12 lines that references real file names and logic. Use negative overlap_ms (-150 to -350) for interruptions and sfx (keyboard_clack, record_scratch, pager_alert, transition_whoosh) at turning points. Submit it with submit_script(lines=[...], format="${format}", source="${source}"). It will appear on the StudioEngineer website automatically.`;
}
