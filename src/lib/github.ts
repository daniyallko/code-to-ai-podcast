/** Browser-side reads of public GitHub repos (unauthenticated API, 60 req/hour per visitor). */
export type GhItem = { id: string; label: string; kind: "commit" | "pr" };

export function parseRepo(input: string): { owner: string; repo: string; pr?: string; commit?: string } | null {
  const t = input.trim().replace(/\.git$/, "").replace(/\/$/, "");
  const m = t.match(/^(?:https?:\/\/)?(?:www\.)?(?:github\.com\/)?([\w.-]+)\/([\w.-]+)(?:\/(pull|commit)\/(\w+))?/i);
  if (!m) return null;
  const [, owner, repo, kind, ref] = m;
  return { owner: owner!, repo: repo!, ...(kind === "pull" ? { pr: ref } : kind === "commit" ? { commit: ref } : {}) };
}

async function gh(path: string, accept = "application/vnd.github+json") {
  const r = await fetch(`https://api.github.com${path}`, { headers: { Accept: accept } });
  if (r.status === 404) throw new Error("Repository not found or private. Only public repos work.");
  if (r.status === 403) throw new Error("GitHub rate limit reached for your network — try again in a few minutes.");
  if (!r.ok) throw new Error(`GitHub error ${r.status}`);
  return r;
}

export async function listItems(owner: string, repo: string): Promise<GhItem[]> {
  const [commits, prs] = await Promise.all([
    gh(`/repos/${owner}/${repo}/commits?per_page=20`).then((r) => r.json() as Promise<{ sha: string; commit: { message: string; author: { name: string } } }[]>),
    gh(`/repos/${owner}/${repo}/pulls?state=all&per_page=15`).then((r) => r.json() as Promise<{ number: number; title: string }[]>).catch(() => []),
  ]);
  return [
    ...prs.map((p) => ({ id: String(p.number), kind: "pr" as const, label: `PR #${p.number} · ${p.title}` })),
    ...commits.map((c) => ({ id: c.sha, kind: "commit" as const, label: `${c.sha.slice(0, 7)} · ${c.commit.message.split("\n")[0]} — ${c.commit.author.name}` })),
  ];
}

export async function fetchDiff(owner: string, repo: string, item: GhItem): Promise<string> {
  const path = item.kind === "pr" ? `/repos/${owner}/${repo}/pulls/${item.id}` : `/repos/${owner}/${repo}/commits/${item.id}`;
  return (await gh(path, "application/vnd.github.diff")).text();
}
