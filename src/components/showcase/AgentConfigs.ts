export type OsKey = "windows" | "mac" | "linux";

export const OSES: { key: OsKey; label: string }[] = [
  { key: "mac", label: "macOS" },
  { key: "windows", label: "Windows" },
  { key: "linux", label: "Linux" },
];

export const SAMPLE_DIR: Record<OsKey, string> = {
  mac: "/Users/you/studio-engineer-mcp/mcp-server",
  linux: "/home/you/studio-engineer-mcp/mcp-server",
  // Forward slashes work on Windows and avoid JSON/TOML backslash escaping.
  windows: "C:/Users/you/studio-engineer-mcp/mcp-server",
};

const args = (dir: string) => ["--directory", dir, "run", "python", "-m", "src.server", "--transport", "stdio"];
const ENV = { TTS_PROVIDER: "edge" };

const mcpServersJson = (dir: string) =>
  JSON.stringify({ mcpServers: { "studio-engineer": { command: "uv", args: args(dir), env: ENV } } }, null, 2);

export type AgentConfig = {
  key: string;
  label: string;
  file: string;
  config: string;
  lang: "json" | "toml" | "shell";
  steps: string[];
  verify: string;
};

export function getAgents(os: OsKey, dir = SAMPLE_DIR[os]): AgentConfig[] {
  const home = os === "windows" ? "%USERPROFILE%" : "~";
  const sep = os === "windows" ? "\\" : "/";
  const claudeFile = {
    mac: "~/Library/Application Support/Claude/claude_desktop_config.json",
    windows: "%APPDATA%\\Claude\\claude_desktop_config.json",
    linux: "~/.config/Claude/claude_desktop_config.json (unofficial builds only)",
  }[os];

  return [
    {
      key: "claude",
      label: "Claude Desktop",
      file: claudeFile,
      config: mcpServersJson(dir),
      lang: "json",
      steps: [
        "Open Claude Desktop → Settings → Developer → Edit Config.",
        "Paste the block (merge with any existing \"mcpServers\").",
        "Fully quit Claude (tray/menu bar → Quit) and reopen it.",
        ...(os === "linux" ? ["Anthropic does not ship an official Linux build; prefer Claude Code, Cursor or VS Code on Linux."] : []),
      ],
      verify: "Click the tools/plug icon in the chat box — studio-engineer should list 4 tools.",
    },
    {
      key: "cursor",
      label: "Cursor",
      file: `${home}${sep}.cursor${sep}mcp.json`,
      config: mcpServersJson(dir),
      lang: "json",
      steps: [
        "Create the file if it doesn't exist (or use .cursor/mcp.json inside a project).",
        "Paste the block and save.",
        "Open Cursor Settings → MCP (Tools & Integrations) and make sure studio-engineer is enabled.",
      ],
      verify: "A green dot next to studio-engineer means the server started.",
    },
    {
      key: "codex",
      label: "Codex",
      file: `${home}${sep}.codex${sep}config.toml`,
      config: `[mcp_servers.studio-engineer]
command = "uv"
args = [${args(dir).map((a) => JSON.stringify(a)).join(", ")}]
env = { TTS_PROVIDER = "edge" }`,
      lang: "toml",
      steps: [
        "Append the block to config.toml (create the file if needed).",
        "Restart the Codex CLI or IDE extension.",
        ...(os === "windows" ? ["Codex on Windows works best inside WSL; if you use WSL, follow the Linux tab with a Linux path."] : []),
      ],
      verify: "Run `codex mcp list` or type /mcp inside Codex.",
    },
    {
      key: "antigravity",
      label: "Antigravity",
      file: `${home}${sep}.gemini${sep}antigravity${sep}mcp_config.json`,
      config: mcpServersJson(dir),
      lang: "json",
      steps: [
        "Desktop: Agent panel → ⋯ → MCP Servers → Manage MCP Servers → View raw config.",
        "Paste the block (merge with existing \"mcpServers\") and save.",
        "Press Refresh in the MCP Servers panel. The Antigravity CLI reads the same file.",
      ],
      verify: "studio-engineer appears in the MCP Servers list with its tools.",
    },
    {
      key: "claude-code",
      label: "Claude Code",
      file: "terminal",
      config: `claude mcp add studio-engineer --scope user -e TTS_PROVIDER=edge -- uv ${args(dir).join(" ")}`,
      lang: "shell",
      steps: ["Run the command once in any terminal.", "Start a new `claude` session."],
      verify: "Run `claude mcp list` (should show ✓ Connected) or /mcp inside a session.",
    },
    {
      key: "vscode",
      label: "VS Code",
      file: `.vscode${sep}mcp.json (in your workspace)`,
      config: JSON.stringify({ servers: { "studio-engineer": { type: "stdio", command: "uv", args: args(dir), env: ENV } } }, null, 2),
      lang: "json",
      steps: [
        "Create .vscode/mcp.json in your workspace and paste the block (note: key is \"servers\").",
        "Click the Start link that appears above the server in the file.",
        "Open Copilot Chat and switch to Agent mode.",
      ],
      verify: "Click the tools icon in Copilot Chat — studio-engineer tools should be listed.",
    },
  ];
}

export const AGENTS = getAgents("mac");

export type Step = { title: string; body?: string; code?: string };

export function prereqSteps(os: OsKey): Step[] {
  const install = {
    mac: `# Homebrew (https://brew.sh)
brew install ffmpeg git
curl -LsSf https://astral.sh/uv/install.sh | sh`,
    windows: `# PowerShell
winget install --id Gyan.FFmpeg -e
winget install --id Git.Git -e
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"`,
    linux: `# Debian/Ubuntu (Fedora: sudo dnf install ffmpeg git)
sudo apt update && sudo apt install -y ffmpeg git libsndfile1
curl -LsSf https://astral.sh/uv/install.sh | sh`,
  }[os];
  const cd = os === "windows" ? "cd $HOME\\studio-engineer-mcp\\mcp-server" : "cd ~/studio-engineer-mcp/mcp-server";
  return [
    { title: "Install FFmpeg, Git and uv", body: "uv also installs the right Python (3.11+) for you. Open a new terminal afterwards so the commands are on your PATH.", code: install },
    { title: "Check the tools", code: "ffmpeg -version\nuv --version" },
    {
      title: "Get the project and install dependencies",
      body: "Clone (or download) the project, then go into the mcp-server folder.",
      code: `git clone <your-repo-url> ${os === "windows" ? "$HOME\\studio-engineer-mcp" : "~/studio-engineer-mcp"}\n${cd}\nuv sync --extra dev`,
    },
    { title: "Run the tests", body: "Confirms FFmpeg rendering works on your machine.", code: "uv run pytest -q" },
    {
      title: "Copy the absolute folder path",
      body: "You'll paste this into the agent config below.",
      code: os === "windows" ? "(Get-Location).Path -replace '\\\\','/'" : "pwd",
    },
  ];
}
