import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { LoaderCircle, Pause, Play } from "lucide-react";
import { SFX_ICONS, duckingAt, type Scenario } from "@/lib/demoScenario";
import { fmtTime, toDb, type StudioEngine, type TrackKey } from "@/lib/webAudioEngine";

const LANES: { key: TrackKey; name: string; meta: string; color: string }[] = [
  { key: "alex", name: "Host Alex (Staff SRE)", meta: "Pan 25% L", color: "bg-alex" },
  { key: "sam", name: "Host Sam (Builder)", meta: "Pan 25% R", color: "bg-sam" },
  { key: "sfx", name: "SFX Bus", meta: "cues", color: "bg-primary" },
  { key: "bgm", name: "BGM · lofi_synth_bed.wav", meta: "sidechain", color: "bg-wave" },
];

function Waveform({ seed, className }: { seed: number; className: string }) {
  const bars = Array.from({ length: 28 }, (_, i) => 25 + Math.abs(Math.sin(i * 1.7 + seed) * Math.cos(i * 0.6 + seed * 2)) * 70);
  return (
    <div className="flex h-full items-center gap-[2px] px-1">
      {bars.map((h, i) => <div key={i} className={`w-[2px] flex-1 rounded-full ${className}`} style={{ height: `${Math.round(h)}%` }} />)}
    </div>
  );
}

function BgmLane({ scenario, duration }: { scenario: Scenario; duration: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const draw = () => {
      const w = (c.width = c.clientWidth * devicePixelRatio);
      const h = (c.height = c.clientHeight * devicePixelRatio);
      const g = c.getContext("2d");
      if (!g) return;
      const css = getComputedStyle(c);
      g.clearRect(0, 0, w, h);
      g.fillStyle = css.getPropertyValue("--wave").trim();
      g.globalAlpha = 0.35;
      for (let x = 0; x < w; x += 3 * devicePixelRatio) {
        const t = (x / w) * duration;
        const amp = Math.pow(10, duckingAt(scenario, t) / 20);
        const a = (0.3 + 0.6 * Math.abs(Math.sin(x * 0.05) * Math.sin(x * 0.013))) * amp * h * 0.45;
        g.fillRect(x, h / 2 - a, 2 * devicePixelRatio, a * 2);
      }
      g.globalAlpha = 1;
      g.strokeStyle = css.getPropertyValue("--primary").trim();
      g.lineWidth = 2 * devicePixelRatio;
      g.beginPath();
      for (let x = 0; x <= w; x += 2) {
        const gr = duckingAt(scenario, (x / w) * duration);
        const y = h * 0.12 + (-gr / 12) * h * 0.7;
        if (x === 0) g.moveTo(x, y); else g.lineTo(x, y);
      }
      g.stroke();
    };
    draw();
    window.addEventListener("resize", draw);
    return () => window.removeEventListener("resize", draw);
  }, [scenario, duration]);
  return <canvas ref={ref} className="h-full w-full" />;
}

