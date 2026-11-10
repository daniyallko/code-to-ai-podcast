const DIR = "/path/to/studio-engineer-mcp/mcp-server";
const ARGS = ["--directory", DIR, "run", "python", "-m", "src.server", "--transport", "stdio"];

const jsonBlock = JSON.stringify(
  { mcpServers: { "studio-engineer": { command: "uv", args: ARGS, env: { TTS_PROVIDER: "kokoro" } } } },
  null,
  2,
);

export type AgentConfig = { key: string; label: string; file: string; config: string; note: string };

export const AGENTS: AgentConfig[] = [
  { key: "claude", label: "Claude Desktop", file: "claude_desktop_config.json", config: jsonBlock, note: "Settings → Developer → Edit Config, paste, then restart Claude." },
  { key: "cursor", label: "Cursor", file: "~/.cursor/mcp.json", config: jsonBlock, note: "Or add per-project in .cursor/mcp.json. Enable it under Settings → MCP." },
  {
    key: "codex",
    label: "Codex",
    file: "~/.codex/config.toml",
    config: `[mcp_servers.studio-engineer]
command = "uv"
args = [${ARGS.map((a) => JSON.stringify(a)).join(", ")}]
env = { TTS_PROVIDER = "kokoro" }`,
    note: "Works for the Codex CLI and IDE extension. Restart Codex after saving.",
  },
  { key: "antigravity", label: "Antigravity", file: "~/.gemini/antigravity/mcp_config.json", config: jsonBlock, note: "Desktop: Agent panel → … → MCP Servers → Manage → View raw config, paste and refresh. The Antigravity CLI reads the same file." },
  {
    key: "claude-code",
    label: "Claude Code",
    file: "terminal",
    config: `claude mcp add studio-engineer -e TTS_PROVIDER=kokoro -- uv ${ARGS.join(" ")}`,
    note: "Run once in your terminal; check with `claude mcp list`.",
  },
  {
    key: "vscode",
    label: "VS Code",
    file: ".vscode/mcp.json",
    config: JSON.stringify({ servers: { "studio-engineer": { type: "stdio", command: "uv", args: ARGS, env: { TTS_PROVIDER: "kokoro" } } } }, null, 2),
    note: "Used by GitHub Copilot agent mode.",
  },
];
