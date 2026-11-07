import { afterEach, expect, it, vi } from "vitest";
import { SCENARIOS, totalDuration } from "@/lib/demoScenario";
import { StudioEngine } from "@/lib/webAudioEngine";

afterEach(() => vi.unstubAllGlobals());

it("loads real recorded speech for every PR roast line before playback", async () => {
  const param = { value: 1, setTargetAtTime() {}, cancelScheduledValues() {}, setValueCurveAtTime() {} };
  const node = () => ({ connect() {}, gain: { ...param }, pan: { ...param }, start() {}, stop() {} });
  const decode = vi.fn(async () => ({ duration: 8 }));
  vi.stubGlobal("AudioContext", class {
    currentTime = 0;
    destination = {};
    createGain = node;
    createStereoPanner = node;
    createChannelSplitter = node;
    createBufferSource = node;
    createAnalyser = () => ({ ...node(), fftSize: 1024 });
    createBuffer = (channels: number, length: number, sampleRate: number) => ({
      duration: length / sampleRate, getChannelData: () => new Float32Array(length),
    });
    decodeAudioData = decode;
    resume = async () => {};
    close = async () => {};
  });
  const fetchSpeech = vi.fn(async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(16) }));
  vi.stubGlobal("fetch", fetchSpeech);
  const scenario = SCENARIOS.find(s => s.key === "pr-402");
  if (!scenario) throw new Error("PR roast scenario missing");
  const engine = new StudioEngine(scenario, totalDuration(scenario));
  await engine.play();
  expect(fetchSpeech).toHaveBeenCalledTimes(8);
  expect(decode).toHaveBeenCalledTimes(8);
  engine.dispose();
});