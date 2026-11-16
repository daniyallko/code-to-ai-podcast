import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { HeroSection, type Mode } from "@/components/showcase/HeroSection";
import { McpProtocolInspector } from "@/components/showcase/McpProtocolInspector";
import { MultiTrackDaw } from "@/components/showcase/MultiTrackDaw";
import { SidechainVisualizer } from "@/components/showcase/SidechainVisualizer";
import { FiltergraphDiagram } from "@/components/showcase/FiltergraphDiagram";
import { StudioHeader, type HeaderStatus } from "@/components/showcase/StudioHeader";
import {
  SCENARIOS,
  buildFilterComplex,
  buildTrace,
  totalDuration,
  type RpcPacket,
  type Scenario,
} from "@/lib/demoScenario";
import { GitHubStudioPanel } from "@/components/showcase/GitHubStudioPanel";
import { SetupPromptCard } from "@/components/showcase/SetupPromptCard";
import { LocalStudioPanel } from "@/components/showcase/LocalStudioPanel";
import {
  CLOUD_URL,
  LOCAL_URL,
  createApi,
  episodeToScenario,
  useCloudServer,
  useLocalServer,
  warmCloud,
  type Episode,
} from "@/lib/localStudio";
import { StudioEngine, TRACKS, type TrackKey } from "@/lib/webAudioEngine";
import { studioVisibility } from "@/lib/studioMode";

