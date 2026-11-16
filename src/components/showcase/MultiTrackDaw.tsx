import { useEffect, useRef } from "react";
import {
  AudioLines,
  Download,
  LoaderCircle,
  Music2,
  Pause,
  Play,
  Repeat2,
  Square,
} from "lucide-react";
import { duckingAt, type Scenario } from "@/lib/demoScenario";
import { fmtTime, toDb, type StudioEngine, type TrackKey } from "@/lib/webAudioEngine";

const LANES: { key: TrackKey; short: string; name: string; meta: string; color: string }[] = [
  { key: "alex", short: "Alex", name: "Alex · Staff SRE", meta: "PAN 25% L", color: "bg-alex" },
  { key: "sam", short: "Sam", name: "Sam · Builder", meta: "PAN 25% R", color: "bg-sam" },
  { key: "sfx", short: "SFX", name: "SFX Bus", meta: "CUE MARKERS", color: "bg-coral" },
  { key: "bgm", short: "BGM", name: "BGM · Synth bed", meta: "SIDECHAIN", color: "bg-primary" },
];

function Waveform({ seed, className }: { seed: number; className: string }) {
  const bars = Array.from(
    { length: 32 },
    (_, i) => 22 + Math.abs(Math.sin(i * 1.7 + seed) * Math.cos(i * 0.6 + seed * 2)) * 72,
  );
  return (
    <div aria-hidden="true" className="flex h-full items-center gap-[2px] px-1 pt-3">
      {bars.map((height, index) => (
        <div
          key={index}
          className={`w-[2px] flex-1 ${className}`}
          style={{ height: `${Math.round(height)}%` }}
        />
      ))}
    </div>
  );
}

function BgmLane({ scenario, duration }: { scenario: Scenario; duration: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const draw = () => {
      const dpr = window.devicePixelRatio || 1;
      const width = (canvas.width = canvas.clientWidth * dpr);
      const height = (canvas.height = canvas.clientHeight * dpr);
      const context = canvas.getContext("2d");
      if (!context) return;
      const css = getComputedStyle(canvas);
      context.clearRect(0, 0, width, height);
      context.fillStyle = css.getPropertyValue("--primary").trim();
      context.globalAlpha = 0.22;
      for (let x = 0; x < width; x += 3 * dpr) {
        const time = (x / width) * duration;
        const amp = Math.pow(10, duckingAt(scenario, time) / 20);
        const a =
          (0.3 + 0.6 * Math.abs(Math.sin(x * 0.05) * Math.sin(x * 0.013))) * amp * height * 0.42;
        context.fillRect(x, height / 2 - a, 2 * dpr, a * 2);
      }
      context.globalAlpha = 1;
      context.strokeStyle = css.getPropertyValue("--coral").trim();
      context.lineWidth = 1.5 * dpr;
      context.beginPath();
      for (let x = 0; x <= width; x += 2) {
        const reduction = duckingAt(scenario, (x / width) * duration);
        const y = height * 0.12 + (-reduction / 12) * height * 0.7;
        if (x === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      }
      context.stroke();
    };
    draw();
    window.addEventListener("resize", draw);
    return () => window.removeEventListener("resize", draw);
  }, [scenario, duration]);
  return (
    <canvas
      ref={ref}
      role="img"
      aria-label="BGM sidechain ducking envelope"
      className="h-full w-full"
    >
      Music envelope with scenario-derived gain reduction.
    </canvas>
  );
}

