import { AlertTriangle, Check, Circle, Download, LoaderCircle } from "lucide-react";
import { generationStages } from "@/lib/episodePresentation";
import type { Episode } from "@/lib/localStudio";

const KNOWN_STEPS = new Set(["scripting", "voices", "mixing", "done"]);

export function GenerationProgress({ job, masterUrl }: { job: Episode; masterUrl?: string | undefined }) {
  const stages = generationStages(job);
  const progress = Number.isFinite(job.progress)
    ? Math.min(100, Math.max(0, job.progress * 100))
    : 0;

  return (
    <div className="rack-panel p-4" aria-label="Episode generation pipeline">
      <div className="flex items-center justify-between gap-3 font-mono text-[11px] text-muted-foreground">
        <span>GENERATION PIPELINE</span>
        <span>{Math.round(progress)}%</span>
      </div>
      {!KNOWN_STEPS.has(job.step) && (
        <p className="mt-2 font-mono text-xs text-primary">{job.step}</p>
      )}
      <ol className="mt-4 grid gap-2 sm:grid-cols-2">
        {stages.map((stage, index) => (
          <li
            key={stage.id}
            data-state={stage.state}
            className={`flex min-h-11 items-center gap-2 rounded border px-3 py-2 text-xs ${stage.state === "active" ? "border-primary/60 bg-primary/5 text-primary" : stage.state === "complete" ? "border-signal/30 text-signal" : stage.state === "failed" ? "border-coral/60 text-coral" : "border-border text-muted-foreground"}`}
          >
            {stage.state === "complete" ? (
              <Check className="size-4" />
            ) : stage.state === "active" ? (
              <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" />
            ) : stage.state === "failed" ? (
              <AlertTriangle className="size-4" />
            ) : (
              <Circle className="size-3" />
            )}
            <span className="font-mono text-[10px] text-muted-foreground">0{index + 1}</span>
            <span>{stage.label}</span>
          </li>
        ))}
      </ol>
      <div
        role="progressbar"
        aria-label="Generation progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress)}
        className="mt-4 h-1 overflow-hidden bg-background"
      >
        <div className="h-full bg-primary transition-[width]" style={{ width: `${progress}%` }} />
      </div>
      {job.status === "QUEUED" && !!job.queue_position && (
        <p role="status" className="mt-3 font-mono text-xs text-primary">
          <span>#{job.queue_position} in line</span> · your episode starts automatically.
        </p>
      )}
      {masterUrl && (
        <a href={masterUrl} className="hardware-button mt-4 px-3 py-2 text-xs text-signal">
          <Download className="size-4" /> Download MP3
        </a>
      )}
    </div>
  );
}