export const Route = createFileRoute("/")({
  validateSearch: (s: Record<string, unknown>): { mode?: Mode } => {
    const m = s["mode"];
    return m === "demo" || m === "online" || m === "offline" ? { mode: m } : {};
  },
  head: () => ({
    meta: [
      { title: "Free Audio Podcasts for Your Code — StudioEngineer MCP" },
      {
        name: "description",
        content:
          "Generate audio podcasts for your code for free. Paste any public GitHub repo online, or connect your AI agent with one prompt for local code. An MCP server that lets LLMs produce multi-track podcasts with FFmpeg sidechain ducking and -16 LUFS mastering. Interactive DAW and JSON-RPC inspector.",
      },
      { property: "og:title", content: "Generate audio podcasts for your code — free" },
      {
        property: "og:description",
        content:
          "Turn any public GitHub repo or your local code into a roast, explainer or postmortem podcast — free, with a live multitrack studio.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const OFF: Record<TrackKey, boolean> = { alex: false, sam: false, sfx: false, bgm: false };

function scrollToId(id: string, block: ScrollLogicalPosition = "start") {
  const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ? "auto"
    : "smooth";
  document.getElementById(id)?.scrollIntoView({ behavior, block });
}

function Index() {
  const [scenarioKey, setScenarioKey] = useState("pr-402");
  const [liveScenario, setLiveScenario] = useState<Scenario | null>(null);
  const [liveMasterUrl, setLiveMasterUrl] = useState<string | null>(null);
  const [generationBusy, setGenerationBusy] = useState(false);
  const { mode: urlMode } = Route.useSearch();
  const navigate = Route.useNavigate();
  const mode: Mode = urlMode ?? "picker";
  const conn = useLocalServer(mode === "offline");
  const cloud = useCloudServer(mode === "online");
  const scenario = liveScenario ?? SCENARIOS.find((s) => s.key === scenarioKey) ?? SCENARIOS[0]!;
  const { showDaw, showTelemetry } = studioVisibility(mode, liveScenario !== null);
  const duration = useMemo(() => totalDuration(scenario), [scenario]);
  const packets = useMemo(() => buildTrace(scenario), [scenario]);
  const filterComplex = useMemo(() => buildFilterComplex(scenario), [scenario]);

  const engineRef = useRef<StudioEngine | null>(null);
  const [pos, setPos] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [loadingAudio, setLoadingAudio] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const playRequest = useRef(0);
  const previewPlayTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const modeRef = useRef<Mode>(mode);
  const pendingModeRef = useRef<Mode | null>(null);
  const [loop, setLoop] = useState(true);
  const [mutes, setMutes] = useState(OFF);
  const [solos, setSolos] = useState(OFF);
  const [selected, setSelected] = useState<RpcPacket | null>(null);

  const loadEpisode = useCallback((ep: Episode, base?: string) => {
    const sc = episodeToScenario(ep, base);
    if (!sc) return;
    setLiveScenario(sc);
    setLiveMasterUrl(createApi(base ?? LOCAL_URL).masterUrl(ep.id));
    setTimeout(() => scrollToId("daw"), 50);
  }, []);

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

  useEffect(() => {
    modeRef.current = mode;
    if (pendingModeRef.current !== mode && previewPlayTimer.current) {
      clearTimeout(previewPlayTimer.current);
      previewPlayTimer.current = null;
      pendingModeRef.current = null;
    }
    playRequest.current++;
    setLoadingAudio(false);
    engineRef.current?.stop();
    setPlaying(false);
    setPos(0);
    setLiveScenario(null);
    setLiveMasterUrl(null);
    setGenerationBusy(false);
    setSelected(null);
  }, [mode]);

  useEffect(
    () => () => {
      if (previewPlayTimer.current) clearTimeout(previewPlayTimer.current);
      playRequest.current++;
      engineRef.current?.dispose();
    },
    [],
  );

  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    const tick = () => {
      const e = engineRef.current;
      if (!e) return;
      const p = e.position();
      if (p >= duration) {
        if (loop) {
          void e.play(0);
          setPos(0);
        } else {
          e.stop();
          setPlaying(false);
          setPos(duration);
          return;
        }
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
      setPlaying(e.playing);
    } catch (error) {
      if (request === playRequest.current)
        setAudioError(
          error instanceof Error
            ? error.message
            : "Could not load dialogue. Please try Play again.",
        );
    } finally {
      if (request === playRequest.current) setLoadingAudio(false);
    }
  }, []);

  const activateMode = useCallback(
    (next: Mode, playDemo = false) => {
      if (previewPlayTimer.current) {
        clearTimeout(previewPlayTimer.current);
        previewPlayTimer.current = null;
      }
      pendingModeRef.current = next;
      if (next === "demo") setScenarioKey("pr-402");
      void navigate({
        search: next === "picker" ? {} : { mode: next },
        replace: true,
        resetScroll: false,
      });
      if (next === "demo") {
        previewPlayTimer.current = setTimeout(() => {
          previewPlayTimer.current = null;
          if (modeRef.current !== next || pendingModeRef.current !== next) return;
          pendingModeRef.current = null;
          scrollToId("inspector");
          if (playDemo) void play(0);
        }, 80);
      }
    },
    [navigate, play],
  );

  const setTrack = (which: "mute" | "solo", k: TrackKey) => {
    const e = engineRef.current;
    const setter = which === "mute" ? setMutes : setSolos;
    setter((prev) => {
      const next = { ...prev, [k]: !prev[k] };
      if (e) {
        if (which === "mute") e.muted = next;
        else e.solo = next;
        e.applyMix();
      }
      return next;
    });
  };

  let headerStatus: HeaderStatus = {
    tone: "neutral",
    label: "Prerecorded demo · no server",
    detail: "Measured dialogue assets",
  };
  if (mode === "online") {
    headerStatus =
      cloud.state === "connected"
        ? {
            tone: generationBusy ? "busy" : "connected",
            label: generationBusy
              ? "Online · generating"
              : `Online · ${cloud.status?.tts_provider ?? "TTS"} voices`,
            detail: new URL(CLOUD_URL).host,
          }
        : cloud.state === "checking"
          ? { tone: "busy", label: "Connecting cloud", detail: new URL(CLOUD_URL).host }
          : {
              tone: "offline",
              label: "Online server unreachable",
              detail: new URL(CLOUD_URL).host,
            };
  } else if (mode === "offline") {
    headerStatus =
      conn.state === "connected"
        ? {
            tone: generationBusy ? "busy" : "connected",
            label: generationBusy
              ? "Local · generating"
              : `Local · ${conn.status?.repo.repo_name ?? "server"}`,
            detail: conn.status?.tts_provider,
          }
        : conn.state === "checking"
          ? { tone: "busy", label: "Checking local server", detail: new URL(LOCAL_URL).host }
          : { tone: "offline", label: "Waiting for local server", detail: new URL(LOCAL_URL).host };
  }

  return (
    <main className="pb-20">
      <StudioHeader status={headerStatus} />

      <HeroSection
        mode={mode}
        onWarmOnline={() => void warmCloud().catch(() => undefined)}
        onMode={(next) => activateMode(next)}
      />

      {mode === "online" && (
        <GitHubStudioPanel
          onLoad={loadEpisode}
          online={cloud.state === "checking" ? null : cloud.state === "connected"}
          onRetry={cloud.retry}
          onBusyChange={setGenerationBusy}
        />
      )}
      {mode === "offline" && (
        <>
          {conn.state === "connected" ? (
            <p className="mx-auto max-w-7xl px-4 pt-6 text-sm text-muted-foreground sm:px-5">
              <span className="text-wave">●</span> Connected to{" "}
              <span className="text-foreground">{conn.status?.repo.repo_name}</span> — your agent is
              set up. Pick a commit below.
            </p>
          ) : (
            <SetupPromptCard />
          )}
          <LocalStudioPanel
            conn={conn}
            onLoad={(ep) => loadEpisode(ep)}
            onBusyChange={setGenerationBusy}
          />
        </>
      )}

      {showTelemetry && (
        <>
          {liveScenario && (
            <p className="mx-auto max-w-7xl px-4 pt-6 text-sm text-muted-foreground sm:px-5">
              Now playing your episode:{" "}
              <span className="text-foreground">{liveScenario.title}</span>
            </p>
          )}
          <div id="inspector">
            <McpProtocolInspector
              scenario={scenario}
              onScenario={(key) => {
                setLiveScenario(null);
                setLiveMasterUrl(null);
                setScenarioKey(key);
              }}
              packets={packets}
              positionMs={pos}
              started={playing}
              selectedId={selected?.id ?? null}
              demo={mode === "demo"}
              onSelect={(packet) => {
                setSelected(packet);
                scrollToId("daw", "center");
              }}
            />
          </div>
        </>
      )}

      {showDaw && (
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
          masterUrl={liveMasterUrl}
          preview={mode === "picker"}
          onPlay={mode === "picker" ? () => activateMode("demo", true) : () => void play()}
          onPause={() => {
            engineRef.current?.pause();
            setPlaying(false);
          }}
          onStop={() => {
            playRequest.current++;
            setLoadingAudio(false);
            engineRef.current?.stop();
            setPlaying(false);
            setPos(0);
          }}
          onLoop={() => setLoop((value) => !value)}
          onSeek={(ms) => {
            engineRef.current?.seek(ms);
            setPos(ms);
          }}
          onMute={(key) => setTrack("mute", key)}
          onSolo={(key) => setTrack("solo", key)}
        />
      )}

      {showTelemetry && (
        <section className="mx-auto grid max-w-7xl gap-4 px-4 py-8 sm:px-5 lg:grid-cols-2">
          <SidechainVisualizer scenario={scenario} positionMs={pos} playing={playing} />
          <FiltergraphDiagram filterComplex={filterComplex} playing={playing} />
        </section>
      )}

      <footer className="mx-auto max-w-7xl px-4 pt-6 font-mono text-[10px] leading-5 text-muted-foreground sm:px-5">
        TRACKS: {TRACKS.join(" · ").toUpperCase()} — Python FastMCP server source lives in{" "}
        <code>/mcp-server</code>.
      </footer>
    </main>
  );
}
