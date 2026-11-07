import { DEMO_SPEECH } from "./demoSpeech";

export type Speaker = "Alex (Staff SRE)" | "Sam (Builder)";

export interface DemoStem {
  stem_id: string;
  speaker: Speaker;
  voice_id: string;
  text: string;
  emotion: string;
  start_ms: number;
  duration_ms: number;
  overlap_ms: number;
  pan: number;
  audio_url: string;
}

export interface DemoSfx {
  cue_id: string;
  sfx_id: "keyboard_clack" | "record_scratch" | "pager_alert" | "transition_whoosh";
  trigger_after_stem_id: string;
  timestamp_ms: number;
  gain_db: number;
}

export interface RpcPacket {
  id: number;
  at_ms: number; // playback time when the packet "fires"
  method: string;
  label: string;
  stemId?: string;
  cueId?: string;
  request: unknown;
  response: unknown;
}

export interface Scenario {
  key: string;
  title: string;
  sessionId: string;
  diff: string;
  stems: DemoStem[];
  sfx: DemoSfx[];
}

export const SFX_ICONS: Record<DemoSfx["sfx_id"], string> = {
  keyboard_clack: "⌨️",
  record_scratch: "💿",
  pager_alert: "🚨",
  transition_whoosh: "🌀",
};

const PR_DIFF = `diff --git a/checkout/lock.py b/checkout/lock.py
@@ -1,18 +1,9 @@
-import redis
-from redlock import Redlock
-
-dlm = Redlock([{"host": REDIS_HOST, "port": 6379}])
-
-def acquire_cart_lock(cart_id: str, ttl_ms: int = 3000):
-    lock = dlm.lock(f"cart:{cart_id}", ttl_ms)
-    if not lock:
-        raise CartLockedError(cart_id)
-    return lock
+# 10x faster checkout 🚀 no more network hop
+_LOCKS: dict[str, bool] = {}
+
+def acquire_cart_lock(cart_id: str, ttl_ms: int = 3000):
+    if _LOCKS.get(cart_id):
+        raise CartLockedError(cart_id)
+    _LOCKS[cart_id] = True
+    return cart_id`;

const INCIDENT_DIFF = `[02:13:07Z] ALERT p99 checkout latency 4.8s (SLO 400ms)
[02:13:41Z] api-7f9 OOMKilled  (memory 2.1Gi / 2Gi)
[02:14:02Z] redis-primary  connections 9,812 / 10,000
[02:15:30Z] on-call ack: @alex
[02:19:55Z] rollback deploy #8812 -> #8811
[02:24:10Z] p99 recovered 312ms. Duplicate orders: 41`;

function layout(
  key: string,
  raw: Array<[Speaker, string, string, number, number]>,
): DemoStem[] {
  let cursor = 0;
  return raw.map(([speaker, text, emotion, duration_ms, overlap_ms], i) => {
    const stem_id = `stem_${String(i + 1).padStart(2, "0")}`;
    const speech = DEMO_SPEECH[`${key}-${stem_id}`];
    if (!speech) throw new Error(`Missing speech for ${key}/${stem_id}`);
    duration_ms = speech.duration_ms;
    const start_ms = Math.max(0, cursor + overlap_ms);
    cursor = Math.max(cursor, start_ms + duration_ms);
    return {
      stem_id,
      audio_url: speech.url,
      speaker,
      voice_id: speaker.startsWith("Alex") ? "am_michael" : "af_bella",
      text,
      emotion,
      start_ms,
      duration_ms,
      overlap_ms,
      pan: speaker.startsWith("Alex") ? -0.6 : 0.6,
    };
  });
}

const roastStems = layout("pr-402", [
  ["Sam (Builder)", "Okay, PR four-oh-two. We ripped out Redis locks for a dictionary. Checkout is ten times faster!", "excited", 4200, 600],
  ["Alex (Staff SRE)", "Wait. A global dictionary. Across forty pods.", "deadpan", 2600, -220],
  ["Sam (Builder)", "It's in memory, so it's basically free!", "cheerful", 2100, 250],
  ["Alex (Staff SRE)", "Free like a race condition at Black Friday. Two pods, same cart, double charge.", "cynical", 3900, -310],
  ["Sam (Builder)", "Hmm. We could add a TTL?", "hesitant", 1700, 300],
  ["Alex (Staff SRE)", "There is no TTL. The dictionary just grows until the pod OOMs. And then my pager goes off.", "exasperated", 4300, -180],
  ["Sam (Builder)", "Fine. Revert, ship Redlock, and I'll write the load test.", "resigned", 3100, 400],
  ["Alex (Staff SRE)", "Approved. With one comment: never again.", "smug", 2400, -150],
]);

