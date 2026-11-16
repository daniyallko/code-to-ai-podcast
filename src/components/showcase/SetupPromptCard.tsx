import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { OSES, type OsKey } from "./AgentConfigs";
import { AGENT_NAMES, buildSetupPrompt } from "@/lib/setupPrompt";
import { CopyButton } from "./CopyButton";

const AGENT_KEYS = ["claude-code", "cursor", "codex", "antigravity", "vscode", "claude"];

export function SetupPromptCard() {
  const [os, setOs] = useState<OsKey>("mac");
  const [agent, setAgent] = useState("claude-code");
  const [repo, setRepo] = useState("https://github.com/daniyallko/code-to-ai-podcast");
  const prompt = buildSetupPrompt(
    os,
    agent,
    repo.trim() || "https://github.com/daniyallko/code-to-ai-podcast",
  );

  return (
    <section id="connect" className="mx-auto max-w-7xl px-4 py-8 sm:px-5">
      <div className="rack-panel p-4 sm:p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <p className="font-mono text-[9px] tracking-[0.16em] text-primary">
              LOCAL ROUTING · STEP 01
            </p>
            <h2 className="mt-1 text-xl font-semibold">Paste one prompt into your agent</h2>
          </div>
          <Link to="/setup" className="min-h-9 text-xs text-primary hover:underline">
            Prefer manual setup? →
          </Link>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Your agent installs everything, connects the MCP and starts the local server. This page
          then turns green.
        </p>

        <div className="mt-5 flex flex-wrap gap-4">
          <Seg
            label="System"
            value={os}
            onChange={(value) => setOs(value as OsKey)}
            items={OSES.map((item) => [item.key, item.label])}
          />
          <Seg
            label="Agent"
            value={agent}
            onChange={setAgent}
            items={AGENT_KEYS.map((key) => [key, AGENT_NAMES[key]!])}
          />
        </div>
        <label className="mt-5 block font-mono text-[10px] text-muted-foreground">
          Project repository URL
          <input
            value={repo}
            onChange={(event) => setRepo(event.target.value)}
            maxLength={300}
            className="mt-2 min-h-11 block w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-xs text-foreground"
          />
        </label>

        <pre className="mt-4 max-h-64 overflow-auto whitespace-pre-wrap rounded-md border border-border bg-background p-4 font-mono text-[11px] leading-5 text-muted-foreground">
          {prompt}
        </pre>
        <CopyButton
          text={prompt}
          label="Copy setup prompt"
          className="mt-4 border-primary/60 bg-primary px-4 text-primary-foreground"
        />
      </div>
    </section>
  );
}

function Seg({
  label,
  value,
  onChange,
  items,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  items: [string, string][];
}) {
  return (
    <div>
      <p className="mb-2 font-mono text-[10px] text-muted-foreground">{label}</p>
      <div
        role="group"
        aria-label={label}
        className="flex flex-wrap gap-1 rounded-md border border-border bg-background p-1"
      >
        {items.map(([key, text]) => (
          <button
            key={key}
            type="button"
            aria-pressed={key === value}
            onClick={() => onChange(key)}
            className={`min-h-10 rounded px-3 font-mono text-xs transition ${key === value ? "bg-surface-2 text-primary" : "text-muted-foreground hover:text-foreground"}`}
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}
