import { diffSignals, diffStats } from "@/lib/episodePresentation";

export function DiffView({
  diff,
  maxLines = 400,
  showSignals = false,
}: {
  diff: string;
  maxLines?: number;
  showSignals?: boolean;
}) {
  const stats = diffStats(diff);
  const signals = showSignals ? diffSignals(diff) : [];
  const lines = diff.split("\n").slice(0, maxLines);

  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-3 border-b border-border px-3 py-2 font-mono text-[11px]">
        <span className="text-signal">+{stats.additions} additions</span>
        <span className="text-coral">−{stats.deletions} deletions</span>
        {signals.length > 0 && (
          <span className="text-muted-foreground">
            Signals: {signals.map((signal) => `[!] ${signal.label}`).join(" · ")}
          </span>
        )}
      </div>
      <pre className="max-h-80 min-w-0 overflow-auto bg-background p-3 font-mono text-[11px] leading-5">
        <code>
          {diff ? (
            lines.map((line, index) => {
              const kind =
                line.startsWith("+") && !line.startsWith("+++")
                  ? "Addition"
                  : line.startsWith("-") && !line.startsWith("---")
                    ? "Deletion"
                    : "Context";
              return (
                <span
                  key={`${index}-${line}`}
                  aria-label={`${kind}: ${line}`}
                  className={`block min-w-max ${kind === "Addition" ? "bg-signal/5 text-signal" : kind === "Deletion" ? "bg-coral/5 text-coral" : "text-muted-foreground"}`}
                >
                  {line || " "}
                </span>
              );
            })
          ) : (
            <span className="text-muted-foreground">(empty)</span>
          )}
        </code>
      </pre>
    </div>
  );
}
