import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { HeroSection, type Mode } from "@/components/showcase/HeroSection";
import { McpProtocolInspector } from "@/components/showcase/McpProtocolInspector";
import { MultiTrackDaw } from "@/components/showcase/MultiTrackDaw";
import { SidechainVisualizer } from "@/components/showcase/SidechainVisualizer";
import { FiltergraphDiagram } from "@/components/showcase/FiltergraphDiagram";
import { SCENARIOS, buildFilterComplex, buildTrace, totalDuration, type RpcPacket, type Scenario } from "@/lib/demoScenario";
import { GitHubStudioPanel } from "@/components/showcase/GitHubStudioPanel";
import { SetupPromptCard } from "@/components/showcase/SetupPromptCard";
import { ConnectionStatus, LocalStudioPanel } from "@/components/showcase/LocalStudioPanel";
import { episodeToScenario, useCloudServer, useLocalServer, warmCloud, type Episode } from "@/lib/localStudio";
import { StudioEngine, TRACKS, type TrackKey } from "@/lib/webAudioEngine";

export const Route = createFileRoute("/")({
  validateSearch: (s: Record<string, unknown>): { mode?: Mode } => {
    const m = s["mode"];
    return m === "demo" || m === "online" || m === "offline" ? { mode: m } : {};
  },
  head: () => ({
    meta: [
      { title: "Free Audio Podcasts for Your Code — StudioEngineer MCP" },
      { name: "description", content: "Generate audio podcasts for your code for free. Paste any public GitHub repo online, or connect your AI agent with one prompt for local code. An MCP server that lets LLMs produce multi-track podcasts with FFmpeg sidechain ducking and -16 LUFS mastering. Interactive DAW and JSON-RPC inspector." },
      { property: "og:title", content: "Generate audio podcasts for your code — free" },
      { property: "og:description", content: "Turn any public GitHub repo or your local code into a roast, explainer or postmortem podcast — free, with a live multitrack studio." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const OFF: Record<TrackKey, boolean> = { alex: false, sam: false, sfx: false, bgm: false };

function Index() {
  const [scenarioKey, setScenarioKey] = useState("pr-402");
  const [liveScenario, setLiveScenario] = useState<Scenario | null>(null);
  const { mode: urlMode } = Route.useSearch();
  const navigate = Route.useNavigate();
  const mode: Mode = urlMode ?? "picker";
  const conn = useLocalServer(mode === "offline");
  const cloud = useCloudServer(mode === "online");
  const scenario = liveScenario ?? SCENARIOS.find((s) => s.key === scenarioKey) ?? SCENARIOS[0]!;
  const loadEpisode = useCallback((ep: Episode, base?: string) => {
    const sc = episodeToScenario(ep, base);
    if (!sc) return;
    setLiveScenario(sc);
    setTimeout(() => document.getElementById("daw")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }, []);
  const showStudio = mode === "demo" || liveScenario !== null;
  const duration = useMemo(() => totalDuration(scenario), [scenario]);
  const packets = useMemo(() => buildTrace(scenario), [scenario]);
  const filterComplex = useMemo(() => buildFilterComplex(scenario), [scenario]);

  const engineRef = useRef<StudioEngine | null>(null);
  const [pos, setPos] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [loadingAudio, setLoadingAudio] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const playRequest = useRef(0);
  const [started, setStarted] = useState(false);
  const [loop, setLoop] = useState(true);
  const [mutes, setMutes] = useState(OFF);
  const [solos, setSolos] = useState(OFF);
  const [selected, setSelected] = useState<RpcPacket | null>(null);

  useEffect(() => {
    playRequest.current++;
    setLoadingAudio(false);
    setAudioError(null);
    if (!engineRef.current) engineRef.current = new StudioEngine(scenario, duration);
    else engineRef.current.setScenario(scenario, duration);
    setPlaying(false);
    setPos(0);
    setSelected(null);
  }, [scenario, duration]);

  useEffect(() => () => engineRef.current?.dispose(), []);

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
    const request = ++playRequest.current;
    setLoadingAudio(true);
    setAudioError(null);
    try {
      await e.play(from);
      if (request !== playRequest.current) return;
      setStarted(true);
      setPlaying(e.playing);
    } catch (error) {
      if (request === playRequest.current) setAudioError(error instanceof Error ? error.message : "Could not load dialogue. Please try Play again.");
    } finally {
      if (request === playRequest.current) setLoadingAudio(false);
    }
  }, []);

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
        {mode === "offline" && <ConnectionStatus conn={conn} />}
        {mode === "online" && (
          <span role="status" className="pill flex items-center gap-2 font-mono text-xs">
            <span className={`size-2 rounded-full ${cloud.state === "connected" ? "bg-wave" : cloud.state === "checking" ? "bg-muted-foreground" : "bg-destructive"}`} />
            {cloud.state === "connected" ? `Online · ${cloud.status?.tts_provider ?? ""} voices` : cloud.state === "checking" ? "Connecting…" : "Online server unreachable"}
          </span>
        )}
      </header>

      <HeroSection
        mode={mode}
        onWarmOnline={() => void warmCloud().catch(() => undefined)}
        onMode={(m) => {
          engineRef.current?.stop(); setPlaying(false);
          setLiveScenario(null);
          void navigate({ search: m === "picker" ? {} : { mode: m }, replace: true, resetScroll: false });
          if (m === "demo") {
            setScenarioKey("pr-402");
            setTimeout(() => { document.getElementById("inspector")?.scrollIntoView({ behavior: "smooth" }); void play(0); }, 80);
          }
        }}
      />

      {mode === "online" && <GitHubStudioPanel onLoad={loadEpisode} online={cloud.state === "checking" ? null : cloud.state === "connected"} onRetry={cloud.retry} />}
      {mode === "offline" && (
        <>
          {conn.state === "connected" ? (
            <p className="mx-auto max-w-6xl px-5 pt-4 text-sm text-muted-foreground">
              <span className="text-wave">●</span> Connected to <span className="text-foreground">{conn.status?.repo.repo_name}</span> — your agent is set up. Pick a commit below.
            </p>
          ) : <SetupPromptCard />}
          <LocalStudioPanel conn={conn} onLoad={(ep) => loadEpisode(ep)} />
        </>
      )}

      {showStudio && <>
      {liveScenario && (
        <p className="mx-auto max-w-6xl px-5 pt-6 text-sm text-muted-foreground">
          Now playing your episode: <span className="text-foreground">{liveScenario.title}</span>
        </p>
      )}
      <div id="inspector">
        <McpProtocolInspector
          scenario={scenario}
          onScenario={(k) => { setLiveScenario(null); setScenarioKey(k); }}
          packets={packets}
          positionMs={pos}
          started={playing}
          selectedId={selected?.id ?? null}
          demo={mode === "demo"}
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
        loadingAudio={loadingAudio}
        audioError={audioError}
        loop={loop}
        mutes={mutes}
        solos={solos}
        highlightStem={selected?.stemId ?? null}
        highlightCue={selected?.cueId ?? null}
        onPlay={() => void play()}
        onPause={() => { engineRef.current?.pause(); setPlaying(false); }}
        onStop={() => { playRequest.current++; setLoadingAudio(false); engineRef.current?.stop(); setPlaying(false); setPos(0); }}
        onLoop={() => setLoop((l) => !l)}
        onSeek={(ms) => { engineRef.current?.seek(ms); setPos(ms); }}
        onMute={(k) => setTrack("mute", k)}
        onSolo={(k) => setTrack("solo", k)}
      />

      <section className="mx-auto grid max-w-6xl gap-4 px-5 py-8 lg:grid-cols-2">
        <SidechainVisualizer scenario={scenario} positionMs={pos} />
        <FiltergraphDiagram filterComplex={filterComplex} />
      </section>
      </>}

      <footer className="mx-auto max-w-6xl px-5 pt-6 font-mono text-xs text-muted-foreground">
        Tracks: {TRACKS.join(" · ")} — Python FastMCP server source lives in <code>/mcp-server</code>.
      </footer>
    </main>
  );
}
