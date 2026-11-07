import { duckingAt, type DemoSfx, type Scenario } from "./demoScenario";

export type TrackKey = "alex" | "sam" | "sfx" | "bgm";
export const TRACKS: TrackKey[] = ["alex", "sam", "sfx", "bgm"];

const SR = 44100;

function rand(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) / 4294967296) * 2 - 1;
  };
}

function sfxBuffer(ctx: BaseAudioContext, id: DemoSfx["sfx_id"]) {
  const r = rand(id.length * 97);
  const len = id === "pager_alert" ? 1.2 : id === "transition_whoosh" ? 1.0 : id === "record_scratch" ? 0.6 : 0.25;
  const n = Math.floor(len * SR);
  const buf = ctx.createBuffer(1, n, SR);
  const d = buf.getChannelData(0);
  let lp = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    let v = 0;
    if (id === "pager_alert") {
      const f = Math.floor(t / 0.15) % 2 ? 880 : 1175;
      v = Math.sign(Math.sin(2 * Math.PI * f * t)) * 0.18 * (t % 0.15 < 0.13 ? 1 : 0);
    } else if (id === "keyboard_clack") {
      const hit = t % 0.07;
      v = r() * Math.exp(-hit * 160) * 0.6;
    } else if (id === "record_scratch") {
      const f = 300 + 1600 * Math.abs(Math.sin(2 * Math.PI * 3 * t));
      lp += (f / SR) * 6 * (r() - lp);
      v = lp * 0.9 * Math.exp(-t * 2);
    } else {
      const k = 0.01 + 0.25 * Math.sin(Math.PI * (t / len));
      lp += k * (r() - lp);
      v = lp * Math.sin(Math.PI * (t / len)) * 0.7;
    }
    d[i] = v;
  }
  return buf;
}

/** Warm 4-chord lofi bed with vinyl crackle, ~10s loop at 95bpm-ish. */
function bgmBuffer(ctx: BaseAudioContext) {
  const bar = 2.526; // 4 beats @ 95bpm
  const chords = [[220, 261.6, 329.6, 392], [174.6, 220, 261.6, 329.6], [196, 246.9, 293.7, 349.2], [164.8, 207.7, 246.9, 329.6]];
  const n = Math.floor(bar * 4 * SR);
  const buf = ctx.createBuffer(2, n, SR);
  const L = buf.getChannelData(0), R = buf.getChannelData(1);
  const r = rand(42);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const ci = Math.floor(t / bar) % 4;
    const tb = t % bar;
    const env = Math.min(1, tb * 8) * Math.exp(-tb * 0.6);
    let v = 0;
    for (const f of chords[ci] ?? []) v += Math.sin(2 * Math.PI * f * t) + 0.3 * Math.sin(2 * Math.PI * f * 2 * t);
    v *= 0.03 * env;
    const kick = (t % (bar / 2)) < 0.12 ? Math.sin(2 * Math.PI * 55 * t) * Math.exp(-((t % (bar / 2)) * 30)) * 0.25 : 0;
    const crackle = r() > 0.9992 ? r() * 0.15 : r() * 0.002;
    L[i] = v + kick + crackle;
    R[i] = v * 0.95 + kick + crackle;
  }
  return buf;
}

export class StudioEngine {
  ctx: AudioContext | null = null;
  private scenario: Scenario;
  private master!: GainNode;
  private trackGain = {} as Record<TrackKey, GainNode>;
  private bgmDuck!: GainNode;
  private analyserL!: AnalyserNode;
  private analyserR!: AnalyserNode;
  private stemBufs = new Map<string, AudioBuffer>();
  private speechLoading: Promise<void> | null = null;
  private playbackRequest = 0;
  private sfxBufs = new Map<string, AudioBuffer>();
  private bgm: AudioBuffer | null = null;
  private sources: AudioScheduledSourceNode[] = [];
  private startCtxTime = 0;
  private startOffset = 0;
  playing = false;
  loop = true;
  muted: Record<TrackKey, boolean> = { alex: false, sam: false, sfx: false, bgm: false };
  solo: Record<TrackKey, boolean> = { alex: false, sam: false, sfx: false, bgm: false };
  duration: number;

  constructor(s: Scenario, duration: number) {
    this.scenario = s;
    this.duration = duration;
  }

  private ensure() {
    if (this.ctx) return this.ctx;
    const ctx = new AudioContext();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = 0.9;
    const split = ctx.createChannelSplitter(2);
    this.analyserL = ctx.createAnalyser();
    this.analyserR = ctx.createAnalyser();
    this.analyserL.fftSize = this.analyserR.fftSize = 1024;
    this.master.connect(ctx.destination);
    this.master.connect(split);
    split.connect(this.analyserL, 0);
    split.connect(this.analyserR, 1);
    for (const k of TRACKS) {
      const g = ctx.createGain();
      g.connect(this.master);
      this.trackGain[k] = g;
    }
    this.bgmDuck = ctx.createGain();
    this.bgmDuck.connect(this.trackGain.bgm);
    this.applyMix();
    for (const c of this.scenario.sfx) if (!this.sfxBufs.has(c.sfx_id)) this.sfxBufs.set(c.sfx_id, sfxBuffer(ctx, c.sfx_id));
    this.bgm = bgmBuffer(ctx);
    return ctx;
  }

