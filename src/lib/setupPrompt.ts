import type { OsKey } from "@/components/showcase/AgentConfigs";
import {
  UV_DEV_VALIDATION,
  UV_DEV_VALIDATION_KOKORO,
  UV_SYNC_KOKORO,
  UV_SYNC_RUNTIME,
} from "@/lib/setupCommands";

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
    windows:
      'winget install Gyan.FFmpeg and Git.Git, and uv via: powershell -c "irm https://astral.sh/uv/install.ps1 | iex"',
    linux:
      "sudo apt install -y ffmpeg git libsndfile1 (or dnf), and uv via: curl -LsSf https://astral.sh/uv/install.sh | sh",
  }[os];
  const kokoroServer =
    os === "windows"
      ? `PowerShell: $env:TTS_PROVIDER="kokoro"; $env:KOKORO_MODEL="<absolute path to kokoro-v1.0.onnx>"; $env:KOKORO_VOICES="<absolute path to voices-v1.0.bin>"; uv --directory <absolute path to mcp-server> run --no-sync python -m src.server --transport sse --port 8000 --repo "<absolute path of my current project>"`
      : `TTS_PROVIDER=kokoro KOKORO_MODEL="<absolute path to kokoro-v1.0.onnx>" KOKORO_VOICES="<absolute path to voices-v1.0.bin>" uv --directory <absolute path to mcp-server> run --no-sync python -m src.server --transport sse --port 8000 --repo "<absolute path of my current project>"`;
  return `Connect me to the StudioEngineer MCP server so I can generate free audio podcasts about my code. I'm on ${OS_NAME[os]} using ${name}. This prompt is safe to paste again: CHECK FIRST and only do what is missing. Do every step yourself, ask me only if something fails.

0. Quick check: request http://localhost:8000/api/status. If it returns "ok": true AND its repo matches the project I have open right now, AND "studio-engineer" is already in ${name}'s MCP config, just reply "Already connected" and stop — do not reinstall anything.
1. Check ffmpeg -version, git --version and uv --version. Install ONLY the ones that fail: ${install}.
2. If ~/studio-engineer-mcp already exists, run git pull there (do not re-clone); otherwise clone ${repoUrl} into ~/studio-engineer-mcp. Then in its mcp-server folder run: ${UV_SYNC_RUNTIME} (fast no-op when already up to date).
3. If the companion server is already running for THIS project, keep it. If it runs for a different folder, stop only that process. Otherwise start it in the background, pointing at THIS project folder:
   uv --directory <absolute path to mcp-server> run --no-sync python -m src.server --transport sse --port 8000 --repo "<absolute path of my current project>"
4. Verify by requesting http://localhost:8000/api/status — it must return "ok": true with my repo name.
5. If "studio-engineer" is not already registered in ${name}'s MCP config (correct file for ${name} on ${OS_NAME[os]}; merge, don't overwrite other servers), add it. Command: uv, args: ["--directory", "<absolute path to mcp-server>", "run", "--no-sync", "python", "-m", "src.server", "--transport", "stdio"], env: { "TTS_PROVIDER": "edge" } (free, clear neural voices; needs internet). Use forward slashes in paths.
6. Tell me: "Connected — the StudioEngineer page now shows your repo." If you changed the MCP config, remind me to restart ${name} so the new tools load.

Optional follow-up, only after Connected:
- For development validation, run in mcp-server: ${UV_DEV_VALIDATION}. If Kokoro is installed, preserve it with: ${UV_DEV_VALIDATION_KOKORO}.
- For fully offline voices, if I agree, run ${UV_SYNC_KOKORO}, download kokoro-v1.0.onnx and voices-v1.0.bin, and update the agent environment with TTS_PROVIDER=kokoro and absolute KOKORO_MODEL/KOKORO_VOICES paths.
- Stop only the companion process started in step 3, then restart the local companion in the background with: ${kokoroServer}
- Request http://localhost:8000/api/status again and confirm "tts_provider": "kokoro". Restart ${name} again so its MCP tools use the new voice settings.

After setup, you can use these tools: list_local_commits, get_local_diff, generate_episode (format roast | explainer | postmortem), submit_script, plus create_session / append_dialogue_stem / insert_sfx_cue / render_master_mix.`;
}

export function buildImprovePrompt(format: string, source: string, title: string): string {
  return `Using the studio-engineer MCP tools: call get_local_diff with source="${source}" ("${title}"), read the diff carefully, then write a sharp, accurate ${format === "explainer" ? 'single-narrator code explainer (speaker "Alex (Staff SRE)" only)' : format === "postmortem" ? "blameless incident-style postmortem between Alex and Sam" : '2-host PR roast between "Alex (Staff SRE)" (cynical SRE) and "Sam (Builder)" (optimistic builder)'}. Aim for 8-12 short lines, but never pad to meet a count. Reference concrete changed files, symbols, behavior and risks. Use short grounded reactions and callbacks to real facts. Never invent outcomes, test results, root causes or blast radius; state what the diff cannot establish. Use negative overlap_ms (-150 to -350) only for purposeful interruptions and sfx (keyboard_clack, record_scratch, pager_alert, transition_whoosh) at turning points. Keep natural captions in text; optional spoken_text is pronunciation-only for identifiers, numbers and acronyms, with identical meaning. Submit it with submit_script(lines=[...], format="${format}", source="${source}"). It will appear on the StudioEngineer website automatically.`;
}