const incidentStems = layout("incident", [
  ["Alex (Staff SRE)", "Two thirteen A M. p ninety nine checkout latency hits four point eight seconds.", "grim", 4200, 500],
  ["Sam (Builder)", "And that's when the pods started getting OOM killed?", "curious", 2500, -200],
  ["Alex (Staff SRE)", "Exactly. Redis was at ninety eight percent of max connections.", "focused", 3400, -260],
  ["Sam (Builder)", "So the rollback fixed it in eleven minutes.", "relieved", 2600, 300],
  ["Alex (Staff SRE)", "Fixed latency. We still shipped forty one duplicate orders.", "dry", 3200, -170],
]);

function cuesFor(stems: DemoStem[], defs: Array<[DemoSfx["sfx_id"], number, number, number]>): DemoSfx[] {
  return defs.map(([sfx_id, stemIdx, offset, gain_db], i) => {
    const s = stems[stemIdx]!;
    return {
      cue_id: `cue_${i + 1}`,
      sfx_id,
      trigger_after_stem_id: s.stem_id,
      timestamp_ms: s.start_ms + s.duration_ms + offset,
      gain_db,
    };
  });
}

export const SCENARIOS: Scenario[] = [
  {
    key: "pr-402",
    title: "PR #402: Replace distributed Redis lock with in-memory global dictionary for 10x faster checkout",
    sessionId: "ses_99a",
    diff: PR_DIFF,
    stems: roastStems,
    sfx: cuesFor(roastStems, [
      ["keyboard_clack", 0, -900, -6],
      ["record_scratch", 1, 0, -3],
      ["pager_alert", 4, 0, -3],
      ["transition_whoosh", 6, -200, -4],
    ]),
  },
  {
    key: "incident",
    title: "Incident INC-2291: Checkout p99 meltdown war room",
    sessionId: "ses_7c1",
    diff: INCIDENT_DIFF,
    stems: incidentStems,
    sfx: cuesFor(incidentStems, [
      ["pager_alert", 0, -3000, -3],
      ["keyboard_clack", 2, 0, -6],
      ["transition_whoosh", 3, 0, -4],
    ]),
  },
];

export function totalDuration(s: Scenario) {
  const end = Math.max(...s.stems.map((x) => x.start_ms + x.duration_ms), ...s.sfx.map((c) => c.timestamp_ms + 800));
  return end + 1200;
}

export function buildFilterComplex(s: Scenario, ratio = 6, lufs = -16): string {
  const parts: string[] = [];
  s.stems.forEach((st, i) => {
    const pan = st.pan < 0 ? "c0=0.8*c0|c1=0.2*c0" : "c0=0.2*c0|c1=0.8*c0";
    parts.push(`[${i}:a]adelay=${st.start_ms}|${st.start_ms},pan=stereo|${pan}[d${i}]`);
  });
  const base = s.stems.length;
  s.sfx.forEach((c, j) => {
    parts.push(`[${base + j}:a]adelay=${c.timestamp_ms}|${c.timestamp_ms},volume=${c.gain_db}dB[s${j}]`);
  });
  const ins = [...s.stems.map((_, i) => `[d${i}]`), ...s.sfx.map((_, j) => `[s${j}]`)].join("");
  const n = s.stems.length + s.sfx.length;
  parts.push(`${ins}amix=inputs=${n}:normalize=0[voice_bus]`);
  parts.push(`[voice_bus]asplit=2[vb_key][vb_mix]`);
  parts.push(`[${n}:a]volume=-8dB[bgm]`);
  parts.push(`[bgm][vb_key]sidechaincompress=threshold=0.03:ratio=${ratio}:attack=50:release=600[bgm_ducked]`);
  parts.push(`[vb_mix][bgm_ducked]amix=inputs=2:normalize=0,loudnorm=I=${lufs}:TP=-1.5:LRA=11[master]`);
  return parts.join(";\n");
}

