import { useRef, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { AudioLines, Cloud, Code2, Headphones, Mic, Monitor, Play } from "lucide-react";
import { AGENTS } from "./AgentConfigs";
import { CopyButton } from "./CopyButton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type Mode = "picker" | "demo" | "online" | "offline";

const CHANNELS = [
  {
    mode: "demo",
    label: "Interactive demo",
    description: "PR Roast #402 · multitrack studio",
    icon: Play,
  },
  { mode: "online", label: "Online", description: "Free · any public GitHub repo", icon: Cloud },
  {
    mode: "offline",
    label: "Offline / Local",
    description: "Your code, through your AI agent",
    icon: Monitor,
  },
] as const;

export function HeroSection({
  mode,
  onMode,
  onWarmOnline,
  children,
}: {
  mode: Mode;
  onMode: (m: Mode) => void;
  onWarmOnline: () => void;
  children?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [agentKey, setAgentKey] = useState(AGENTS[0]!.key);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  return (
    <section className="relative isolate min-h-[calc(100svh-64px)] overflow-hidden border-b border-[#8492ff38]">
      <div
        className={`relative z-10 mx-auto min-h-[calc(100svh-64px)] max-w-[1600px] gap-8 px-5 py-10 sm:px-8 lg:items-center lg:py-14 ${children ? "grid lg:grid-cols-[minmax(300px,0.58fr)_minmax(0,1.42fr)]" : "flex justify-center"}`}
      >
        <div className="max-w-xl animate-[murmur-rise_600ms_80ms_ease-out_both]">
          <p className="font-mono text-[11px] tracking-[0.12em] text-[#b9c4ea]">
            STUDIOENGINEER MCP · FREE CREATION
          </p>
          <h1 className="mt-4 font-display text-6xl leading-[0.95] tracking-[0.025em] text-white [text-shadow:0_4px_24px_rgba(4,9,38,0.65)] sm:text-7xl">
            Code To AI Podcast
          </h1>
          <p className="mt-5 text-2xl leading-8 text-[#dfe3fb]">
            Turn Code Diffs into Broadcast Podcasts.
          </p>
          <p className="mt-4 max-w-md text-sm leading-6 text-[#c4cbea]">
            Paste a public GitHub repository and create a two-host episode for free. Or listen to
            the interactive PR Roast with real voices, music, and sidechain-ducked audio.
          </p>

          <div className="mt-7 space-y-2" role="group" aria-label="Studio mode">
            {CHANNELS.map(({ mode: channelMode, label, description, icon: Icon }) => {
              const active = mode === channelMode;
              return (
                <button
                  key={channelMode}
                  type="button"
                  onClick={() => onMode(channelMode)}
                  onMouseEnter={
                    channelMode === "online" && mode === "online" ? onWarmOnline : undefined
                  }
                  onFocus={channelMode === "online" && mode === "online" ? onWarmOnline : undefined}
                  aria-pressed={active}
                  className={`flex min-h-[68px] w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors ${active ? "border-[#8492ff80] bg-[#13245ddd] text-white" : "border-[#8492ff30] bg-[#08153e99] text-[#b9c4ea] hover:bg-[#10204bcc]"}`}
                >
                  <span
                    className={`grid size-9 flex-none place-items-center rounded-md border ${active ? "border-[#86a2ff80] bg-[#86a2ff20] text-[#b9caff]" : "border-[#8492ff30] text-[#7583bd]"}`}
                  >
                    <Icon className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">{label}</span>
                    <span className="mt-0.5 block font-mono text-[10px] text-[#9aa8d5]">
                      {description}
                    </span>
                  </span>
                  <span
                    className={`size-2 flex-none rounded-full ${active ? "bg-[#86a2ff] shadow-[0_0_12px_#86a2ff]" : "bg-[#3b4675]"}`}
                  />
                </button>
              );
            })}
          </div>

          <div className="mt-6 hidden border-t border-[#8492ff25] pt-4 sm:block">
            <p className="font-mono text-[10px] tracking-[0.08em] text-[#b9c4ea]">
              ABOUT THE STUDIO
            </p>
            <p className="mt-2 max-w-md font-mono text-[11px] leading-5 text-[#9aa8d5]">
              AI drafts the conversation. Measured speech clips place every interruption. FFmpeg
              ducks the music beneath each voice, then masters the episode for broadcast.
            </p>
            <div className="mt-4 flex items-center gap-3 text-[#b9c4ea]">
              <span className="mr-1 font-mono text-[9px] tracking-[0.08em]">MULTITRACK AUDIO</span>
              <Mic className="size-4" />
              <AudioLines className="size-4" />
              <Headphones className="size-4" />
              <Code2 className="size-4" />
            </div>
          </div>
        </div>

        {children && (
          <div
            key={mode}
            className="mt-8 min-w-0 animate-[murmur-card_450ms_ease-out_both] lg:mt-0"
          >
            <div className="rounded-2xl border border-[#8492ff61] bg-[#08153edb] p-2 shadow-[0_24px_80px_rgba(2,6,23,0.55)] backdrop-blur-xl sm:p-3">
              {children}
            </div>
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            triggerRef.current?.focus();
          }}
          className="max-h-[90vh] w-[calc(100%-2rem)] max-w-xl overflow-y-auto border-border bg-card p-0 shadow-none"
        >
          <DialogHeader className="border-b border-border p-5 text-left">
            <DialogTitle className="font-mono text-sm">Connect StudioEngineer MCP</DialogTitle>
            <DialogDescription>
              Choose your coding agent and copy its local connection configuration.
            </DialogDescription>
          </DialogHeader>
          <Tabs value={agentKey} onValueChange={setAgentKey} className="p-5">
            <TabsList className="h-auto flex-wrap justify-start bg-background">
              {AGENTS.map((agent) => (
                <TabsTrigger
                  key={agent.key}
                  value={agent.key}
                  className="min-h-9 text-xs data-[state=active]:bg-surface-2"
                >
                  {agent.label}
                </TabsTrigger>
              ))}
            </TabsList>
            {AGENTS.map((agent) => (
              <TabsContent key={agent.key} value={agent.key}>
                <p className="mt-4 font-mono text-xs text-muted-foreground">
                  {agent.file} · macOS example
                </p>
                <pre className="mt-2 max-h-72 overflow-auto rounded-md border border-border bg-background p-4 font-mono text-xs text-wave">
                  {agent.config}
                </pre>
                <p className="mt-3 text-xs leading-5 text-muted-foreground">
                  {agent.steps[0]} Replace the path with your local clone.
                </p>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <Link to="/setup" className="text-xs text-primary hover:underline">
                    Full guide for Windows, macOS &amp; Linux →
                  </Link>
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
