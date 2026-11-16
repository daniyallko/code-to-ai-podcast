import { useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { AudioLines, ChevronLeft, Cloud, Code2, Mic, Monitor, Play, Radio } from "lucide-react";
import { AGENTS } from "./AgentConfigs";
import { CopyButton } from "./CopyButton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type Mode = "picker" | "demo" | "online" | "offline";

const CHANNELS = [
  { mode: "online", channel: "CH 01", label: "ONLINE", description: "Zero setup · paste any public GitHub repo", icon: Cloud },
  { mode: "demo", channel: "CH 02", label: "INTERACTIVE DEMO", description: "PR Roast #402 · live multitrack studio", icon: Play },
  { mode: "offline", channel: "CH 03", label: "OFFLINE / LOCAL", description: "Cursor, Claude Desktop, Windsurf or Cline", icon: Monitor },
] as const;

export function HeroSection({ mode, onMode, onWarmOnline }: { mode: Mode; onMode: (m: Mode) => void; onWarmOnline: () => void }) {
  const [open, setOpen] = useState(false);
  const [agentKey, setAgentKey] = useState(AGENTS[0]!.key);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  return (
    <section className="relative isolate overflow-hidden border-b border-border/70">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-20">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_75%_20%,rgba(0,242,254,0.075),transparent_42%),radial-gradient(ellipse_at_20%_0%,rgba(255,179,0,0.07),transparent_40%)]" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-background to-transparent" />
      </div>

      <div className="mx-auto max-w-7xl px-4 pb-10 pt-12 sm:px-5 md:pb-14 md:pt-20">
        <div className="grid items-center gap-10 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="max-w-3xl animate-[studio-enter_550ms_ease-out_both]">
            <div className="mb-5 flex items-center gap-3 font-mono text-[10px] tracking-[0.16em] text-primary">
              <span className="h-px w-8 bg-primary/70" /> STUDIOENGINEER MCP · FREE CREATION
            </div>
            <h1 className="max-w-2xl text-4xl font-semibold leading-[1.02] tracking-[-0.045em] sm:text-5xl md:text-6xl">
              Turn Code Diffs into Broadcast Podcasts.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-muted-foreground md:text-lg">
              Paste a public GitHub repository and create a two-host episode for free. Or enter the interactive studio to hear code reviewed with real voices, music, and sidechain-ducked audio.
            </p>
            <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 font-mono text-[10px] text-muted-foreground">
              <span className="inline-flex items-center gap-2"><Code2 className="size-3.5 text-wave" /> PUBLIC DIFF → MULTITRACK EPISODE</span>
              <span className="inline-flex items-center gap-2"><AudioLines className="size-3.5 text-signal" /> FFMPEG · −16 LUFS</span>
            </div>
          </div>

          <div aria-hidden="true" className="relative hidden animate-[studio-enter_650ms_100ms_ease-out_both] lg:block">
            <div className="absolute -inset-10 -z-10 rounded-full bg-wave/5 blur-3xl" />
            <div className="rack-panel overflow-hidden bg-background/60 p-4 shadow-[0_0_45px_-20px_var(--wave)]">
              <div className="flex items-center justify-between border-b border-border pb-3 font-mono text-[9px] tracking-[0.14em] text-muted-foreground">
                <span className="inline-flex items-center gap-2"><Radio className="size-3 text-primary" /> BROADCAST CONSOLE</span>
                <span className="text-signal">STUDIO READY</span>
              </div>
              <div className="mt-5 grid grid-cols-[1fr_auto] gap-5">
                <div className="flex h-28 items-center gap-1">
                  {[18, 34, 24, 48, 64, 38, 75, 55, 90, 62, 43, 70, 48, 28, 53, 37, 20, 41, 25, 16].map((height, index) => (
                    <span key={index} className={`flex-1 ${index % 5 === 0 ? "bg-primary" : index % 2 === 0 ? "bg-wave/70" : "bg-signal/60"}`} style={{ height: `${height}%` }} />
                  ))}
                </div>
                <div className="grid size-20 place-items-center self-center rounded-full border border-primary/30 bg-primary/5 text-primary shadow-[0_0_25px_-8px_var(--primary)]">
                  <Mic className="size-7" />
                </div>
              </div>
              <div className="mt-5 space-y-2">
                {["HOST ALEX", "HOST SAM", "SFX BUS", "BGM · SIDECHAIN"].map((label, index) => (
                  <div key={label} className="grid grid-cols-[92px_1fr] items-center gap-3 font-mono text-[8px] text-muted-foreground">
                    <span>{label}</span>
                    <span className="h-1 bg-secondary"><span className={`block h-full ${index === 0 ? "w-3/4 bg-wave" : index === 1 ? "w-2/3 bg-signal" : index === 2 ? "w-1/3 bg-coral" : "w-1/2 bg-primary"}`} /></span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 grid gap-3 sm:grid-cols-3">
          {CHANNELS.map(({ mode: channelMode, channel, label, description, icon: Icon }, index) => {
            const active = mode === channelMode;
            return (
              <button
                key={channelMode}
                type="button"
                onClick={() => onMode(channelMode)}
                onMouseEnter={channelMode === "online" ? onWarmOnline : undefined}
                onFocus={channelMode === "online" ? onWarmOnline : undefined}
                aria-pressed={active}
                className={`hardware-button group relative min-h-32 animate-[studio-enter_450ms_ease-out_both] items-start p-4 text-left ${active ? "border-primary/70 bg-primary/5 shadow-[0_0_25px_-14px_var(--primary)]" : "bg-card/80"}`}
                style={{ animationDelay: `${180 + index * 70}ms` }}
              >
                <span className={`absolute inset-x-4 top-0 h-px ${active ? "bg-primary shadow-[0_0_10px_var(--primary)]" : "bg-transparent"}`} />
                <span className="flex w-full items-center justify-between font-mono text-[9px] tracking-[0.12em] text-muted-foreground">
                  <span>{channel}</span><Icon className={`size-4 ${active ? "text-primary" : ""}`} />
                </span>
                <span className={`mt-4 block font-mono text-sm font-semibold tracking-tight ${active ? "text-primary" : "text-foreground"}`}>{label}</span>
                <span className="mt-2 block text-xs font-normal leading-5 text-muted-foreground">{description}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-3 text-xs">
          {mode !== "picker" && <button type="button" onClick={() => onMode("picker")} className="inline-flex min-h-9 items-center gap-1 text-muted-foreground hover:text-foreground"><ChevronLeft className="size-3.5" /> Switch mode</button>}
          <Link to="/setup" className="inline-flex min-h-9 items-center text-primary hover:underline">Manual setup guide →</Link>
          <span className="text-muted-foreground">Connect your agent:</span>
          {AGENTS.map((agent) => (
            <button
              key={agent.key}
              ref={agentKey === agent.key ? triggerRef : undefined}
              type="button"
              onClick={(event) => { triggerRef.current = event.currentTarget; setAgentKey(agent.key); setOpen(true); }}
              className="min-h-9 border-b border-transparent font-mono text-[11px] text-muted-foreground hover:border-primary hover:text-foreground"
            >
              {agent.label}
            </button>
          ))}
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          onCloseAutoFocus={(event) => { event.preventDefault(); triggerRef.current?.focus(); }}
          className="max-h-[90vh] w-[calc(100%-2rem)] max-w-xl overflow-y-auto border-border bg-card p-0 shadow-none"
        >
          <DialogHeader className="border-b border-border p-5 text-left">
            <DialogTitle className="font-mono text-sm">Connect StudioEngineer MCP</DialogTitle>
            <DialogDescription>Choose your coding agent and copy its local connection configuration.</DialogDescription>
          </DialogHeader>
          <Tabs value={agentKey} onValueChange={setAgentKey} className="p-5">
            <TabsList className="h-auto flex-wrap justify-start bg-background">
              {AGENTS.map((agent) => <TabsTrigger key={agent.key} value={agent.key} className="min-h-9 text-xs data-[state=active]:bg-surface-2">{agent.label}</TabsTrigger>)}
            </TabsList>
            {AGENTS.map((agent) => (
              <TabsContent key={agent.key} value={agent.key}>
                <p className="mt-4 font-mono text-xs text-muted-foreground">{agent.file} · macOS example</p>
                <pre className="mt-2 max-h-72 overflow-auto rounded-md border border-border bg-background p-4 font-mono text-xs text-wave">{agent.config}</pre>
                <p className="mt-3 text-xs leading-5 text-muted-foreground">{agent.steps[0]} Replace the path with your local clone.</p>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <Link to="/setup" className="text-xs text-primary hover:underline">Full guide for Windows, macOS &amp; Linux →</Link>
                  <CopyButton text={agent.config} label="Copy configuration" />
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </DialogContent>
      </Dialog>
    </section>
  );
}
