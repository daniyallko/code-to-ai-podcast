import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { HeroSection, type Mode } from "@/components/showcase/HeroSection";
import { McpProtocolInspector } from "@/components/showcase/McpProtocolInspector";
import { MultiTrackDaw } from "@/components/showcase/MultiTrackDaw";
import { SidechainVisualizer } from "@/components/showcase/SidechainVisualizer";
import { FiltergraphDiagram } from "@/components/showcase/FiltergraphDiagram";
import { SCENARIOS, buildFilterComplex, buildTrace, totalDuration, type RpcPacket } from "@/lib/demoScenario";
import { StudioEngine, TRACKS, type TrackKey } from "@/lib/webAudioEngine";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "StudioEngineer MCP — Autonomous Multi-Track Podcast Producer" },
      { name: "description", content: "An MCP server that lets LLMs produce multi-track podcasts with FFmpeg sidechain ducking and -16 LUFS mastering. Interactive DAW and JSON-RPC inspector." },
      { property: "og:title", content: "StudioEngineer MCP — Autonomous Multi-Track DAW for LLMs" },
      { property: "og:description", content: "Inspect live MCP JSON-RPC traffic and play a 4-track podcast mix with sidechain ducking in your browser." },
    ],
  }),
  component: Index,
});

const SERVER_URL = (import.meta.env["VITE_MCP_SERVER_URL"] as string | undefined) ?? "http://localhost:8000";
const OFF: Record<TrackKey, boolean> = { alex: false, sam: false, sfx: false, bgm: false };

function Index() {
  const [scenarioKey, setScenarioKey] = useState("pr-402");
  const scenario = SCENARIOS.find((s) => s.key === scenarioKey) ?? SCENARIOS[0]!;
  const duration = useMemo(() => totalDuration(scenario), [scenario]);
  const packets = useMemo(() => buildTrace(scenario), [scenario]);
  const filterComplex = useMemo(() => buildFilterComplex(scenario), [scenario]);

  const engineRef = useRef<StudioEngine | null>(null);
  const [pos, setPos] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false);
  const [loop, setLoop] = useState(true);
  const [mutes, setMutes] = useState(OFF);
  const [solos, setSolos] = useState(OFF);
  const [selected, setSelected] = useState<RpcPacket | null>(null);
  const [mode, setMode] = useState<Mode>("sim");
  const [liveStatus, setLiveStatus] = useState<"idle" | "checking" | "ok" | "fail">("idle");

  useEffect(() => {
    if (!engineRef.current) engineRef.current = new StudioEngine(scenario, duration);
    else engineRef.current.setScenario(scenario, duration);
    setPlaying(false);
    setPos(0);
    setSelected(null);
  }, [scenario, duration]);

  useEffect(() => () => engineRef.current?.dispose(), []);

  // auto-detect live server once
  useEffect(() => {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 1500);
    fetch(`${SERVER_URL}/api/sessions`, { signal: ctl.signal })
      .then((r) => { if (r.ok) { setMode("live"); setLiveStatus("ok"); } })
      .catch(() => {})
      .finally(() => clearTimeout(t));
    return () => ctl.abort();
  }, []);

  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    const tick = () => {
      const e = engineRef.current;
      if (!e) return;
      const p = e.position();
      if (p >= duration) {
        if (loop) { void e.play(0); setPos(0); }
        else { e.stop(); setPlaying(false); setPos(duration); return; }
      } else setPos(p);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, duration, loop]);

  const play = useCallback(async (from?: number) => {
    const e = engineRef.current;
    if (!e) return;
    await e.play(from);
    setStarted(true);
    setPlaying(true);
  }, []);

  const toggleMode = async () => {
    if (mode === "live") { setMode("sim"); setLiveStatus("idle"); return; }
    setMode("live");
    setLiveStatus("checking");
    try {
      const r = await fetch(`${SERVER_URL}/api/sessions`, { signal: AbortSignal.timeout(2000) });
      setLiveStatus(r.ok ? "ok" : "fail");
    } catch {
      setLiveStatus("fail");
    }
  };

  const setTrack = (which: "mute" | "solo", k: TrackKey) => {
    const e = engineRef.current;
    const setter = which === "mute" ? setMutes : setSolos;
    setter((prev) => {
      const next = { ...prev, [k]: !prev[k] };
      if (e) {
        if (which === "mute") e.muted = next; else e.solo = next;
        e.applyMix();
      }
      return next;
    });
  };

  return (
    <main className="pb-20">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
        <span className="flex items-center gap-2 font-mono text-sm"><span className="led" />studio-engineer-mcp</span>
        <span className="font-mono text-xs text-muted-foreground">v0.1.0 · {mode === "live" && liveStatus === "ok" ? "LIVE" : "SIM"}</span>
      </header>

      <HeroSection
        mode={mode}
        liveStatus={liveStatus}
        onToggleMode={toggleMode}
        onLaunch={() => {
          setScenarioKey("pr-402");
          document.getElementById("inspector")?.scrollIntoView({ behavior: "smooth" });
          setTimeout(() => void play(0), 50);
        }}
      />

      <div id="inspector">
        <McpProtocolInspector
          scenario={scenario}
          onScenario={setScenarioKey}
          packets={packets}
          positionMs={pos}
          started={started}
          selectedId={selected?.id ?? null}
          onSelect={(p) => {
            setSelected(p);
            document.getElementById("daw")?.scrollIntoView({ behavior: "smooth", block: "center" });
          }}
        />
      </div>

      <MultiTrackDaw
        engine={engineRef.current}
        scenario={scenario}
        duration={duration}
        positionMs={pos}
        playing={playing}
        loop={loop}
        mutes={mutes}
        solos={solos}
        highlightStem={selected?.stemId ?? null}
        highlightCue={selected?.cueId ?? null}
        onPlay={() => void play()}
        onPause={() => { engineRef.current?.pause(); setPlaying(false); }}
        onStop={() => { engineRef.current?.stop(); setPlaying(false); setPos(0); }}
        onLoop={() => setLoop((l) => !l)}
        onSeek={(ms) => { engineRef.current?.seek(ms); setPos(ms); }}
        onMute={(k) => setTrack("mute", k)}
        onSolo={(k) => setTrack("solo", k)}
      />

      <section className="mx-auto grid max-w-6xl gap-4 px-5 py-8 lg:grid-cols-2">
        <SidechainVisualizer scenario={scenario} positionMs={pos} />
        <FiltergraphDiagram filterComplex={filterComplex} />
      </section>

      <footer className="mx-auto max-w-6xl px-5 pt-6 font-mono text-xs text-muted-foreground">
        Tracks: {TRACKS.join(" · ")} — Python FastMCP server source lives in <code>/mcp-server</code>.
      </footer>
    </main>
  );
}
