import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Check, Copy } from "lucide-react";
import { OSES, type OsKey } from "./AgentConfigs";
import { AGENT_NAMES, buildSetupPrompt } from "@/lib/setupPrompt";

const AGENT_KEYS = ["claude-code", "cursor", "codex", "antigravity", "vscode", "claude"];

export function SetupPromptCard() {
  const [os, setOs] = useState<OsKey>("mac");
  const [agent, setAgent] = useState("claude-code");
  const [repo, setRepo] = useState("https://github.com/daniyallko/code-to-ai-podcast");
  const [copied, setCopied] = useState(false);
  const prompt = buildSetupPrompt(os, agent, repo.trim() || "https://github.com/daniyallko/code-to-ai-podcast");

  return (
    <section id="connect" className="mx-auto max-w-6xl px-5 py-8">
      <div className="panel p-5 md:p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-xl font-semibold">1 · Paste one prompt into your agent</h2>
          <Link to="/setup" className="text-xs text-muted-foreground hover:text-foreground">Prefer manual setup? →</Link>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">Your agent installs everything, connects the MCP and starts the local server. This page then turns green.</p>

        <div className="mt-4 flex flex-wrap gap-4">
          <Seg label="System" value={os} onChange={(v) => setOs(v as OsKey)} items={OSES.map((o) => [o.key, o.label])} />
          <Seg label="Agent" value={agent} onChange={setAgent} items={AGENT_KEYS.map((k) => [k, AGENT_NAMES[k]!])} />
        </div>
        <label className="mt-4 block text-xs text-muted-foreground">
          Project repository URL
          <input value={repo} onChange={(e) => setRepo(e.target.value)} maxLength={300}
            className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-xs text-foreground" />
        </label>

        <pre className="mt-4 max-h-56 overflow-auto whitespace-pre-wrap rounded-md bg-background p-4 font-mono text-xs text-muted-foreground">{prompt}</pre>
        <button
          onClick={() => { void navigator.clipboard.writeText(prompt); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
          className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 font-semibold text-primary-foreground"
        >
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          {copied ? "Copied — paste it into your agent" : "Copy setup prompt"}
        </button>
      </div>
    </section>
  );
}

function Seg({ label, value, onChange, items }: { label: string; value: string; onChange: (v: string) => void; items: [string, string][] }) {
  return (
    <div>
      <p className="mb-1 text-xs text-muted-foreground">{label}</p>
      <div role="tablist" className="flex flex-wrap gap-1 rounded-md bg-background p-1">
        {items.map(([k, l]) => (
          <button key={k} role="tab" aria-selected={k === value} onClick={() => onChange(k)}
            className={`rounded px-3 py-1.5 text-xs transition ${k === value ? "bg-card text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
            {l}
          </button>
        ))}
      </div>
    </div>
  );
}
