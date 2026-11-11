import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { AGENTS } from "./AgentConfigs";

export type Mode = "picker" | "demo" | "online" | "offline";

export function HeroSection({
  mode,
  onMode,
  onWarmOnline,
}: {
  mode: Mode;
  onMode: (m: Mode) => void;
  onWarmOnline: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [agentKey, setAgentKey] = useState(AGENTS[0]!.key);
  const agent = AGENTS.find((a) => a.key === agentKey) ?? AGENTS[0]!;

  return (
    <section className="mx-auto max-w-6xl px-5 pt-10 pb-8 md:pt-16">
      <div className="flex flex-wrap items-center gap-2">
        <span className="pill text-primary">MCP · JSON-RPC 2.0</span>
        <span className="pill">Tools · Resources · Prompts</span>
        <span className="pill">stdio + SSE</span>
        <span className="pill">FFmpeg filter_complex</span>
      </div>
      <h1 className="mt-6 text-4xl font-bold leading-[1.05] tracking-tight md:text-6xl">
        Generate audio podcasts for your code — <span className="text-primary">free</span>.
        <span className="mt-3 block text-2xl font-medium text-muted-foreground md:text-4xl">
          Paste a public GitHub repo online, or connect your private local code — get roasts, explainers and postmortems.
        </span>
      </h1>
      <p className="mt-6 max-w-2xl text-base text-muted-foreground md:text-lg">
        Online mode needs no setup: our server drafts, voices and mixes your episode. Offline mode runs everything on your computer through your AI agent.
        Stateful MCP resources hold a timeline manifest. FFmpeg sidechain DSP ducks the music under every voice.
        Millisecond stem orchestration lets hosts interrupt each other with negative <code className="font-mono text-foreground">overlap_ms</code>.
      </p>
      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        {([
          ["demo", "▶ Play interactive PR roast demo", "Hear a finished episode right now"],
          ["online", "Turn any GitHub repo into a podcast", "Online · no setup · public repos"],
          ["offline", "Get the offline setup prompt", "Your local code · via your AI agent"],
        ] as const).map(([m, label, sub]) => (
          <button key={m} onClick={() => onMode(m)} onMouseEnter={m === "online" ? onWarmOnline : undefined} onFocus={m === "online" ? onWarmOnline : undefined}
            aria-pressed={mode === m}
            className={`rounded-md border p-4 text-left transition ${mode === m ? "border-primary bg-primary/10 shadow-[0_0_30px_-10px_var(--primary)]" : "border-border bg-card hover:bg-accent"}`}>
            <span className={`block font-semibold ${mode === m ? "text-primary" : ""}`}>{label}</span>
            <span className="mt-1 block text-xs text-muted-foreground">{sub}</span>
          </button>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
        {mode !== "picker" && <button onClick={() => onMode("picker")} className="text-muted-foreground hover:text-foreground">← Switch mode</button>}
        <Link to="/setup" className="text-muted-foreground hover:text-foreground">Manual setup guide →</Link>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span>Works with</span>
        {AGENTS.map((a) => (
          <button key={a.key} onClick={() => { setAgentKey(a.key); setOpen(true); }} className="pill transition hover:text-foreground">
            {a.label}
          </button>
        ))}
      </div>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 p-4 backdrop-blur md:items-center" onClick={() => setOpen(false)}>
          <div className="panel w-full max-w-xl p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Connect StudioEngineer MCP</h3>
              <button onClick={() => setOpen(false)} aria-label="Close" className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            <div role="tablist" className="mt-4 flex flex-wrap gap-1 rounded-md bg-background p-1">
              {AGENTS.map((a) => (
                <button key={a.key} role="tab" aria-selected={a.key === agent.key} onClick={() => { setAgentKey(a.key); setCopied(false); }}
                  className={`rounded px-3 py-1.5 text-xs transition ${a.key === agent.key ? "bg-card text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                  {a.label}
                </button>
              ))}
            </div>
            <p className="mt-4 font-mono text-xs text-muted-foreground">{agent.file} · macOS example</p>
            <pre className="mt-2 max-h-72 overflow-auto rounded-md bg-background p-4 font-mono text-xs text-wave">{agent.config}</pre>
            <p className="mt-3 text-xs text-muted-foreground">{agent.steps[0]} Replace the path with your local clone.</p>
            <Link to="/setup" className="mt-2 inline-block text-xs text-primary hover:underline">Full guide for Windows, macOS &amp; Linux →</Link>
            <button
              onClick={() => {
                void navigator.clipboard.writeText(agent.config);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
              className="mt-4 w-full rounded-md bg-primary py-2 font-semibold text-primary-foreground"
            >
              {copied ? "Copied ✓" : "Copy to clipboard"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