  private loadSpeech(ctx: AudioContext) {
    if (!this.speechLoading) {
      const stems = this.scenario.stems;
      this.speechLoading = Promise.all(stems.map(async (stem) => {
        const response = await fetch(stem.audio_url);
        if (!response.ok) throw new Error(`Could not load ${stem.speaker}'s dialogue (${response.status}).`);
        const buffer = await ctx.decodeAudioData(await response.arrayBuffer());
        if (this.ctx === ctx) this.stemBufs.set(stem.stem_id, buffer);
      })).then(() => {}).catch((error: unknown) => {
        if (this.ctx === ctx) this.speechLoading = null;
        throw error;
      });
    }
    return this.speechLoading;
  }

  audible(k: TrackKey) {
    const anySolo = TRACKS.some((t) => this.solo[t]);
    return anySolo ? this.solo[k] && !this.muted[k] : !this.muted[k];
  }

  applyMix() {
    if (!this.ctx) return;
    for (const k of TRACKS) {
      const target = this.audible(k) ? (k === "bgm" ? 0.55 : 1) : 0;
      this.trackGain[k].gain.setTargetAtTime(target, this.ctx.currentTime, 0.02);
    }
  }

  setScenario(s: Scenario, duration: number) {
    this.stop();
    this.scenario = s;
    this.duration = duration;
    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
      this.speechLoading = null;
      this.stemBufs.clear();
      this.sfxBufs.clear();
    }
  }

  position(): number {
    if (!this.playing || !this.ctx) return this.startOffset;
    const p = this.startOffset + (this.ctx.currentTime - this.startCtxTime) * 1000;
    return p;
  }

  async play(fromMs?: number) {
    const request = ++this.playbackRequest;
    const ctx = this.ensure();
    await ctx.resume();
    await this.loadSpeech(ctx);
    if (request !== this.playbackRequest || this.ctx !== ctx) return;
    this.killSources();
    const from = fromMs ?? this.startOffset;
    this.startOffset = from >= this.duration ? 0 : from;
    const now = ctx.currentTime + 0.05;
    this.startCtxTime = now;
    const off = this.startOffset / 1000;

    const sched = (buf: AudioBuffer, atMs: number, dest: AudioNode, pan?: number, gainDb = 0) => {
      const at = atMs / 1000 - off;
      if (at + buf.duration <= 0) return;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      let node: AudioNode = src;
      if (gainDb) {
        const g = ctx.createGain();
        g.gain.value = Math.pow(10, gainDb / 20);
        node.connect(g);
        node = g;
      }
      if (pan !== undefined) {
        const p = ctx.createStereoPanner();
        p.pan.value = pan;
        node.connect(p);
        node = p;
      }
      node.connect(dest);
      if (at >= 0) src.start(now + at);
      else src.start(now, -at);
      this.sources.push(src);
    };

    for (const st of this.scenario.stems) {
      const buf = this.stemBufs.get(st.stem_id);
      if (buf) sched(buf, st.start_ms, this.trackGain[st.speaker.startsWith("Alex") ? "alex" : "sam"], st.pan * 0.42);
    }
    for (const c of this.scenario.sfx) {
      const buf = this.sfxBufs.get(c.sfx_id);
      if (buf) sched(buf, c.timestamp_ms, this.trackGain.sfx, 0, c.gain_db);
    }
    if (this.bgm) {
      const src = ctx.createBufferSource();
      src.buffer = this.bgm;
      src.loop = true;
      src.connect(this.bgmDuck);
      src.start(now, off % this.bgm.duration);
      src.stop(now + (this.duration / 1000 - off));
      this.sources.push(src);
      // sidechain simulation: automate the duck gain from voice activity
      const remain = this.duration - this.startOffset;
      const steps = Math.max(2, Math.floor(remain / 20));
      const curve = new Float32Array(steps);
      for (let i = 0; i < steps; i++) {
        curve[i] = Math.pow(10, duckingAt(this.scenario, this.startOffset + (i / (steps - 1)) * remain) / 20);
      }
      this.bgmDuck.gain.cancelScheduledValues(now);
      this.bgmDuck.gain.setValueCurveAtTime(curve, now, remain / 1000);
    }
    this.playing = true;
  }

  private killSources() {
    for (const s of this.sources) {
      try { s.stop(); } catch { /* already stopped */ }
    }
    this.sources = [];
    if (this.ctx && this.bgmDuck) {
      this.bgmDuck.gain.cancelScheduledValues(0);
      this.bgmDuck.gain.value = 1;
    }
  }

  pause() {
    this.playbackRequest++;
    this.startOffset = this.position();
    this.playing = false;
    this.killSources();
  }

  stop() {
    this.playbackRequest++;
    this.playing = false;
    this.startOffset = 0;
    this.killSources();
  }

  seek(ms: number) {
    if (this.playing) void this.play(ms);
    else this.startOffset = ms;
  }

  levels(): [number, number] {
    if (!this.ctx || !this.playing) return [0, 0];
    const rms = (a: AnalyserNode) => {
      const d = new Float32Array(a.fftSize);
      a.getFloatTimeDomainData(d);
      let s = 0;
      for (const v of d) s += v * v;
      return Math.sqrt(s / d.length);
    };
    return [rms(this.analyserL), rms(this.analyserR)];
  }

  dispose() {
    this.stop();
    void this.ctx?.close();
    this.ctx = null;
  }
}

export const toDb = (rms: number) => (rms <= 1e-5 ? -60 : Math.max(-60, 20 * Math.log10(rms)));

export function fmtTime(ms: number) {
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const r = Math.floor(ms % 1000);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(r).padStart(3, "0")}`;
}
