import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { filterExcerpt } from "@/lib/filtergraph";

const NODES = [
  {
    id: "stems",
    label: "Dialogue stems",
    filterName: null,
    syntax: "-i stem_01.wav -i stem_02.wav …",
    why: "Each TTS stem is an independent input, so the LLM can re-synthesize one line without re-rendering the episode.",
  },
  {
    id: "adelay",
    label: "adelay",
    filterName: "adelay",
    syntax: "adelay=4580|4580",
    why: "Positions a stem at its exact start_ms on both channels. Negative overlap_ms simply yields an earlier start — that's how interruptions happen.",
  },
  {
    id: "pan",
    label: "pan",
    filterName: "pan",
    syntax: "pan=stereo|c0=0.8*c0|c1=0.2*c0",
    why: "Places Alex left and Sam right. Spatial separation keeps overlapping speech intelligible.",
  },
  {
    id: "amix",
    label: "amix",
    filterName: "amix",
    syntax: "[d0][d1]…[s0]amix=inputs=N:normalize=0[voice_bus]",
    why: "Sums voices and SFX without amix's default 1/N attenuation, so levels stay predictable before loudnorm.",
  },
  {
    id: "sidechain",
    label: "sidechaincompress",
    filterName: "sidechaincompress",
    syntax: "[bgm][vb_key]sidechaincompress=threshold=0.03:ratio=6:attack=50:release=600",
    why: "The voice bus keys a compressor on the music. It ducks ~12 dB within 50 ms of speech and swells back over 600 ms.",
  },
  {
    id: "loudnorm",
    label: "loudnorm",
    filterName: "loudnorm",
    syntax: "loudnorm=I=-16:TP=-1.5:LRA=11",
    why: "EBU R128 normalization to -16 LUFS integrated with a -1.5 dBTP ceiling — the podcast platform standard.",
  },
  {
    id: "mp3",
    label: "Master MP3",
    filterName: null,
    syntax: "-c:a libmp3lame -b:a 192k master.mp3",
    why: "Final deliverable. A second ffmpeg pass with loudnorm print_format=json returns real telemetry to the MCP client.",
  },
];

export function FiltergraphDiagram({
  filterComplex,
  playing,
}: {
  filterComplex: string;
  playing: boolean;
}) {
  const [active, setActive] = useState("sidechain");
  const node = NODES.find((candidate) => candidate.id === active) ?? NODES[0]!;
  const syntax = node.filterName
    ? (filterExcerpt(filterComplex, node.filterName) ?? node.syntax)
    : node.syntax;

  return (
    <div className="rack-panel min-w-0 overflow-hidden">
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <p className="font-mono text-[10px] tracking-[0.12em] text-muted-foreground">
          FFMPEG SIGNAL FLOW
        </p>
        <span
          className={`font-mono text-[8px] ${playing ? "text-signal" : "text-muted-foreground"}`}
        >
          {playing ? "SIGNAL LIVE" : "SIGNAL IDLE"}
        </span>
      </div>
      <div
        role="group"
        aria-label="FFmpeg signal flow"
        className="flex flex-wrap items-stretch gap-1 p-3"
      >
        {NODES.map((item, index) => (
          <div key={item.id} className="flex min-w-0 items-center gap-1">
            <button
              type="button"
              aria-pressed={active === item.id}
              onMouseEnter={() => setActive(item.id)}
              onFocus={() => setActive(item.id)}
              onClick={() => setActive(item.id)}
              className={`min-h-11 rounded border px-2.5 py-2 font-mono text-[10px] transition ${active === item.id ? "border-primary/60 bg-primary/5 text-primary" : "border-border bg-surface-2 text-muted-foreground hover:text-foreground"}`}
            >
              {item.label}
            </button>
            {index < NODES.length - 1 && (
              <span
                aria-hidden="true"
                data-signal={playing ? "active" : "idle"}
                className={`text-border ${playing ? "animate-[signal-breathe_1.6s_ease-in-out_infinite] text-signal" : ""}`}
              >
                <ArrowRight className="size-3" />
              </span>
            )}
          </div>
        ))}
      </div>
      <div
        aria-live="polite"
        className="mx-3 mb-3 min-w-0 rounded border border-border bg-background p-4"
      >
        <p className="mb-2 font-mono text-[9px] tracking-[0.12em] text-primary">{node.label}</p>
        <code className="block break-words font-mono text-[10px] leading-5 text-wave">
          {syntax}
        </code>
        <p className="mt-3 text-xs leading-5 text-muted-foreground">{node.why}</p>
      </div>
      <details className="border-t border-border">
        <summary className="min-h-11 cursor-pointer px-4 py-3 font-mono text-[10px] text-muted-foreground hover:text-foreground">
          Generated -filter_complex for this session
        </summary>
        <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words px-4 pb-4 font-mono text-[10px] leading-4 text-signal">
          {filterComplex}
        </pre>
      </details>
    </div>
  );
}
