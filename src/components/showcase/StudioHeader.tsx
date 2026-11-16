import type { CSSProperties } from "react";
import { Link } from "@tanstack/react-router";
import { Activity, ArrowUpRight, BookOpen, Github } from "lucide-react";

export type HeaderStatus = {
  tone: "neutral" | "busy" | "connected" | "offline";
  label: string;
  detail?: string;
};

const TONE_COLOR = {
  neutral: "#98A2B3",
  busy: "#FFB300",
  connected: "#00E676",
  offline: "#FF3366",
} as const;

export function StudioHeader({ status }: { status: HeaderStatus }) {
  return (
    <header className="relative z-30 border-b border-border/80 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:px-5 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 items-center justify-between gap-4">
          <Link to="/" className="group flex items-center gap-3" aria-label="Code To AI Podcast home">
            <span className="grid size-9 place-items-center rounded border border-border border-t-white/10 bg-surface-2 text-primary">
              <Activity className="size-4" />
            </span>
            <span className="leading-none">
              <span className="block font-mono text-[11px] font-semibold tracking-[0.14em]">CODE TO AI</span>
              <span className="mt-1 block font-mono text-[9px] tracking-[0.2em] text-muted-foreground">PODCAST STUDIO</span>
            </span>
          </Link>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <nav aria-label="Studio links" className="flex items-center gap-3 font-mono text-[10px] text-muted-foreground">
            <a href="https://github.com/daniyallko/code-to-ai-podcast" target="_blank" rel="noreferrer" className="inline-flex min-h-8 items-center gap-1 hover:text-foreground">
              <Github className="size-3" /> GitHub <ArrowUpRight className="size-2.5" />
            </a>
            <Link to="/setup" className="inline-flex min-h-8 items-center gap-1 hover:text-foreground"><BookOpen className="size-3" /> MCP Docs</Link>
            <a href="/?mode=demo#daw" className="inline-flex min-h-8 items-center hover:text-foreground">Audio Spec</a>
          </nav>
          <div role="status" className="flex min-w-0 items-center gap-2 border-l border-border pl-3 font-mono text-[10px]">
            <span
              aria-hidden="true"
              className={`signal-led ${status.tone === "busy" ? "animate-[signal-breathe_1.4s_ease-in-out_infinite]" : ""}`}
              style={{ "--led-color": TONE_COLOR[status.tone] } as CSSProperties}
            />
            <span className="truncate text-foreground">{status.label}</span>
            {status.detail && <span className="hidden truncate text-muted-foreground lg:inline">· {status.detail}</span>}
          </div>
        </div>
      </div>
    </header>
  );
}
