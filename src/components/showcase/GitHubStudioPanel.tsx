import { useEffect, useState } from "react";
import { Download, Github, LoaderCircle, Sparkles } from "lucide-react";
import { cloudApi, type Episode, type EpisodeFormat } from "@/lib/localStudio";
import { fetchDiff, listItems, parseRepo, type GhItem } from "@/lib/github";

const FORMATS: [EpisodeFormat, string, string][] = [
  ["roast", "PR roast podcast", "Two hosts debate the change"],
  ["explainer", "Code explainer", "One narrator walks through it"],
  ["postmortem", "Postmortem", "Blast radius & follow-ups"],
];
const STEPS = ["scripting", "voices", "mixing", "done"];

export function GitHubStudioPanel({ onLoad, online, onRetry }: { onLoad: (ep: Episode, base: string) => void; online: boolean | null; onRetry?: () => void }) {
  const [repoInput, setRepoInput] = useState("");
  const [repo, setRepo] = useState<{ owner: string; repo: string } | null>(null);
  const [items, setItems] = useState<GhItem[]>([]);
  const [sel, setSel] = useState("");
  const [diff, setDiff] = useState<string | null>(null);
  const [format, setFormat] = useState<EpisodeFormat>("roast");
  const [length, setLength] = useState<"short" | "medium">("short");
  const [loading, setLoading] = useState(false);
  const [job, setJob] = useState<Episode | null>(null);
  const [error, setError] = useState<string | null>(null);


  const item = items.find((i) => `${i.kind}:${i.id}` === sel);

  const loadRepo = async () => {
    setError(null); setItems([]); setDiff(null);
    const p = parseRepo(repoInput);
    if (!p) { setError("Enter a repo like owner/name or a github.com link."); return; }
    setLoading(true);
    try {
      const list = await listItems(p.owner, p.repo);
      if (p.pr && !list.some((i) => i.kind === "pr" && i.id === p.pr)) list.unshift({ id: p.pr, kind: "pr", label: `PR #${p.pr}` });
      if (p.commit && !list.some((i) => i.id.startsWith(p.commit!))) list.unshift({ id: p.commit, kind: "commit", label: p.commit.slice(0, 7) });
      setRepo(p); setItems(list);
      const first = p.pr ? `pr:${p.pr}` : p.commit ? `commit:${list.find((i) => i.id.startsWith(p.commit!))!.id}` : list.find((i) => i.kind === "commit") ? `commit:${list.find((i) => i.kind === "commit")!.id}` : "";
      setSel(first);
      if (!list.length) setError("No commits found in this repo.");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not read repo"); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (!repo || !item) return;
    setDiff(null);
    fetchDiff(repo.owner, repo.repo, item).then(setDiff).catch((e: Error) => { setDiff(""); setError(e.message); });
  }, [repo, item]);

  useEffect(() => {
    if (!job || job.status === "COMPLETED" || job.status === "FAILED") return;
    const t = setInterval(async () => {
      try {
        const ep = await cloudApi.episode(job.id);
        setJob(ep);
        if (ep.status === "COMPLETED") onLoad(ep, cloudApi.base);
        if (ep.status === "FAILED") setError(ep.error ?? "Generation failed");
      } catch { /* keep polling */ }
    }, 1000);
    return () => clearInterval(t);
  }, [job, onLoad]);

  const generate = async () => {
    if (!repo || !item || !diff) return;
    setError(null);
    const title = `${repo.owner}/${repo.repo} · ${item.label.replace(/ — .*$/, "")}`.slice(0, 200);
    try {
      const { id } = await cloudApi.create({ format, source: "custom", diff: diff.slice(0, 200_000), title, length, intensity: "spicy" });
      setJob({ id, format, status: "QUEUED", step: "scripting", progress: 0, error: null, title, created_at: Date.now() / 1000 });
    } catch (e) { setError(e instanceof Error ? e.message : "Could not start generation"); }
  };

  const busy = !!job && (job.status === "QUEUED" || job.status === "RUNNING");

  return (
    <section id="studio" className="mx-auto max-w-6xl px-5 py-8">
      <div className="panel p-5 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl font-semibold">Turn any public GitHub repo into a podcast</h2>
          <span role="status" className="pill flex items-center gap-2 font-mono text-xs">
            <span className={`size-2 rounded-full ${online ? "bg-wave" : online === null ? "bg-muted-foreground" : "bg-destructive"}`} />
            {online ? "Online server ready" : online === null ? "Connecting…" : "Online server unreachable"}
            {online === false && onRetry && <button onClick={onRetry} className="ml-1 text-primary hover:underline">retry</button>}
          </span>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">Free, no install. Paste a repo, pick a commit or pull request, and listen.</p>

        <form className="mt-4 flex flex-col gap-2 sm:flex-row" onSubmit={(e) => { e.preventDefault(); void loadRepo(); }}>
          <div className="relative flex-1">
            <Github className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input value={repoInput} onChange={(e) => setRepoInput(e.target.value)} aria-label="Public GitHub repository"
              placeholder="github.com/owner/repo  or  owner/repo/pull/42"
              className="w-full rounded-md border border-border bg-background py-2.5 pl-9 pr-3 font-mono text-sm" />
          </div>
          <button type="submit" disabled={loading} className="rounded-md border border-border px-4 py-2.5 text-sm font-medium hover:bg-accent disabled:opacity-50">
            {loading ? "Loading…" : "Load repo"}
          </button>
        </form>

        {items.length > 0 && (
          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <div className="space-y-4">
              <div>
                <p className="mb-1 text-xs text-muted-foreground">Commit or pull request</p>
                <select value={sel} onChange={(e) => setSel(e.target.value)} aria-label="Commit or pull request"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-xs">
                  {items.map((i) => <option key={`${i.kind}:${i.id}`} value={`${i.kind}:${i.id}`}>{i.label.slice(0, 90)}</option>)}
                </select>
              </div>
              <div>
                <p className="mb-1 text-xs text-muted-foreground">Format</p>
                <div className="grid gap-2 sm:grid-cols-3">
                  {FORMATS.map(([k, l, d]) => (
                    <button key={k} type="button" onClick={() => setFormat(k)} aria-pressed={format === k}
                      className={`rounded-md border p-3 text-left transition ${format === k ? "border-primary bg-accent" : "border-border hover:bg-accent"}`}>
                      <span className="block text-sm font-medium">{l}</span>
                      <span className="block text-xs text-muted-foreground">{d}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="inline-flex gap-1 rounded-md bg-background p-1">
                {(["short", "medium"] as const).map((k) => (
                  <button key={k} type="button" aria-pressed={length === k} onClick={() => setLength(k)}
                    className={`rounded px-3 py-1.5 text-xs capitalize ${length === k ? "bg-card text-foreground" : "text-muted-foreground"}`}>{k}</button>
                ))}
              </div>
              <div>
                <button onClick={generate} disabled={busy || !diff || online === false}
                  className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 font-semibold text-primary-foreground disabled:opacity-50">
                  {busy ? <LoaderCircle className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                  {busy ? "Generating…" : "Generate podcast"}
                </button>
              </div>
              {job && (
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2 text-xs">
                    {STEPS.map((s, i) => {
                      const cur = STEPS.indexOf(job.step);
                      return <span key={s} className={`pill ${i < cur || job.status === "COMPLETED" ? "text-wave" : i === cur ? "text-primary" : ""}`}>{s === "done" ? "mastered" : s}</span>;
                    })}
                  </div>
                  <div className="h-1.5 overflow-hidden rounded bg-background"><div className="h-full bg-primary transition-all" style={{ width: `${Math.round(job.progress * 100)}%` }} /></div>
                  {job.status === "QUEUED" && !!job.queue_position && (
                    <p className="text-xs text-muted-foreground">Server is busy. You are #{job.queue_position} in line; your episode starts automatically.</p>
                  )}
                  {job.status === "COMPLETED" && (
                    <a href={cloudApi.masterUrl(job.id)} className="pill inline-flex items-center gap-1 hover:bg-accent"><Download className="size-3" /> Download MP3</a>
                  )}
                </div>
              )}
            </div>
            <pre className="h-80 min-w-0 overflow-auto rounded-md bg-background p-3 font-mono text-[11px] leading-relaxed">
              {diff === null ? "Loading diff…" : (diff || "(empty)").split("\n").slice(0, 400).map((l, i) => (
                <div key={i} className={l.startsWith("+") ? "text-wave" : l.startsWith("-") ? "text-destructive" : "text-muted-foreground"}>{l || " "}</div>
              ))}
            </pre>
          </div>
        )}
        {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
      </div>
    </section>
  );
}
