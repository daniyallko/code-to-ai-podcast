import { useEffect, useState } from "react";
import { AudioLines, GitCommit, Github, GitPullRequest, LoaderCircle, Radio } from "lucide-react";
import { cloudApi, type Episode, type EpisodeFormat } from "@/lib/localStudio";
import { fetchDiff, listItems, parseRepo, type GhItem } from "@/lib/github";
import { DiffView } from "./DiffView";
import { FormatCards } from "./FormatCards";
import { GenerationProgress } from "./GenerationProgress";

export function GitHubStudioPanel({
  onLoad,
  online,
  onRetry,
  onBusyChange,
}: {
  onLoad: (ep: Episode, base: string) => void;
  online: boolean | null;
  onRetry?: () => void;
  onBusyChange?: (busy: boolean) => void;
}) {
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
    setError(null);
    setItems([]);
    setDiff(null);
    const p = parseRepo(repoInput);
    if (!p) {
      setError("Enter a repo like owner/name or a github.com link.");
      return;
    }
    setLoading(true);
    try {
      const list = await listItems(p.owner, p.repo);
      if (p.pr && !list.some((i) => i.kind === "pr" && i.id === p.pr))
        list.unshift({ id: p.pr, kind: "pr", label: `PR #${p.pr}` });
      if (p.commit && !list.some((i) => i.id.startsWith(p.commit!)))
        list.unshift({ id: p.commit, kind: "commit", label: p.commit.slice(0, 7) });
      setRepo(p);
      setItems(list);
      const first = p.pr
        ? `pr:${p.pr}`
        : p.commit
          ? `commit:${list.find((i) => i.id.startsWith(p.commit!))!.id}`
          : list.find((i) => i.kind === "commit")
            ? `commit:${list.find((i) => i.kind === "commit")!.id}`
            : "";
      setSel(first);
      if (!list.length) setError("No commits found in this repo.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read repo");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!repo || !item) return;
    setDiff(null);
    fetchDiff(repo.owner, repo.repo, item)
      .then(setDiff)
      .catch((e: Error) => {
        setDiff("");
        setError(e.message);
      });
  }, [repo, item]);

  useEffect(() => {
    if (!job || job.status === "COMPLETED" || job.status === "FAILED") return;
    const t = setInterval(async () => {
      try {
        const ep = await cloudApi.episode(job.id);
        setJob(ep);
        if (ep.status === "COMPLETED") onLoad(ep, cloudApi.base);
        if (ep.status === "FAILED") setError(ep.error ?? "Generation failed");
      } catch {
        /* keep polling */
      }
    }, 1000);
    return () => clearInterval(t);
  }, [job, onLoad]);

  const generate = async () => {
    if (!repo || !item || !diff) return;
    setError(null);
    const title = `${repo.owner}/${repo.repo} · ${item.label.replace(/ — .*$/, "")}`.slice(0, 200);
    try {
      const { id } = await cloudApi.create({
        format,
        source: "custom",
        diff: diff.slice(0, 200_000),
        title,
        length,
        intensity: "spicy",
      });
      setJob({
        id,
        format,
        status: "QUEUED",
        step: "scripting",
        progress: 0,
        error: null,
        title,
        created_at: Date.now() / 1000,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start generation");
    }
  };

  const busy = !!job && (job.status === "QUEUED" || job.status === "RUNNING");

  useEffect(() => {
    onBusyChange?.(busy);
    return () => onBusyChange?.(false);
  }, [busy, onBusyChange]);

  return (
    <section id="studio" className="mx-auto max-w-7xl px-4 py-8 sm:px-5">
      <div className="rack-panel overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-4 sm:px-5">
          <div>
            <p className="font-mono text-[9px] tracking-[0.16em] text-primary">
              INGESTION CONSOLE · CH 01
            </p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight">
              Choose your source material
            </h2>
          </div>
          <span role="status" className="pill gap-2 text-xs">
            <span
              className={`signal-led ${online === null ? "[--led-color:var(--primary)]" : online === false ? "[--led-color:var(--coral)]" : ""}`}
            />
            {online
              ? "Online server ready"
              : online === null
                ? "Connecting…"
                : "Online server unreachable"}
            {online === false && onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="ml-1 min-h-7 text-primary hover:underline"
              >
                retry
              </button>
            )}
          </span>
        </div>

        <div className="p-4 sm:p-5">
          <p className="text-sm text-muted-foreground">
            Free, no install. Paste a repo, pick a commit or pull request, and listen.
          </p>
          <form
            className="mt-4 flex flex-col gap-2 sm:flex-row"
            onSubmit={(event) => {
              event.preventDefault();
              void loadRepo();
            }}
            onKeyDown={(event) => {
              if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                event.preventDefault();
                void loadRepo();
              }
            }}
          >
            <div className="relative flex-1">
              <Github className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={repoInput}
                onChange={(event) => setRepoInput(event.target.value)}
                aria-label="Public GitHub repository"
                placeholder="owner/repo  or  github.com/owner/repo/pull/42"
                className="min-h-12 w-full rounded-md border border-input bg-background py-2.5 pl-10 pr-28 font-mono text-sm placeholder:text-muted-foreground/60"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 font-mono text-[9px] text-muted-foreground md:inline">
                ⌘ / CTRL + ENTER
              </span>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="hardware-button min-h-12 px-5 text-sm"
            >
              {loading ? (
                <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" />
              ) : (
                <Radio className="size-4 text-primary" />
              )}
              {loading ? "Fetching…" : "Fetch"}
            </button>
          </form>

          {items.length > 0 && (
            <div className="mt-6 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="min-w-0">
                <p className="mb-2 font-mono text-[10px] tracking-[0.12em] text-muted-foreground">
                  COMMIT / PR LEDGER
                </p>
                <div
                  className="max-h-64 space-y-1 overflow-y-auto pr-1"
                  role="group"
                  aria-label="Commit or pull request"
                >
                  {items.map((entry) => {
                    const selected = `${entry.kind}:${entry.id}` === sel;
                    const Icon = entry.kind === "commit" ? GitCommit : GitPullRequest;
                    return (
                      <button
                        key={`${entry.kind}:${entry.id}`}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => setSel(`${entry.kind}:${entry.id}`)}
                        className={`flex min-h-12 w-full items-start gap-3 rounded border px-3 py-2 text-left transition ${selected ? "border-primary/60 bg-primary/5" : "border-transparent hover:border-border hover:bg-surface-2"}`}
                      >
                        <Icon
                          className={`mt-0.5 size-4 flex-none ${selected ? "text-primary" : "text-muted-foreground"}`}
                        />
                        <span className="min-w-0">
                          <span className="block truncate font-mono text-[11px] text-foreground">
                            {entry.label}
                          </span>
                          <span className="mt-1 block font-mono text-[9px] uppercase text-muted-foreground">
                            {entry.kind} · {entry.id.slice(0, 7)}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <details
                open
                className="min-w-0 overflow-hidden rounded-md border border-border bg-card"
              >
                <summary className="min-h-11 cursor-pointer border-b border-border px-3 py-3 font-mono text-[10px] tracking-[0.12em] text-muted-foreground hover:text-foreground">
                  Diff peek
                </summary>
                {diff === null ? (
                  <p className="p-4 font-mono text-xs text-muted-foreground">Loading diff…</p>
                ) : (
                  <DiffView diff={diff} showSignals />
                )}
              </details>
            </div>
          )}

          <div className="mt-6 border-t border-border pt-5">
            <p className="mb-2 font-mono text-[10px] tracking-[0.12em] text-muted-foreground">
              EPISODE FORMAT
            </p>
            <FormatCards value={format} onChange={setFormat} />
            <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="mb-2 font-mono text-[10px] text-muted-foreground">EPISODE LENGTH</p>
                <div
                  className="inline-flex rounded-md border border-border bg-background p-1"
                  role="group"
                  aria-label="Episode length"
                >
                  {(["short", "medium"] as const).map((value) => (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={length === value}
                      onClick={() => setLength(value)}
                      className={`min-h-10 rounded px-4 font-mono text-xs capitalize ${length === value ? "bg-surface-2 text-primary" : "text-muted-foreground"}`}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </div>
              <button
                type="button"
                onClick={() => void generate()}
                disabled={busy || !diff || online === false}
                className="hardware-button min-h-12 border-primary/60 bg-primary px-5 text-primary-foreground hover:bg-primary/90"
              >
                {busy ? (
                  <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" />
                ) : (
                  <AudioLines className="size-4" />
                )}
                {busy ? "Generating…" : "Generate podcast"}
              </button>
            </div>
          </div>

          {job && (
            <div className="mt-5">
              <GenerationProgress
                job={job}
                masterUrl={job.status === "COMPLETED" ? cloudApi.masterUrl(job.id) : undefined}
              />
            </div>
          )}
          {error && (
            <p role="alert" className="mt-4 border-l-2 border-coral pl-3 text-sm text-coral">
              {error}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
