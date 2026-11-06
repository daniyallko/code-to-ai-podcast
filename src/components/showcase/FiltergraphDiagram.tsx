import { useState } from "react";

const NODES = [
  { id: "stems", label: "Dialogue stems", syntax: "-i stem_01.wav -i stem_02.wav …", why: "Each TTS stem is an independent input, so the LLM can re-synthesize one line without re-rendering the episode." },
  { id: "adelay", label: "adelay", syntax: "adelay=4580|4580", why: "Positions a stem at its exact start_ms on both channels. Negative overlap_ms simply yields an earlier start — that's how interruptions happen." },
  { id: "pan", label: "pan", syntax: "pan=stereo|c0=0.8*c0|c1=0.2*c0", why: "Places Alex left and Sam right. Spatial separation keeps overlapping speech intelligible." },
  { id: "amix", label: "amix → [voice_bus]", syntax: "[d0][d1]…[s0]amix=inputs=N:normalize=0[voice_bus]", why: "Sums voices and SFX without amix's default 1/N attenuation, so levels stay predictable before loudnorm." },
  { id: "sidechain", label: "sidechaincompress", syntax: "[bgm][vb_key]sidechaincompress=threshold=0.03:ratio=6:attack=50:release=600", why: "The voice bus keys a compressor on the music. It ducks ~12 dB within 50 ms of speech and swells back over 600 ms." },
  { id: "loudnorm", label: "loudnorm", syntax: "loudnorm=I=-16:TP=-1.5:LRA=11", why: "EBU R128 normalization to -16 LUFS integrated with a -1.5 dBTP ceiling — the podcast platform standard." },
  { id: "mp3", label: "Master MP3", syntax: "-c:a libmp3lame -b:a 192k master.mp3", why: "Final deliverable. A second ffmpeg pass with loudnorm print_format=json returns real telemetry to the MCP client." },
];

export function FiltergraphDiagram({ filterComplex }: { filterComplex: string }) {
  const [active, setActive] = useState(NODES[4].id);
  const node = NODES.find((n) => n.id === active) ?? NODES[0];
  return (
    <div className="panel overflow-hidden">
      <div className="border-b border-border px-4 py-3 font-mono text-xs text-muted-foreground">FFMPEG FILTERGRAPH · hover a node</div>
      <div className="flex flex-wrap items-center gap-2 p-4">
        {NODES.map((n, i) => (
          <div key={n.id} className="flex items-center gap-2">
            <button
              onMouseEnter={() => setActive(n.id)}
              onFocus={() => setActive(n.id)}
              onClick={() => setActive(n.id)}
              className={`rounded-md border px-3 py-2 font-mono text-xs transition ${
                active === n.id ? "border-primary bg-primary/10 text-primary" : "border-border bg-surface-2 hover:border-muted-foreground"
              }`}
            >
              {n.label}
            </button>
            {i < NODES.length - 1 && <span className="text-muted-foreground">→</span>}
          </div>
        ))}
      </div>
      <div className="mx-4 mb-4 rounded-md border border-border bg-background p-4">
        <code className="block break-all font-mono text-xs text-wave">{node.syntax}</code>
        <p className="mt-2 text-sm text-muted-foreground">{node.why}</p>
      </div>
      <details className="border-t border-border">
        <summary className="cursor-pointer px-4 py-3 font-mono text-xs text-muted-foreground hover:text-foreground">Generated -filter_complex for this session</summary>
        <pre className="max-h-64 overflow-auto px-4 pb-4 font-mono text-[10px] leading-4 text-signal">{filterComplex}</pre>
      </details>
    </div>
  );
}
