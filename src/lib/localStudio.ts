import { useEffect, useState } from "react";
import type { DemoSfx, DemoStem, Scenario } from "./demoScenario";

export const LOCAL_URL = (import.meta.env["VITE_MCP_SERVER_URL"] as string | undefined) ?? "http://localhost:8000";
export const CLOUD_URL = (import.meta.env["VITE_CLOUD_SERVER_URL"] as string | undefined) ?? "https://podcast-api.daniyal.online";

export type ServerStatus = {
  ok: boolean;
  version: string;
  tts_provider: string;
  ffmpeg: boolean;
  repo: { is_repo: boolean; repo_name: string; branch: string | null; dirty: boolean; error?: string };
};
export type Commit = { sha: string; short: string; author: string; date: string; subject: string };
export type EpisodeFormat = "roast" | "explainer" | "postmortem";
export type EpisodeSource = "working" | "commit" | "range" | "custom";
export type EpisodeRequest = { format: EpisodeFormat; source: EpisodeSource; base?: string | undefined; head?: string | undefined; length: "short" | "medium"; intensity: "mild" | "spicy"; diff?: string; title?: string };
export type Episode = {
  id: string; format: EpisodeFormat; status: "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED"; step: string;
  progress: number; error: string | null; title: string; diff?: string; created_at: number; queue_position?: number;
  manifest?: { session_id: string; title: string; stems: Omit<DemoStem, "audio_url">[]; sfx_cues: DemoSfx[] } | null;
};

async function api<T>(path: string, init?: RequestInit, base = LOCAL_URL): Promise<T> {
  const r = await fetch(`${base}${path}`, { ...init, signal: AbortSignal.timeout(init?.method === "POST" ? 8000 : 3000) });
  if (!r.ok) {
    const body = (await r.json().catch(() => null)) as { detail?: string } | null;
    throw new Error(body?.detail ?? `Local server error ${r.status}`);
  }
  return (await r.json()) as T;
}

export function createApi(base: string) {
  return {
    base,
    status: () => api<ServerStatus>("/api/status", undefined, base),
    create: (req: EpisodeRequest) => api<{ id: string }>("/api/episodes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(req) }, base),
    episode: (id: string) => api<Episode>(`/api/episodes/${id}`, undefined, base),
    masterUrl: (id: string) => `${base}/api/episodes/${id}/master.mp3`,
  };
}
export const cloudApi = createApi(CLOUD_URL);

export const localApi = {
  status: () => api<ServerStatus>("/api/status"),
  commits: () => api<Commit[]>("/api/git/commits?limit=30"),
  diff: (q: { source: EpisodeSource; base?: string | undefined; head?: string | undefined }) =>
    api<{ title: string; diff: string; truncated: boolean }>(`/api/git/diff?${new URLSearchParams(Object.entries(q).filter(([, v]) => v) as [string, string][])}`),
  create: (req: EpisodeRequest) => api<{ id: string }>("/api/episodes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(req) }),
  episode: (id: string) => api<Episode>(`/api/episodes/${id}`),
  episodes: () => api<Episode[]>("/api/episodes"),
  masterUrl: (id: string) => `${LOCAL_URL}/api/episodes/${id}/master.mp3`,
};

export type ConnState = { state: "checking" | "connected" | "offline"; status: ServerStatus | null };

/** Polls the local server only when enabled: every 2 s while waiting, 10 s once connected. */
export function useLocalServer(enabled = true): ConnState {
  const [conn, setConn] = useState<ConnState>({ state: "checking", status: null });
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    let t: ReturnType<typeof setTimeout> | undefined;
    const check = async () => {
      let ok = false;
      try {
        const s = await localApi.status();
        ok = true;
        if (alive) setConn({ state: "connected", status: s });
      } catch {
        if (alive) setConn({ state: "offline", status: null });
      }
      if (alive) t = setTimeout(check, ok ? 10000 : 2000);
    };
    void check();
    return () => { alive = false; if (t) clearTimeout(t); };
  }, [enabled]);
  return conn;
}

export type CloudState = { state: "checking" | "connected" | "offline"; status: ServerStatus | null; retry: () => void };
let cloudCache: Promise<ServerStatus> | null = null;
/** Starts (or reuses) the online status request; safe to call on hover to pre-warm. */
export function warmCloud(): Promise<ServerStatus> {
  if (!cloudCache) {
    cloudCache = cloudApi.status().catch(() => cloudApi.status());
    cloudCache.catch(() => { cloudCache = null; });
  }
  return cloudCache;
}

export function useCloudServer(enabled: boolean): CloudState {
  const [st, setSt] = useState<{ state: CloudState["state"]; status: ServerStatus | null }>({ state: "checking", status: null });
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    setSt((p) => (p.state === "connected" ? p : { state: "checking", status: null }));
    warmCloud().then((s) => alive && setSt({ state: "connected", status: s })).catch(() => alive && setSt({ state: "offline", status: null }));
    return () => { alive = false; };
  }, [enabled, n]);
  return { ...st, retry: () => { cloudCache = null; setN((x) => x + 1); } };
}
/** Converts a finished local episode into a Scenario so the DAW, inspector and visualizer reuse demo code. */
export function episodeToScenario(ep: Episode, base: string = LOCAL_URL): Scenario | null {
  const m = ep.manifest;
  if (!m || ep.status !== "COMPLETED") return null;
  return {
    key: `local-${ep.id}`,
    title: m.title,
    sessionId: m.session_id,
    diff: ep.diff ?? "",
    stems: m.stems.map((s) => ({ ...s, audio_url: `${base}/api/episodes/${ep.id}/stems/${s.stem_id}` })),
    sfx: m.sfx_cues,
  };
}
