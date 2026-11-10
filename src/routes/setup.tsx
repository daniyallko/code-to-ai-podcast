import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { OSES, SAMPLE_DIR, getAgents, prereqSteps, type OsKey } from "@/components/showcase/AgentConfigs";

export const Route = createFileRoute("/setup")({
  head: () => ({
    meta: [
      { title: "Setup Guide — StudioEngineer MCP on Windows, macOS & Linux" },
      { name: "description", content: "Step-by-step setup for StudioEngineer MCP with Claude Desktop, Cursor, Codex, Antigravity, Claude Code and VS Code." },
      { property: "og:title", content: "StudioEngineer MCP Setup Guide" },
      { property: "og:description", content: "Install, configure and test the StudioEngineer MCP server with your coding agent on any OS." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SetupPage,
});

function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative mt-2">
      <pre className="overflow-x-auto rounded-md bg-background p-4 pr-16 font-mono text-xs text-wave">{code}</pre>
      <button
        onClick={() => { void navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
        className="absolute right-2 top-2 rounded border border-border bg-card px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground"
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

function Tabs<T extends string>({ items, value, onChange }: { items: { key: T; label: string }[]; value: T; onChange: (k: T) => void }) {
  return (
    <div role="tablist" className="flex flex-wrap gap-1 rounded-md border border-border bg-background p-1">
      {items.map((i) => (
        <button key={i.key} role="tab" aria-selected={i.key === value} onClick={() => onChange(i.key)}
          className={`rounded px-3 py-1.5 text-xs transition ${i.key === value ? "bg-card text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
          {i.label}
        </button>
      ))}
    </div>
  );
}

function SetupPage() {
  const [os, setOs] = useState<OsKey>("mac");
  const [dir, setDir] = useState("");
  const agents = getAgents(os, dir.trim().replace(/\\/g, "/") || SAMPLE_DIR[os]);
  const [agentKey, setAgentKey] = useState(agents[0]!.key);
  const agent = agents.find((a) => a.key === agentKey) ?? agents[0]!;

  return (
    <main className="mx-auto max-w-3xl px-5 py-12 md:py-16">
      <Link to="/" className="text-xs text-muted-foreground hover:text-foreground">← Back to demo</Link>
      <h1 className="mt-4 text-3xl font-bold tracking-tight md:text-4xl">Set up StudioEngineer MCP</h1>
      <p className="mt-3 text-muted-foreground">Runs locally on your computer and talks to your coding agent over stdio. Pick your system, then your agent.</p>

      <div className="mt-6"><Tabs items={OSES} value={os} onChange={setOs} /></div>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">1 · Install</h2>
        <ol className="mt-4 space-y-6">
          {prereqSteps(os).map((s, i) => (
            <li key={s.title} className="panel p-4">
              <p className="text-sm font-medium"><span className="mr-2 font-mono text-primary">{i + 1}.</span>{s.title}</p>
              {s.body && <p className="mt-1 text-xs text-muted-foreground">{s.body}</p>}
              {s.code && <CodeBlock code={s.code} />}
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-12">
        <h2 className="text-lg font-semibold">2 · Connect your agent</h2>
        <label className="mt-4 block text-xs text-muted-foreground">
          Your mcp-server folder path (fills in the config below)
          <input value={dir} onChange={(e) => setDir(e.target.value)} placeholder={SAMPLE_DIR[os]}
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-xs text-foreground" />
        </label>
        <div className="mt-4"><Tabs items={agents.map((a) => ({ key: a.key, label: a.label }))} value={agent.key} onChange={setAgentKey} /></div>
        <div className="panel mt-4 p-4">
          <p className="font-mono text-xs text-muted-foreground">{agent.file === "terminal" ? "Run in a terminal" : agent.file}</p>
          <CodeBlock code={agent.config} />
          <ol className="mt-4 list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
            {agent.steps.map((s) => <li key={s}>{s}</li>)}
          </ol>
          <p className="mt-3 text-sm"><span className="text-primary">Check:</span> <span className="text-muted-foreground">{agent.verify}</span></p>
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-lg font-semibold">3 · Use it</h2>
        <p className="mt-2 text-sm text-muted-foreground">Ask your agent in plain language, or use the built-in prompts <code className="font-mono text-foreground">pr-roast-podcast</code> and <code className="font-mono text-foreground">incident-postmortem-war-room</code>.</p>
        <CodeBlock code={`Use the studio-engineer tools to make a short 2-host podcast roasting this PR:
"Removed all retries from the payment client to cut latency."
Alternate Alex and Sam, add one interruption (negative overlap_ms),
a record_scratch SFX, then render_master_mix at -16 LUFS.`} />
        <p className="mt-3 text-sm text-muted-foreground">The finished episode is saved to <code className="font-mono text-foreground">mcp-server/renders/&lt;session_id&gt;/master.mp3</code>.</p>
      </section>

      <section className="mt-12">
        <h2 className="text-lg font-semibold">Optional</h2>
        <div className="mt-4 space-y-4 text-sm text-muted-foreground">
          <div className="panel p-4">
            <p className="font-medium text-foreground">Test without an agent (MCP Inspector, needs Node.js)</p>
            <CodeBlock code={`npx @modelcontextprotocol/inspector uv --directory "${dir.trim() || SAMPLE_DIR[os]}" run python -m src.server`} />
          </div>
          <div className="panel p-4">
            <p className="font-medium text-foreground">Real voices</p>
            <p className="mt-1">The configs use <code className="font-mono">synthetic_demo</code> so it works with no extra downloads. For ElevenLabs set <code className="font-mono">TTS_PROVIDER=elevenlabs</code> and <code className="font-mono">ELEVENLABS_API_KEY</code> in the env block. For Kokoro run <code className="font-mono">uv sync --extra kokoro</code>, download <code className="font-mono">kokoro-v1.0.onnx</code> and <code className="font-mono">voices-v1.0.bin</code> into mcp-server, and set <code className="font-mono">TTS_PROVIDER=kokoro</code>.</p>
          </div>
          <div className="panel p-4">
            <p className="font-medium text-foreground">Troubleshooting</p>
            <ul className="mt-1 list-disc space-y-1 pl-5">
              <li><b>"uv" not found</b> — GUI apps may not see your shell PATH. Replace <code className="font-mono">"uv"</code> with its full path ({os === "windows" ? "where.exe uv" : "which uv"}).</li>
              <li><b>Render fails</b> — run <code className="font-mono">ffmpeg -version</code>; reinstall FFmpeg and restart the agent.</li>
              <li><b>Server not listed</b> — check the JSON is valid, the path is absolute, then fully restart the agent.</li>
            </ul>
          </div>
        </div>
      </section>
    </main>
  );
}
