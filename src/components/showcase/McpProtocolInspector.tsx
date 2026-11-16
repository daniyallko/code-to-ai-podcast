import { useEffect, useRef, useState } from "react";
import { Braces, Radio } from "lucide-react";
import type { RpcPacket, Scenario } from "@/lib/demoScenario";
import { SCENARIOS } from "@/lib/demoScenario";
import { CopyButton } from "./CopyButton";
import { DiffView } from "./DiffView";
import { JsonTree } from "./JsonTree";

const METHOD_COLOR: Record<string, string> = {
  "prompts/get": "text-wave",
  "tools/call": "text-primary",
  "resources/read": "text-signal",
};

function JsonPanel({
  title,
  value,
  copyLabel,
}: {
  title: string;
  value: unknown;
  copyLabel: string;
}) {
  return (
    <section className="min-w-0 border-b border-border last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0">
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
        <span className="font-mono text-[9px] tracking-[0.14em] text-muted-foreground">
          {title}
        </span>
        <CopyButton text={JSON.stringify(value, null, 2)} label={copyLabel} />
      </div>
      <div className="max-h-96 min-w-0 overflow-auto bg-background/60 p-3">
        <JsonTree value={value} />
      </div>
    </section>
  );
}

export function McpProtocolInspector({
  scenario,
  onScenario,
  packets,
  positionMs,
  started,
  selectedId,
  onSelect,
  demo = true,
}: {
  demo?: boolean;
  scenario: Scenario;
  onScenario: (key: string) => void;
  packets: RpcPacket[];
  positionMs: number;
  started: boolean;
  selectedId: number | null;
  onSelect: (p: RpcPacket) => void;
}) {
  const [custom, setCustom] = useState<string | null>(null);
  const visible = started ? packets.filter((packet) => packet.at_ms <= positionMs) : packets;
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (started && listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [visible.length, started]);
  const selected = packets.find((packet) => packet.id === selectedId) ?? null;

  return (
    <section className="mx-auto grid max-w-7xl gap-4 px-4 py-8 sm:px-5 lg:grid-cols-[0.85fr_1.15fr]">
      <div className="rack-panel min-w-0 self-start overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
          <span className="font-mono text-[10px] tracking-[0.12em] text-muted-foreground">
            {demo ? "PR DIFF INPUT" : "EPISODE DIFF"}
          </span>
          {demo && (
            <div className="flex flex-wrap gap-1" role="group" aria-label="Demo scenario">
              {SCENARIOS.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  aria-pressed={item.key === scenario.key && custom === null}
                  onClick={() => {
                    setCustom(null);
                    onScenario(item.key);
                  }}
                  className={`min-h-8 rounded border px-2 font-mono text-[9px] ${item.key === scenario.key && custom === null ? "border-primary/60 text-primary" : "border-border text-muted-foreground"}`}
                >
                  {item.key === "pr-402" ? "PR #402" : "INC-2291"}
                </button>
              ))}
              <button
                type="button"
                aria-pressed={custom !== null}
                onClick={() => setCustom(custom ?? "")}
                className={`min-h-8 rounded border px-2 font-mono text-[9px] ${custom !== null ? "border-primary/60 text-primary" : "border-border text-muted-foreground"}`}
              >
                custom
              </button>
            </div>
          )}
        </div>
        <h2 className="px-4 pt-3 text-sm font-semibold leading-5">
          {custom !== null ? "Custom diff" : scenario.title}
        </h2>
        {custom !== null ? (
          <div className="p-4">
            <textarea
              aria-label="Custom unified diff"
              value={custom}
              onChange={(event) => setCustom(event.target.value)}
              placeholder="Paste a unified diff…"
              className="h-72 w-full resize-none rounded-md border border-input bg-background p-3 font-mono text-xs text-foreground"
            />
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              In simulated mode the replay uses the PR #402 trace. Connect the live server to
              generate a fresh session from your diff via the{" "}
              <code className="font-mono text-foreground">pr-roast-podcast</code> prompt.
            </p>
          </div>
        ) : (
          <div className="mt-3 border-t border-border">
            <DiffView diff={scenario.diff} maxLines={Number.POSITIVE_INFINITY} />
          </div>
        )}
      </div>

      <div className="rack-panel flex min-w-0 flex-col overflow-hidden">
        <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
          <span className="inline-flex items-center gap-2 font-mono text-[10px] tracking-[0.12em] text-muted-foreground">
            <Braces className="size-3.5" /> MCP JSON-RPC 2.0
          </span>
          <span role="status" className="flex items-center gap-2 font-mono text-[9px] text-signal">
            <Radio className="size-3" />
            {visible.length}/{packets.length} PACKETS
          </span>
        </div>
        <div ref={listRef} className="max-h-64 overflow-auto font-mono text-[10px]">
          {visible.map((packet) => (
            <button
              key={packet.id}
              type="button"
              aria-pressed={selectedId === packet.id}
              onClick={() => onSelect(packet)}
              className={`flex min-h-11 w-full items-center gap-3 border-b border-border/60 px-3 py-2 text-left transition hover:bg-accent ${selectedId === packet.id ? "border-l-primary bg-primary/5" : ""}`}
            >
              <span className="w-6 flex-none text-muted-foreground">#{packet.id}</span>
              <span className={`w-24 flex-none ${METHOD_COLOR[packet.method] ?? ""}`}>
                {packet.method}
              </span>
              <span className="min-w-0 flex-1 truncate">{packet.label}</span>
              <span className="hidden w-14 flex-none text-right text-[8px] text-muted-foreground sm:inline">
                {packet.at_ms}ms
              </span>
            </button>
          ))}
        </div>
        <div className="min-w-0 flex-1 border-t border-border bg-background/40">
          {selected ? (
            <div className="grid min-w-0 md:grid-cols-2">
              <JsonPanel title="REQUEST" value={selected.request} copyLabel="Copy request" />
              <JsonPanel title="RESPONSE" value={selected.response} copyLabel="Copy response" />
            </div>
          ) : (
            <p className="p-4 font-mono text-[10px] leading-5 text-muted-foreground">
              SELECT A PACKET TO INSPECT REQUEST / RESPONSE · THE MATCHING STEM LIGHTS UP ON THE
              TIMELINE
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
