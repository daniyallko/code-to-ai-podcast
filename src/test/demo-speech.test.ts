import { afterEach, describe, expect, it, vi } from "vitest";
import * as demoScenarioModule from "@/lib/demoScenario";
import { SCENARIOS, buildTrace, totalDuration } from "@/lib/demoScenario";
import { DEMO_SPEECH } from "@/lib/demoSpeech";
import { StudioEngine } from "@/lib/webAudioEngine";

const rawDialogue = (demoScenarioModule as unknown as {
  DEMO_DIALOGUE?: Record<string, Array<Record<string, unknown>>>;
}).DEMO_DIALOGUE;

afterEach(() => vi.unstubAllGlobals());

describe("dialogue and speech metadata", () => {
  it.each([["pr-402", 8], ["incident", 5]] as const)(
    "%s binds every raw line to its recording without placeholder durations",
    (key, lineCount) => {
      const raw = rawDialogue?.[key];
      const scenario = SCENARIOS.find((item) => item.key === key);
      expect(raw).toHaveLength(lineCount);
      expect(scenario?.stems).toHaveLength(lineCount);
      if (!raw || !scenario) throw new Error(`${key} dialogue missing`);

      scenario.stems.forEach((stem, index) => {
        const speech = DEMO_SPEECH[`${key}-${stem.stem_id}`];
        expect(speech).toBeDefined();
        expect(raw[index]).not.toHaveProperty("duration_ms");
        expect(stem.spoken_text).toBe(raw[index]?.spoken_text);
        expect(speech?.spoken_text).toBe(raw[index]?.spoken_text);
        expect(stem.duration_ms).toBe(speech?.duration_ms);
      });
    },
  );

  it.each([
    ["pr-402", [-900, 0, 0, -200]],
    ["incident", [-3000, 0, 0]],
  ] as const)("%s trace preserves each cue's real offset", (key, expected) => {
    const scenario = SCENARIOS.find((item) => item.key === key);
    if (!scenario) throw new Error(`${key} scenario missing`);
    const offsets = buildTrace(scenario)
      .filter((packet) => packet.cueId)
      .map((packet) => {
        const request = packet.request as {
          params: { arguments: { offset_ms: number } };
        };
        return request.params.arguments.offset_ms;
      });
    expect(offsets).toEqual(expected);
  });
});

describe("prerecorded playback", () => {
  it.each([["pr-402", 8], ["incident", 5]] as const)(
    "loads and decodes every %s speech clip before playback",
    async (key, clipCount) => {
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
          duration: length / sampleRate,
          getChannelData: () => new Float32Array(length),
        });
        decodeAudioData = decode;
        resume = async () => {};
        close = async () => {};
      });
      const fetchSpeech = vi.fn(async () => ({
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(16),
      }));
      vi.stubGlobal("fetch", fetchSpeech);
      const scenario = SCENARIOS.find((item) => item.key === key);
      if (!scenario) throw new Error(`${key} scenario missing`);

      const engine = new StudioEngine(scenario, totalDuration(scenario));
      await engine.play();
      expect(fetchSpeech).toHaveBeenCalledTimes(clipCount);
      expect(fetchSpeech.mock.calls.map(([url]) => url).sort()).toEqual(
        scenario.stems.map((stem) => stem.audio_url).sort(),
      );
      expect(decode).toHaveBeenCalledTimes(clipCount);
      engine.dispose();
    },
  );
});
