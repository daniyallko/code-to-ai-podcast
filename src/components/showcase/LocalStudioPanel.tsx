import { useEffect, useState } from "react";
import { Check, Copy, Download, LoaderCircle, Play, Sparkles } from "lucide-react";
import { localApi, type Commit, type ConnState, type Episode, type EpisodeFormat, type EpisodeSource } from "@/lib/localStudio";
import { buildImprovePrompt } from "@/lib/setupPrompt";

const FORMATS: [EpisodeFormat, string, string][] = [
  ["roast", "PR roast podcast", "Two hosts debate your change"],
  ["explainer", "Code explainer", "One narrator walks through it"],
  ["postmortem", "Postmortem", "Blast radius & follow-ups"],
];
const STEPS = ["scripting", "voices", "mixing", "done"];

export function ConnectionStatus({ conn }: { conn: ConnState }) {
  const s = conn.status;
  const color = conn.state === "connected" ? "bg-wave" : conn.state === "checking" ? "bg-muted-foreground" : "bg-destructive";
  return (
    <span role="status" className="pill flex items-center gap-2 font-mono text-xs">
      <span className={`size-2 rounded-full ${color}`} />
      {conn.state === "connected" && s
        ? `Connected · ${s.repo.repo_name}${s.repo.branch ? ` @ ${s.repo.branch}` : ""}`
        : conn.state === "checking" ? "Checking local server…" : "Not connected"}
    </span>
  );
}

