import { useState } from "react";
import { Button } from "@/components/ui/button";
import { LoaderCircle, Plug } from "lucide-react";
import { AGENTS } from "./AgentConfigs";

export function HeroSection({
  onLaunch,
  liveStatus,
  onToggleMode,
}: {
  onLaunch: () => void;
  liveStatus: "idle" | "checking" | "ok" | "fail";
  onToggleMode: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [agentKey, setAgentKey] = useState(AGENTS[0]!.key);
  const agent = AGENTS.find((a) => a.key === agentKey) ?? AGENTS[0]!;

  return (
    <section className="mx-auto max-w-6xl px-5 pt-14 pb-10 md:pt-24">
      <div className="flex flex-wrap items-center gap-2">
        <span className="pill text-primary">MCP · JSON-RPC 2.0</span>
        <span className="pill">Tools · Resources · Prompts</span>
        <span className="pill">stdio + SSE</span>
        <span className="pill">FFmpeg filter_complex</span>
      </div>
      <h1 className="mt-6 text-4xl font-bold leading-[1.05] tracking-tight md:text-6xl">
        StudioEngineer <span className="text-primary">MCP</span>
        <span className="mt-3 block text-2xl font-medium text-muted-foreground md:text-4xl">
          Autonomous Multi-Track DAW &amp; Podcast Producer for LLMs
        </span>
      </h1>
      <p className="mt-6 max-w-2xl text-base text-muted-foreground md:text-lg">
        Stateful MCP resources hold a timeline manifest. FFmpeg sidechain DSP ducks the music under every voice.
        Millisecond stem orchestration lets hosts interrupt each other with negative <code className="font-mono text-foreground">overlap_ms</code>.
      </p>
      <div className="mt-8 flex flex-wrap items-center gap-3">
        <button
          onClick={onLaunch}
          className="rounded-md bg-primary px-5 py-3 font-semibold text-primary-foreground shadow-[0_0_30px_-6px_var(--primary)] transition hover:brightness-110"
        >
          ▶ Launch Interactive PR Roast Demo
        </button>
        <button
          onClick={() => setOpen(true)}
          className="rounded-md border border-border bg-card px-5 py-3 font-mono text-sm transition hover:bg-accent"
        >
          Connect your agent
        </button>

        <Button variant="outline" onClick={onToggleMode} disabled={liveStatus === "checking"} className="h-auto whitespace-normal py-2 text-xs">
          {liveStatus === "checking" ? <LoaderCircle className="animate-spin motion-reduce:animate-none" /> : <Plug />}
          {liveStatus === "checking" ? "Checking MCP server…" : "Check MCP server connection"}
        </Button>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span>Works with</span>
        {AGENTS.map((a) => (
          <button key={a.key} onClick={() => { setAgentKey(a.key); setOpen(true); }} className="pill transition hover:text-foreground">
            {a.label}
          </button>
        ))}
      </div>
      {liveStatus === "fail" && (
        <p role="status" className="mt-3 max-w-2xl text-sm text-muted-foreground">
          Could not reach the MCP server. Browser demo remains active — you can still launch the PR roast.
          The Python server must be running separately and accessible from this browser.
        </p>
      )}
      {liveStatus === "ok" && (
        <p role="status" className="mt-3 text-sm text-muted-foreground">
          MCP server reachable. This showcase continues to use prerecorded demo sessions.
        </p>
      )}

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
            <p className="mt-4 font-mono text-xs text-muted-foreground">{agent.file}</p>
            <pre className="mt-2 max-h-72 overflow-auto rounded-md bg-background p-4 font-mono text-xs text-wave">{agent.config}</pre>
            <p className="mt-3 text-xs text-muted-foreground">{agent.note} Replace the path with your local clone.</p>
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