export function MultiTrackDaw({
  engine,
  scenario,
  duration,
  positionMs,
  playing,
  loadingAudio,
  audioError,
  loop,
  mutes,
  solos,
  highlightStem,
  highlightCue,
  onPlay,
  onPause,
  onStop,
  onLoop,
  onSeek,
  onMute,
  onSolo,
}: {
  engine: StudioEngine | null;
  scenario: Scenario;
  duration: number;
  positionMs: number;
  playing: boolean;
  loadingAudio: boolean;
  audioError: string | null;
  loop: boolean;
  mutes: Record<TrackKey, boolean>;
  solos: Record<TrackKey, boolean>;
  highlightStem: string | null;
  highlightCue: string | null;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onLoop: () => void;
  onSeek: (ms: number) => void;
  onMute: (k: TrackKey) => void;
  onSolo: (k: TrackKey) => void;
}) {
  const pct = (ms: number) => `${(ms / duration) * 100}%`;
  const [l, r] = engine?.levels() ?? [0, 0];
  const dbL = toDb(l * 2.5), dbR = toDb(r * 2.5);
  const gr = playing ? duckingAt(scenario, positionMs) : 0;
  const voiceActive = scenario.stems.filter((s) => positionMs >= s.start_ms && positionMs <= s.start_ms + s.duration_ms);
  const seconds = Array.from({ length: Math.floor(duration / 2000) + 1 }, (_, i) => i * 2000);

  return (
    <section id="daw" className="mx-auto max-w-6xl px-5 py-8">
      <div className="panel overflow-hidden">
        {/* Transport */}
        <div className="flex flex-wrap items-center gap-3 border-b border-border bg-surface-2 px-4 py-3">
          <div className="flex gap-1">
            <Button size="icon" aria-label={loadingAudio ? "Loading dialogue" : playing ? "Pause" : "Play"} disabled={loadingAudio} onClick={playing ? onPause : onPlay} className="h-9 w-11">{loadingAudio ? <LoaderCircle className="animate-spin motion-reduce:animate-none" /> : playing ? <Pause /> : <Play />}</Button>
            <button aria-label="Stop" onClick={onStop} className="h-9 w-9 rounded-md border border-border bg-card">■</button>
            <button aria-label="Loop" onClick={onLoop} className={`h-9 w-9 rounded-md border bg-card ${loop ? "border-primary text-primary" : "border-border text-muted-foreground"}`}>⟲</button>
          </div>
          <div className="rounded-md border border-border bg-background px-3 py-1.5 font-mono text-lg tabular-nums text-primary">{fmtTime(positionMs)}</div>
          <div className="flex flex-col gap-1" aria-label="Master VU meter">
            {[dbL, dbR].map((db, i) => (
              <div key={i} className="flex items-center gap-1 font-mono text-[9px] text-muted-foreground">
                {i ? "R" : "L"}
                <div className="h-1.5 w-28 overflow-hidden rounded-full bg-background">
                  <div className="h-full bg-gradient-to-r from-signal via-signal to-primary transition-[width] duration-75" style={{ width: `${((db + 60) / 60) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="ml-auto flex flex-wrap gap-1.5">
            <span className="pill text-signal">-16.0 LUFS</span>
            <span className="pill">-1.5 dBTP</span>
            <span className="pill text-primary">Sidechain GR: {gr.toFixed(1)} dB</span>
          </div>
        </div>
        {audioError && <p role="alert" className="px-4 py-2 text-sm text-destructive">{audioError}</p>}

        <div className="overflow-x-auto">
          <div className="min-w-[760px]">
            {/* Ruler */}
            <div className="grid grid-cols-[180px_1fr] border-b border-border">
              <div className="px-3 py-1 font-mono text-[10px] text-muted-foreground">{scenario.sessionId}</div>
              <div
                className="relative h-6 cursor-pointer"
                onClick={(e) => {
                  const r = e.currentTarget.getBoundingClientRect();
                  onSeek(((e.clientX - r.left) / r.width) * duration);
                }}
              >
                {seconds.map((s) => (
                  <span key={s} className="absolute top-1 -translate-x-1/2 font-mono text-[9px] text-muted-foreground" style={{ left: pct(s) }}>{s / 1000}s</span>
                ))}
              </div>
            </div>

            {LANES.map((lane) => {
              const audible = engine ? engine.audible(lane.key) : true;
              return (
                <div key={lane.key} className={`grid grid-cols-[180px_1fr] border-b border-border ${audible ? "" : "opacity-40"}`}>
                  <div className="flex flex-col justify-center gap-1.5 border-r border-border px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${lane.color}`} />
                      <span className="truncate text-xs font-semibold">{lane.name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => onMute(lane.key)} className={`h-5 w-6 rounded font-mono text-[10px] ${mutes[lane.key] ? "bg-destructive text-destructive-foreground" : "bg-secondary"}`}>M</button>
                      <button onClick={() => onSolo(lane.key)} className={`h-5 w-6 rounded font-mono text-[10px] ${solos[lane.key] ? "bg-signal text-primary-foreground" : "bg-secondary"}`}>S</button>
                      <span className="ml-1 font-mono text-[9px] text-muted-foreground">{lane.meta}</span>
                    </div>
                  </div>
                  <div className="relative h-16">
                    {(lane.key === "alex" || lane.key === "sam") &&
                      scenario.stems
                        .filter((s) => (lane.key === "alex") === s.speaker.startsWith("Alex"))
                        .map((s) => {
                          const active = positionMs >= s.start_ms && positionMs <= s.start_ms + s.duration_ms;
                          const hi = highlightStem === s.stem_id;
                          return (
                            <div
                              key={s.stem_id}
                              title={`${s.stem_id} · ${s.emotion} · overlap ${s.overlap_ms}ms\n“${s.text}”`}
                              onClick={() => onSeek(s.start_ms)}
                              className={`group absolute top-2 bottom-2 cursor-pointer overflow-hidden rounded border transition ${
                                lane.key === "alex" ? "border-alex/60 bg-alex/15" : "border-sam/60 bg-sam/15"
                              } ${active ? "brightness-150" : ""} ${hi ? "ring-2 ring-primary ring-offset-1 ring-offset-background" : ""}`}
                              style={{ left: pct(s.start_ms), width: pct(s.duration_ms) }}
                            >
                              <Waveform seed={s.start_ms} className={lane.key === "alex" ? "bg-alex/70" : "bg-sam/70"} />
                              <span className="absolute top-0.5 left-1 font-mono text-[8px] text-foreground/80">{s.stem_id}</span>
                              {s.overlap_ms < 0 && (
                                <span
                                  className="absolute inset-y-0 left-0 border-r border-dashed border-primary bg-primary/30"
                                  style={{ width: `${(-s.overlap_ms / s.duration_ms) * 100}%` }}
                                  title={`interruption ${s.overlap_ms}ms`}
                                />
                              )}
                            </div>
                          );
                        })}
                    {lane.key === "sfx" &&
                      scenario.sfx.map((c) => (
                        <div
                          key={c.cue_id}
                          className={`absolute top-1 bottom-1 flex -translate-x-1/2 flex-col items-center ${highlightCue === c.cue_id ? "scale-125" : ""} transition`}
                          style={{ left: pct(c.timestamp_ms) }}
                          title={`${c.sfx_id}.wav @ ${c.timestamp_ms}ms · ${c.gain_db} dB`}
                        >
                          <span className="text-base leading-none">{SFX_ICONS[c.sfx_id]}</span>
                          <span className="w-px flex-1 bg-primary" />
                          <span className="font-mono text-[8px] text-muted-foreground">{c.sfx_id}</span>
                        </div>
                      ))}
                    {lane.key === "bgm" && <BgmLane scenario={scenario} duration={duration} />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="relative">
          {/* Playhead overlay drawn via absolute in lanes container would need ref; instead show caption */}
        </div>
        <div className="flex min-h-12 items-center gap-3 px-4 py-3 text-sm">
          {voiceActive.length ? (
            voiceActive.map((s) => (
              <p key={s.stem_id} className="flex-1">
                <span className={`font-mono text-xs ${s.speaker.startsWith("Alex") ? "text-alex" : "text-sam"}`}>{(s.speaker.split(" ")[0] ?? "").toUpperCase()}</span>{" "}
                <span className="text-muted-foreground">“{s.text}”</span>
              </p>
            ))
          ) : (
            <p className="font-mono text-xs text-muted-foreground">Try: play, then Solo [S] Alex or Mute [M] the BGM — the mix responds live in your browser.</p>
          )}
        </div>
      </div>
      <Playhead positionMs={positionMs} duration={duration} />
    </section>
  );
}

/** Thin progress rail under the DAW (kept separate so lanes can scroll horizontally on mobile). */
function Playhead({ positionMs, duration }: { positionMs: number; duration: number }) {
  return (
    <div className="mt-2 h-1 overflow-hidden rounded-full bg-secondary">
      <div className="h-full bg-primary" style={{ width: `${Math.min(100, (positionMs / duration) * 100)}%` }} />
    </div>
  );
}