function TimelineRuler({
  duration,
  positionMs,
  onSeek,
  seconds,
  pct,
}: {
  duration: number;
  positionMs: number;
  onSeek: (ms: number) => void;
  seconds: number[];
  pct: (ms: number) => string;
}) {
  const seekAt = (clientX: number, element: HTMLElement) => {
    const rect = element.getBoundingClientRect();
    const ratio = rect.width > 0 ? Math.min(1, Math.max(0, (clientX - rect.left) / rect.width)) : 0;
    onSeek(ratio * duration);
  };

  return (
    <div
      role="slider"
      tabIndex={0}
      aria-label="Timeline"
      aria-valuemin={0}
      aria-valuemax={duration}
      aria-valuenow={Math.min(duration, Math.max(0, positionMs))}
      aria-valuetext={fmtTime(positionMs)}
      className="relative h-8 cursor-ew-resize border-l border-transparent bg-background/40 focus:border-primary"
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        seekAt(event.clientX, event.currentTarget);
      }}
      onPointerMove={(event) => {
        if (event.buttons === 1) seekAt(event.clientX, event.currentTarget);
      }}
      onKeyDown={(event) => {
        const step = event.shiftKey ? 1000 : 100;
        let next: number | null = null;
        if (event.key === "ArrowRight") next = Math.min(duration, positionMs + step);
        if (event.key === "ArrowLeft") next = Math.max(0, positionMs - step);
        if (event.key === "Home") next = 0;
        if (event.key === "End") next = duration;
        if (next !== null) {
          event.preventDefault();
          onSeek(next);
        }
      }}
    >
      {seconds.map((time) => (
        <span
          key={time}
          aria-hidden="true"
          className="absolute top-2 -translate-x-1/2 font-mono text-[9px] tabular-nums text-muted-foreground"
          style={{ left: pct(time) }}
        >
          {time / 1000}s
        </span>
      ))}
    </div>
  );
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
  masterUrl,
  preview = false,
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
  masterUrl?: string | null;
  preview?: boolean;
}) {
  const pct = (ms: number) =>
    `${duration > 0 ? Math.min(100, Math.max(0, (ms / duration) * 100)) : 0}%`;
  const [left, right] = engine?.levels() ?? [0, 0];
  const dbLeft = toDb(left * 2.5);
  const dbRight = toDb(right * 2.5);
  const reduction = playing ? duckingAt(scenario, positionMs) : 0;
  const voiceActive = scenario.stems.filter(
    (stem) => positionMs >= stem.start_ms && positionMs <= stem.start_ms + stem.duration_ms,
  );
  const seconds = Array.from(
    { length: Math.floor(duration / 2000) + 1 },
    (_, index) => index * 2000,
  );
  const glow = playing ? 0.25 + Math.min(0.55, (left + right) * 1.5) : 0;

  return (
    <section id="daw" className="mx-auto max-w-7xl scroll-mt-4 px-4 py-8 sm:px-5">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[9px] tracking-[0.16em] text-primary">
            MULTITRACK WORKSTATION · 04 CHANNELS
          </p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight">Broadcast mix</h2>
        </div>
        {preview && (
          <span className="pill border-primary/40 text-primary">
            DEMO PREVIEW · PRESS PLAY TO ENTER
          </span>
        )}
      </div>

      <div
        className="rack-panel relative overflow-hidden"
        style={{ boxShadow: glow ? `0 0 34px -16px rgb(0 242 254 / ${glow})` : undefined }}
      >
        <div className="flex flex-wrap items-center gap-3 border-b border-border bg-surface-2/80 px-3 py-3 sm:px-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label={loadingAudio ? "Loading dialogue" : playing ? "Pause" : "Play"}
              disabled={loadingAudio}
              onClick={playing ? onPause : onPlay}
              className={`hardware-button size-12 rounded-full ${playing ? "border-wave/70 text-wave shadow-[0_0_18px_-6px_var(--wave)]" : "border-primary/60 bg-primary text-primary-foreground"}`}
            >
              {loadingAudio ? (
                <LoaderCircle className="size-5 animate-spin motion-reduce:animate-none" />
              ) : playing ? (
                <Pause className="size-5" />
              ) : (
                <Play className="ml-0.5 size-5" />
              )}
            </button>
            <button
              type="button"
              aria-label="Stop"
              onClick={onStop}
              className="hardware-button size-11"
            >
              <Square className="size-3.5" />
            </button>
            <button
              type="button"
              aria-label="Loop"
              aria-pressed={loop}
              onClick={onLoop}
              className={`hardware-button size-11 ${loop ? "border-primary/60 text-primary" : "text-muted-foreground"}`}
            >
              <Repeat2 className="size-4" />
            </button>
          </div>

          <div className="rounded border border-border bg-background px-3 py-2 font-mono text-sm tabular-nums text-primary sm:text-base">
            {fmtTime(positionMs)} / {fmtTime(duration)}
          </div>

          <div className="hidden flex-col gap-1.5 sm:flex" aria-label="Master VU meter">
            {[dbLeft, dbRight].map((db, index) => (
              <div
                key={index}
                className="flex items-center gap-2 font-mono text-[9px] text-muted-foreground"
              >
                {index ? "R" : "L"}
                <div className="h-1.5 w-24 overflow-hidden bg-background md:w-28">
                  <div
                    className="h-full bg-gradient-to-r from-signal via-primary to-coral"
                    style={{ width: `${Math.min(100, Math.max(0, ((db + 60) / 60) * 100))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="ml-auto flex flex-wrap items-center gap-2 font-mono text-[9px]">
            <span className="pill text-signal">−16 LUFS</span>
            <span className="pill text-coral">GR {reduction.toFixed(1)} dB</span>
            {masterUrl && (
              <a href={masterUrl} download className="hardware-button min-h-11 px-3 text-xs">
                <Download className="size-4" /> Export MP3
              </a>
            )}
          </div>
        </div>
        {audioError && (
          <p
            role="alert"
            className="border-b border-coral/40 bg-coral/5 px-4 py-2 text-sm text-coral"
          >
            {audioError}
          </p>
        )}

        <div
          className="overflow-x-auto"
          aria-label="Multitrack timeline; scroll horizontally on small screens"
        >
          <div className="relative min-w-[760px]">
            <div className="grid grid-cols-[150px_1fr] border-b border-border sm:grid-cols-[180px_1fr]">
              <div className="flex items-center px-3 font-mono text-[9px] text-muted-foreground">
                {scenario.sessionId}
              </div>
              <TimelineRuler
                duration={duration}
                positionMs={positionMs}
                onSeek={onSeek}
                seconds={seconds}
                pct={pct}
              />
            </div>

            {LANES.map((lane) => {
              const audible = engine ? engine.audible(lane.key) : true;
              return (
                <div
                  key={lane.key}
                  className={`grid grid-cols-[150px_1fr] border-b border-border sm:grid-cols-[180px_1fr] ${audible ? "" : "opacity-45"}`}
                >
                  <div className="flex flex-col justify-center gap-2 border-r border-border px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className={`size-2 flex-none rounded-full ${lane.color}`} />
                      <span className="truncate text-xs font-semibold">{lane.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        aria-label={`Mute ${lane.short}`}
                        aria-pressed={mutes[lane.key]}
                        onClick={() => onMute(lane.key)}
                        className={`size-11 rounded border font-mono text-[11px] ${mutes[lane.key] ? "border-coral/70 bg-coral/15 text-coral" : "border-border bg-secondary text-muted-foreground"}`}
                      >
                        M
                      </button>
                      <button
                        type="button"
                        aria-label={`Solo ${lane.short}`}
                        aria-pressed={solos[lane.key]}
                        onClick={() => onSolo(lane.key)}
                        className={`size-11 rounded border font-mono text-[11px] ${solos[lane.key] ? "border-primary/70 bg-primary/15 text-primary" : "border-border bg-secondary text-muted-foreground"}`}
                      >
                        S
                      </button>
                      <span className="ml-1 hidden font-mono text-[8px] text-muted-foreground xl:inline">
                        {lane.meta}
                      </span>
                    </div>
                  </div>
                  <div className="relative h-[4.5rem] bg-background/20">
                    {(lane.key === "alex" || lane.key === "sam") &&
                      scenario.stems
                        .filter((stem) => (lane.key === "alex") === stem.speaker.startsWith("Alex"))
                        .map((stem) => {
                          const active =
                            positionMs >= stem.start_ms &&
                            positionMs <= stem.start_ms + stem.duration_ms;
                          const highlighted = highlightStem === stem.stem_id;
                          return (
                            <button
                              key={stem.stem_id}
                              type="button"
                              aria-label={`Seek to ${stem.stem_id}`}
                              title={`${stem.stem_id} · ${stem.emotion} · overlap ${stem.overlap_ms}ms\n“${stem.text}”`}
                              onClick={() => onSeek(stem.start_ms)}
                              className={`group absolute bottom-2 top-2 cursor-pointer overflow-hidden rounded-sm border text-left transition ${lane.key === "alex" ? "border-alex/50 bg-alex/10" : "border-sam/50 bg-sam/10"} ${active ? "brightness-150" : ""} ${highlighted ? "ring-2 ring-primary" : ""}`}
                              style={{ left: pct(stem.start_ms), width: pct(stem.duration_ms) }}
                            >
                              <Waveform
                                seed={stem.start_ms}
                                className={lane.key === "alex" ? "bg-alex/65" : "bg-sam/65"}
                              />
                              <span className="absolute left-1 top-0.5 font-mono text-[8px] text-foreground/80">
                                {stem.stem_id}
                              </span>
                              {stem.overlap_ms < 0 && (
                                <span
                                  className="absolute inset-y-0 left-0 border-r border-dashed border-coral bg-coral/25"
                                  style={{
                                    width: `${(-stem.overlap_ms / stem.duration_ms) * 100}%`,
                                  }}
                                  title={`interruption ${stem.overlap_ms}ms`}
                                />
                              )}
                            </button>
                          );
                        })}
                    {lane.key === "sfx" &&
                      scenario.sfx.map((cue) => (
                        <button
                          key={cue.cue_id}
                          type="button"
                          aria-label={`Seek to ${cue.sfx_id} cue`}
                          onClick={() => onSeek(cue.timestamp_ms)}
                          className={`absolute bottom-1 top-1 flex w-8 -translate-x-1/2 flex-col items-center rounded ${highlightCue === cue.cue_id ? "bg-coral/15 text-coral" : "text-muted-foreground"}`}
                          style={{ left: pct(cue.timestamp_ms) }}
                          title={`${cue.sfx_id}.wav @ ${cue.timestamp_ms}ms · ${cue.gain_db} dB`}
                        >
                          <AudioLines className="size-4 text-coral" />
                          <span className="w-px flex-1 bg-coral/60" />
                          <span className="max-w-full truncate font-mono text-[7px]">
                            {cue.sfx_id}
                          </span>
                        </button>
                      ))}
                    {lane.key === "bgm" && <BgmLane scenario={scenario} duration={duration} />}
                  </div>
                </div>
              );
            })}

            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 grid grid-cols-[150px_1fr] sm:grid-cols-[180px_1fr]"
            >
              <div />
              <div className="relative">
                <span
                  className="absolute inset-y-0 z-10 w-px bg-primary shadow-[0_0_8px_var(--primary)]"
                  style={{ left: pct(positionMs) }}
                >
                  <span className="absolute -left-[3px] top-0 size-[7px] bg-primary" />
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex min-h-14 items-center gap-3 px-4 py-3 text-sm">
          <Music2 className="size-4 flex-none text-muted-foreground" />
          {voiceActive.length ? (
            voiceActive.map((stem) => (
              <p key={stem.stem_id} className="flex-1">
                <span
                  className={`font-mono text-xs ${stem.speaker.startsWith("Alex") ? "text-alex" : "text-sam"}`}
                >
                  {(stem.speaker.split(" ")[0] ?? "").toUpperCase()}
                </span>{" "}
                <span className="text-muted-foreground">“{stem.text}”</span>
              </p>
            ))
          ) : (
            <p className="font-mono text-[10px] leading-5 text-muted-foreground">
              PLAY THE MIX · SOLO A HOST · MUTE THE BED · SCRUB THE TIMELINE
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
