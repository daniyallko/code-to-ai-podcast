import { useEffect, useRef, useState } from "react";
import type { RpcPacket, Scenario } from "@/lib/demoScenario";
import { SCENARIOS } from "@/lib/demoScenario";

function DiffView({ diff }: { diff: string }) {
  return (
    <pre className="max-h-[420px] overflow-auto p-4 font-mono text-[11px] leading-5">
      {diff.split("\n").map((l, i) => (
        <div
          key={i}
          className={
            l.startsWith("+")
              ? "bg-signal/10 text-signal"
              : l.startsWith("-")
                ? "bg-destructive/10 text-destructive"
                : l.startsWith("@@")
                  ? "text-wave"
                  : "text-muted-foreground"
          }
        >
          {l || " "}
        </div>
      ))}
    </pre>
  );
}

const METHOD_COLOR: Record<string, string> = {
  "prompts/get": "text-wave",
  "tools/call": "text-primary",
  "resources/read": "text-signal",
};

export function McpProtocolInspector({
  scenario,
  onScenario,
  packets,
  positionMs,
  started,
  selectedId,
  onSelect,
}: {
  scenario: Scenario;
  onScenario: (key: string) => void;
  packets: RpcPacket[];
  positionMs: number;
  started: boolean;
  selectedId: number | null;
  onSelect: (p: RpcPacket) => void;
}) {
  const [custom, setCustom] = useState<string | null>(null);
  const visible = started ? packets.filter((p) => p.at_ms <= positionMs) : packets;
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (started && listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [visible.length, started]);
  const selected = packets.find((p) => p.id === selectedId) ?? null;

  return (
    <section className="mx-auto grid max-w-6xl gap-4 px-5 py-8 lg:grid-cols-2">
      <div className="panel overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
          <span className="font-mono text-xs text-muted-foreground">PR DIFF INPUT</span>
          <div className="flex gap-1">
            {SCENARIOS.map((s) => (
              <button
                key={s.key}
                onClick={() => { setCustom(null); onScenario(s.key); }}
                className={`pill transition ${s.key === scenario.key && custom === null ? "!border-primary text-primary" : "hover:bg-accent"}`}
              >
                {s.key === "pr-402" ? "PR #402" : "INC-2291"}
              </button>
            ))}
            <button onClick={() => setCustom(custom ?? "")} className={`pill ${custom !== null ? "!border-primary text-primary" : ""}`}>custom</button>
          </div>
        </div>
        <h3 className="px-4 pt-3 text-sm font-semibold">{custom !== null ? "Custom diff" : scenario.title}</h3>
        {custom !== null ? (
          <div className="p-4">
            <textarea
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              placeholder="Paste a unified diff…"
              className="h-72 w-full resize-none rounded-md border border-border bg-background p-3 font-mono text-xs outline-none focus:border-primary"
            />
            <p className="mt-2 text-xs text-muted-foreground">
              In simulated mode the replay uses the PR #402 trace. Connect the live server to generate a fresh session from your diff via the <code className="font-mono">pr-roast-podcast</code> prompt.
            </p>
          </div>
        ) : (
          <DiffView diff={scenario.diff} />
        )}
      </div>

      <div className="panel flex flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <span className="font-mono text-xs text-muted-foreground">MCP JSON-RPC 2.0 INSPECTOR</span>
          <span className="flex items-center gap-2 font-mono text-[10px] text-signal"><span className="led" />{visible.length}/{packets.length} msgs</span>
        </div>
        <div ref={listRef} className="max-h-56 overflow-auto font-mono text-[11px]">
          {visible.map((p) => (
            <button
              key={p.id}
              onClick={() => onSelect(p)}
              className={`flex w-full items-center gap-3 border-b border-border/60 px-4 py-2 text-left transition hover:bg-accent ${selectedId === p.id ? "bg-accent" : ""}`}
            >
              <span className="w-6 text-muted-foreground">#{p.id}</span>
              <span className={`w-28 shrink-0 ${METHOD_COLOR[p.method] ?? ""}`}>{p.method}</span>
              <span className="truncate">{p.label}</span>
            </button>
          ))}
        </div>
        <div className="min-h-0 flex-1 border-t border-border bg-background/60">
          {selected ? (
            <div className="grid max-h-80 gap-0 overflow-auto md:grid-cols-2">
              <pre className="overflow-x-auto p-3 font-mono text-[10px] leading-4 text-wave">→ {JSON.stringify(selected.request, null, 2)}</pre>
              <pre className="overflow-x-auto whitespace-pre-wrap break-all p-3 font-mono text-[10px] leading-4 text-signal">← {JSON.stringify(selected.response, null, 2)}</pre>
            </div>
          ) : (
            <p className="p-4 font-mono text-xs text-muted-foreground">Click a packet to inspect request/response — the matching stem lights up on the timeline.</p>
          )}
        </div>
      </div>
    </section>
  );
}