export function buildTrace(s: Scenario): RpcPacket[] {
  const packets: RpcPacket[] = [];
  let id = 1;
  const push = (p: Omit<RpcPacket, "id">) => packets.push({ id: id++, ...p });
  const prompt = s.key === "incident" ? "incident-postmortem-war-room" : "pr-roast-podcast";

  push({
    at_ms: 0,
    method: "prompts/get",
    label: prompt,
    request: { jsonrpc: "2.0", id: 1, method: "prompts/get", params: { name: prompt, arguments: s.key === "incident" ? { incident_log: "…" } : { pr_diff: "…", intensity: "spicy" } } },
    response: { jsonrpc: "2.0", id: 1, result: { description: "Autonomous 2-host showrunner", messages: [{ role: "user", content: { type: "text", text: "You are the showrunner. Alex (Staff SRE) is cynical about race conditions and p99… use overlap_ms between -150 and -350 for interruptions…" } }] } },
  });
  push({
    at_ms: 150,
    method: "tools/call",
    label: "create_session",
    request: { jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "create_session", arguments: { title: s.title, bpm: 95, bgm_track_id: "lofi_synth_bed" } } },
    response: { jsonrpc: "2.0", id: 2, result: { content: [{ type: "text", text: JSON.stringify({ session_id: s.sessionId, status: "DRAFT" }) }] } },
  });
  s.stems.forEach((st) => {
    push({
      at_ms: st.start_ms,
      method: "tools/call",
      label: `append_dialogue_stem · ${st.speaker.split(" ")[0]}${st.overlap_ms < 0 ? ` · overlap ${st.overlap_ms}ms` : ""}`,
      stemId: st.stem_id,
      request: { jsonrpc: "2.0", id: 0, method: "tools/call", params: { name: "append_dialogue_stem", arguments: { session_id: s.sessionId, speaker: st.speaker, voice_id: st.voice_id, text: st.text, emotion: st.emotion, overlap_ms: st.overlap_ms } } },
      response: { jsonrpc: "2.0", id: 0, result: { content: [{ type: "text", text: JSON.stringify({ stem_id: st.stem_id, start_ms: st.start_ms, duration_ms: st.duration_ms, pan: st.pan }) }] } },
    });
    if (st.stem_id === "stem_02") {
      push({
        at_ms: st.start_ms + 100,
        method: "resources/read",
        label: `audio://sessions/${s.sessionId}/timeline`,
        request: { jsonrpc: "2.0", id: 0, method: "resources/read", params: { uri: `audio://sessions/${s.sessionId}/timeline` } },
        response: { jsonrpc: "2.0", id: 0, result: { contents: [{ uri: `audio://sessions/${s.sessionId}/timeline`, mimeType: "application/json", text: JSON.stringify({ session_id: s.sessionId, status: "DRAFT", stems: s.stems.slice(0, 2).map((x) => ({ stem_id: x.stem_id, start_ms: x.start_ms, duration_ms: x.duration_ms })) }) }] } },
      });
    }
  });
  s.sfx.forEach((c) => {
    push({
      at_ms: c.timestamp_ms,
      method: "tools/call",
      label: `insert_sfx_cue · ${c.sfx_id}.wav @ ${c.timestamp_ms}ms`,
      cueId: c.cue_id,
      request: { jsonrpc: "2.0", id: 0, method: "tools/call", params: { name: "insert_sfx_cue", arguments: { session_id: s.sessionId, sfx_id: c.sfx_id, trigger_after_stem_id: c.trigger_after_stem_id, offset_ms: 0, gain_db: c.gain_db } } },
      response: { jsonrpc: "2.0", id: 0, result: { content: [{ type: "text", text: JSON.stringify({ cue_id: c.cue_id, timestamp_ms: c.timestamp_ms }) }] } },
    });
  });
  const total = totalDuration(s);
  push({
    at_ms: total - 600,
    method: "tools/call",
    label: "render_master_mix",
    request: { jsonrpc: "2.0", id: 0, method: "tools/call", params: { name: "render_master_mix", arguments: { session_id: s.sessionId, normalize_lufs: -16.0, ducking_ratio: 6.0 } } },
    response: { jsonrpc: "2.0", id: 0, result: { content: [{ type: "text", text: JSON.stringify({ status: "COMPLETED", output: `renders/${s.sessionId}/master.mp3`, filter_complex: buildFilterComplex(s), metrics: { integrated_lufs: -16.0, true_peak_dbtp: -1.5, loudness_range_lu: 6.8, render_time_ms: 1840 } }) }] } },
  });
  packets.sort((a, b) => a.at_ms - b.at_ms);
  return packets.map((p, i) => {
    const req = p.request as { id: number };
    const res = p.response as { id: number };
    req.id = i + 1;
    res.id = i + 1;
    return { ...p, id: i + 1 };
  });
}

/** Approx BGM gain reduction (dB, <=0) at time t from voice activity. */
export function duckingAt(s: Scenario, t: number): number {
  let gr = 0;
  for (const st of s.stems) {
    const a = st.start_ms, b = st.start_ms + st.duration_ms;
    if (t >= a && t <= b) {
      gr = Math.min(gr, -12 * Math.min(1, (t - a) / 50));
    } else if (t > b && t < b + 600) {
      gr = Math.min(gr, -12 * (1 - (t - b) / 600));
    }
  }
  return gr;
}
