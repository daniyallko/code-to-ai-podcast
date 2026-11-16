import { useEffect, useState } from "react";
import { AudioLines, LoaderCircle, Play } from "lucide-react";
import {
  localApi,
  type Commit,
  type ConnState,
  type Episode,
  type EpisodeFormat,
  type EpisodeSource,
} from "@/lib/localStudio";
import { buildImprovePrompt } from "@/lib/setupPrompt";
import { CopyButton } from "./CopyButton";
import { DiffView } from "./DiffView";
import { FormatCards } from "./FormatCards";
import { GenerationProgress } from "./GenerationProgress";

export function ConnectionStatus({ conn }: { conn: ConnState }) {
  const status = conn.status;
  return (
    <span role="status" className="pill gap-2 font-mono text-xs">
      <span
        className={`signal-led ${conn.state === "checking" ? "[--led-color:var(--primary)]" : conn.state === "offline" ? "[--led-color:var(--coral)]" : ""}`}
      />
      {conn.state === "connected" && status
        ? `Connected · ${status.repo.repo_name}${status.repo.branch ? ` @ ${status.repo.branch}` : ""}`
        : conn.state === "checking"
          ? "Checking local server…"
          : "Waiting for local server…"}
    </span>
  );
}

export function LocalStudioPanel({
  conn,
  onLoad,
  onBusyChange,
}: {
  conn: ConnState;
  onLoad: (ep: Episode) => void;
  onBusyChange?: (busy: boolean) => void;
}) {
  const connected = conn.state === "connected";
  const [commits, setCommits] = useState<Commit[]>([]);
  const [source, setSource] = useState<EpisodeSource>("working");
  const [head, setHead] = useState<string>("");
  const [base, setBase] = useState<string>("");
  const [format, setFormat] = useState<EpisodeFormat>("roast");
  const [length, setLength] = useState<"short" | "medium">("short");
  const [intensity, setIntensity] = useState<"mild" | "spicy">("spicy");
  const [preview, setPreview] = useState<{ title: string; diff: string } | null>(null);
  const [job, setJob] = useState<Episode | null>(null);
  const [history, setHistory] = useState<Episode[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!connected) return;
    localApi
      .commits()
      .then((items) => {
        setCommits(items);
        setHead((current) => current || items[0]?.sha || "");
        setBase((current) => current || items[1]?.sha || "");
      })
      .catch(() => setCommits([]));
    localApi
      .episodes()
      .then(setHistory)
      .catch(() => undefined);
  }, [connected]);

  useEffect(() => {
    if (!connected) return;
    setPreview(null);
    localApi
      .diff({
        source,
        head: source !== "working" ? head : undefined,
        base: source === "range" ? base : undefined,
      })
      .then(setPreview)
      .catch((e: Error) => setPreview({ title: "Error", diff: e.message }));
  }, [connected, source, head, base]);

  useEffect(() => {
    if (!job || job.status === "COMPLETED" || job.status === "FAILED") return;
    const timer = setInterval(async () => {
      try {
        const ep = await localApi.episode(job.id);
        setJob(ep);
        if (ep.status === "COMPLETED") {
          onLoad(ep);
          localApi
            .episodes()
            .then(setHistory)
            .catch(() => undefined);
        }
        if (ep.status === "FAILED") setError(ep.error ?? "Generation failed");
      } catch {
        /* keep polling */
      }
    }, 700);
    return () => clearInterval(timer);
  }, [job, onLoad]);

  const generate = async () => {
    setError(null);
    try {
      const { id } = await localApi.create({
        format,
        source,
        head: source !== "working" ? head : undefined,
        base: source === "range" ? base : undefined,
        length,
        intensity,
      });
      setJob({
        id,
        format,
        status: "QUEUED",
        step: "scripting",
        progress: 0,
        error: null,
        title: "",
        created_at: Date.now() / 1000,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start generation");
    }
  };

  const busy = !!job && (job.status === "QUEUED" || job.status === "RUNNING");
  const noChanges = source === "working" && preview && !preview.diff.trim();

  useEffect(() => {
    onBusyChange?.(busy);
    return () => onBusyChange?.(false);
  }, [busy, onBusyChange]);

  return (
    <section id="local-studio" className="mx-auto max-w-7xl px-4 py-8 sm:px-5">
      <div className="rack-panel overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-4 sm:px-5">
          <div>
            <p className="font-mono text-[9px] tracking-[0.16em] text-primary">
              LOCAL INGESTION · CH 03
            </p>
            <h2 className="mt-1 text-xl font-semibold">Generate from your local code</h2>
          </div>
          <ConnectionStatus conn={conn} />
        </div>

        <div className="p-4 sm:p-5">
          {!connected ? (
            <p className="text-sm leading-6 text-muted-foreground">
              {conn.state === "checking"
                ? "Looking for the local server on localhost:8000…"
                : "Run the setup prompt above, then keep this tab open — it reconnects automatically. Use Chrome or Edge; Safari blocks sites from talking to localhost."}
            </p>
          ) : (
            <>
              {!conn.status?.repo.is_repo && (
                <p role="alert" className="mb-3 text-sm text-coral">
                  The server isn't pointed at a git repository. Restart it with --repo
                  "/path/to/your/project".
                </p>
              )}
              {conn.status && !conn.status.ffmpeg && (
                <p role="alert" className="mb-3 text-sm text-coral">
                  FFmpeg is missing on your computer, so mixing will fail.
                </p>
              )}

              <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
                <div className="min-w-0 space-y-5">
                  <Field label="SOURCE MATERIAL">
                    <Seg
                      value={source}
                      onChange={(value) => setSource(value as EpisodeSource)}
                      items={[
                        ["working", "Uncommitted changes"],
                        ["commit", "A commit"],
                        ["range", "Compare commits"],
                      ]}
                      label="Source material"
                    />
                  </Field>
                  {source !== "working" && (
                    <Field label={source === "range" ? "FROM → TO" : "COMMIT"}>
                      <div className="flex flex-col gap-2">
                        {source === "range" && (
                          <CommitSelect
                            commits={commits}
                            value={base}
                            onChange={setBase}
                            label="From commit"
                          />
                        )}
                        <CommitSelect
                          commits={commits}
                          value={head}
                          onChange={setHead}
                          label={source === "range" ? "To commit" : "Commit"}
                        />
                      </div>
                    </Field>
                  )}
                  <Field label="EPISODE FORMAT">
                    <FormatCards value={format} onChange={setFormat} />
                  </Field>
                  <div className="flex flex-wrap gap-4">
                    <Field label="LENGTH">
                      <Seg
                        value={length}
                        onChange={(value) => setLength(value as "short" | "medium")}
                        items={[
                          ["short", "Short"],
                          ["medium", "Medium"],
                        ]}
                        label="Episode length"
                      />
                    </Field>
                    {format === "roast" && (
                      <Field label="INTENSITY">
                        <Seg
                          value={intensity}
                          onChange={(value) => setIntensity(value as "mild" | "spicy")}
                          items={[
                            ["mild", "Mild"],
                            ["spicy", "Spicy"],
                          ]}
                          label="Roast intensity"
                        />
                      </Field>
                    )}
                    <Field label="VOICES">
                      <span className="pill min-h-11 px-3 font-mono text-xs text-signal">
                        {conn.status?.tts_provider}
                      </span>
                    </Field>
                  </div>

                  <button
                    type="button"
                    onClick={() => void generate()}
                    disabled={busy || !!noChanges}
                    className="hardware-button min-h-12 border-primary/60 bg-primary px-5 text-primary-foreground"
                  >
                    {busy ? (
                      <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" />
                    ) : (
                      <AudioLines className="size-4" />
                    )}
                    {busy ? "Generating…" : "Generate audio"}
                  </button>
                  {noChanges && (
                    <p className="text-xs text-muted-foreground">
                      No uncommitted changes — pick a commit instead.
                    </p>
                  )}

                  {job && (
                    <div className="space-y-3">
                      <GenerationProgress
                        job={job}
                        masterUrl={
                          job.status === "COMPLETED" ? localApi.masterUrl(job.id) : undefined
                        }
                      />
                      {job.status === "COMPLETED" && (
                        <CopyButton
                          text={buildImprovePrompt(job.format, source, job.title)}
                          label="Improve script with my agent"
                        />
                      )}
                    </div>
                  )}
                  {error && (
                    <p role="alert" className="border-l-2 border-coral pl-3 text-sm text-coral">
                      {error}
                    </p>
                  )}
                </div>

                <details
                  open
                  className="min-w-0 self-start overflow-hidden rounded-md border border-border"
                >
                  <summary className="min-h-11 cursor-pointer border-b border-border px-3 py-3 font-mono text-[10px] text-muted-foreground">
                    {preview?.title ?? "Loading diff…"}
                  </summary>
                  <DiffView diff={preview?.diff ?? ""} />
                </details>
              </div>

              {history.length > 0 && (
                <div className="mt-6 border-t border-border pt-5">
                  <p className="mb-2 font-mono text-[10px] tracking-[0.12em] text-muted-foreground">
                    EPISODES THIS SESSION
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {history
                      .filter((item) => item.status === "COMPLETED")
                      .map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => localApi.episode(item.id).then(onLoad)}
                          className="hardware-button min-h-11 px-3 font-mono text-xs"
                        >
                          <Play className="size-3.5 text-primary" /> {item.format} ·{" "}
                          {item.title.slice(0, 40)}
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 font-mono text-[10px] tracking-[0.1em] text-muted-foreground">{label}</p>
      {children}
    </div>
  );
}

function Seg({
  value,
  onChange,
  items,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  items: [string, string][];
  label: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="inline-flex flex-wrap gap-1 rounded-md border border-border bg-background p-1"
    >
      {items.map(([key, text]) => (
        <button
          key={key}
          type="button"
          aria-pressed={key === value}
          onClick={() => onChange(key)}
          className={`min-h-10 rounded px-3 font-mono text-xs transition ${key === value ? "bg-surface-2 text-primary" : "text-muted-foreground hover:text-foreground"}`}
        >
          {text}
        </button>
      ))}
    </div>
  );
}

function CommitSelect({
  commits,
  value,
  onChange,
  label,
}: {
  commits: Commit[];
  value: string;
  onChange: (value: string) => void;
  label: string;
}) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="min-h-11 w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-xs text-foreground"
    >
      {commits.length === 0 && <option value="">No commits found</option>}
      {commits.map((commit) => (
        <option key={commit.sha} value={commit.sha}>
          {commit.short} · {commit.subject.slice(0, 70)}
        </option>
      ))}
    </select>
  );
}