export function LocalStudioPanel({ conn, onLoad }: { conn: ConnState; onLoad: (ep: Episode) => void }) {
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
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!connected) return;
    localApi.commits().then((c) => { setCommits(c); setHead((h) => h || c[0]?.sha || ""); setBase((b) => b || c[1]?.sha || ""); }).catch(() => setCommits([]));
    localApi.episodes().then(setHistory).catch(() => undefined);
  }, [connected]);

  useEffect(() => {
    if (!connected) return;
    setPreview(null);
    localApi.diff({ source, head: source !== "working" ? head : undefined, base: source === "range" ? base : undefined })
      .then(setPreview).catch((e: Error) => setPreview({ title: "Error", diff: e.message }));
  }, [connected, source, head, base]);

  useEffect(() => {
    if (!job || job.status === "COMPLETED" || job.status === "FAILED") return;
    const t = setInterval(async () => {
      try {
        const ep = await localApi.episode(job.id);
        setJob(ep);
        if (ep.status === "COMPLETED") { onLoad(ep); localApi.episodes().then(setHistory).catch(() => undefined); }
        if (ep.status === "FAILED") setError(ep.error ?? "Generation failed");
      } catch { /* keep polling */ }
    }, 700);
    return () => clearInterval(t);
  }, [job, onLoad]);

  const generate = async () => {
    setError(null);
    try {
      const { id } = await localApi.create({ format, source, head: source !== "working" ? head : undefined, base: source === "range" ? base : undefined, length, intensity });
      setJob({ id, format, status: "QUEUED", step: "scripting", progress: 0, error: null, title: "", created_at: Date.now() / 1000 });
    } catch (e) { setError(e instanceof Error ? e.message : "Could not start generation"); }
  };

  const busy = !!job && (job.status === "QUEUED" || job.status === "RUNNING");
  const noChanges = source === "working" && preview && !preview.diff.trim();

  return (
    <section id="local-studio" className="py-8">
      <div className="panel p-5 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl font-semibold">2 · Generate from your local code</h2>
          <ConnectionStatus conn={conn} />
        </div>

        {!connected ? (
          <p className="mt-3 text-sm text-muted-foreground">
            {conn.state === "checking" ? "Looking for the local server on localhost:8000…" :
              "Run the setup prompt above, then keep this tab open — it reconnects automatically. Use Chrome or Edge; Safari blocks sites from talking to localhost."}
          </p>
        ) : (
          <>
            {!conn.status?.repo.is_repo && <p className="mt-3 text-sm text-destructive">The server isn't pointed at a git repository. Restart it with --repo "/path/to/your/project".</p>}
            {conn.status && !conn.status.ffmpeg && <p className="mt-3 text-sm text-destructive">FFmpeg is missing on your computer, so mixing will fail.</p>}

            <div className="mt-5 grid gap-5 lg:grid-cols-2">
              <div className="space-y-4">
                <Field label="What should it talk about?">
                  <Seg value={source} onChange={(v) => setSource(v as EpisodeSource)} items={[["working", "Uncommitted changes"], ["commit", "A commit"], ["range", "Compare commits"]]} />
                </Field>
                {source !== "working" && (
                  <Field label={source === "range" ? "From → To" : "Commit"}>
                    <div className="flex flex-col gap-2">
                      {source === "range" && <CommitSelect commits={commits} value={base} onChange={setBase} />}
                      <CommitSelect commits={commits} value={head} onChange={setHead} />
                    </div>
                  </Field>
                )}
                <Field label="Format">
                  <div className="grid gap-2 sm:grid-cols-3">
                    {FORMATS.map(([k, l, d]) => (
                      <button key={k} onClick={() => setFormat(k)} aria-pressed={format === k}
                        className={`rounded-md border p-3 text-left transition ${format === k ? "border-primary bg-accent" : "border-border hover:bg-accent"}`}>
                        <span className="block text-sm font-medium">{l}</span>
                        <span className="block text-xs text-muted-foreground">{d}</span>
                      </button>
                    ))}
                  </div>
                </Field>
                <div className="flex flex-wrap gap-4">
                  <Field label="Length"><Seg value={length} onChange={(v) => setLength(v as "short" | "medium")} items={[["short", "Short"], ["medium", "Medium"]]} /></Field>
                  {format === "roast" && <Field label="Intensity"><Seg value={intensity} onChange={(v) => setIntensity(v as "mild" | "spicy")} items={[["mild", "Mild"], ["spicy", "Spicy"]]} /></Field>}
                  <Field label="Voices"><span className="pill font-mono text-xs">{conn.status?.tts_provider}</span></Field>
                </div>

                <button onClick={generate} disabled={busy || !!noChanges}
                  className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 font-semibold text-primary-foreground disabled:opacity-50">
                  {busy ? <LoaderCircle className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                  {busy ? "Generating…" : "Generate audio"}
                </button>
                {noChanges && <p className="text-xs text-muted-foreground">No uncommitted changes — pick a commit instead.</p>}

                {job && (
                  <div className="space-y-2">
                    <div className="flex gap-2 text-xs">
                      {STEPS.map((s, i) => {
                        const cur = STEPS.indexOf(job.step);
                        return <span key={s} className={`pill ${i < cur || job.status === "COMPLETED" ? "text-wave" : i === cur ? "text-primary" : ""}`}>{s === "done" ? "mastered" : s}</span>;
                      })}
                    </div>
                    <div className="h-1.5 overflow-hidden rounded bg-background"><div className="h-full bg-primary transition-all" style={{ width: `${Math.round(job.progress * 100)}%` }} /></div>
                    {job.status === "COMPLETED" && (
                      <div className="flex flex-wrap gap-2">
                        <a href={localApi.masterUrl(job.id)} className="pill inline-flex items-center gap-1 hover:bg-accent"><Download className="size-3" /> Download MP3</a>
                        <button onClick={() => { void navigator.clipboard.writeText(buildImprovePrompt(job.format, source, job.title)); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
                          className="pill inline-flex items-center gap-1 hover:bg-accent">
                          {copied ? <Check className="size-3" /> : <Copy className="size-3" />} Improve script with my agent
                        </button>
                      </div>
                    )}
                  </div>
                )}
                {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
              </div>

              <div className="min-w-0">
                <p className="mb-1 text-xs text-muted-foreground">{preview?.title ?? "Loading diff…"}</p>
                <pre className="h-80 overflow-auto rounded-md bg-background p-3 font-mono text-[11px] leading-relaxed">
                  {(preview?.diff || "(empty)").split("\n").slice(0, 400).map((l, i) => (
                    <div key={i} className={l.startsWith("+") ? "text-wave" : l.startsWith("-") ? "text-destructive" : "text-muted-foreground"}>{l || " "}</div>
                  ))}
                </pre>
              </div>
            </div>

            {history.length > 0 && (
              <div className="mt-6">
                <p className="mb-2 text-xs text-muted-foreground">Episodes this session</p>
                <div className="flex flex-wrap gap-2">
                  {history.filter((h) => h.status === "COMPLETED").map((h) => (
                    <button key={h.id} onClick={() => localApi.episode(h.id).then(onLoad)} className="pill inline-flex items-center gap-1 hover:bg-accent">
                      <Play className="size-3" /> {h.format} · {h.title.slice(0, 40)}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><p className="mb-1 text-xs text-muted-foreground">{label}</p>{children}</div>;
}

function Seg({ value, onChange, items }: { value: string; onChange: (v: string) => void; items: [string, string][] }) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-md bg-background p-1">
      {items.map(([k, l]) => (
        <button key={k} aria-pressed={k === value} onClick={() => onChange(k)}
          className={`rounded px-3 py-1.5 text-xs transition ${k === value ? "bg-card text-foreground" : "text-muted-foreground hover:text-foreground"}`}>{l}</button>
      ))}
    </div>
  );
}

function CommitSelect({ commits, value, onChange }: { commits: Commit[]; value: string; onChange: (v: string) => void }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-xs">
      {commits.length === 0 && <option value="">No commits found</option>}
      {commits.map((c) => <option key={c.sha} value={c.sha}>{c.short} · {c.subject.slice(0, 70)}</option>)}
    </select>
  );
}
