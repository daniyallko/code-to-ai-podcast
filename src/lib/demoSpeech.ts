import clip0 from "@/assets/dialogue/pr-402-stem_01.mp3.asset.json";
import clip1 from "@/assets/dialogue/pr-402-stem_02.mp3.asset.json";
import clip2 from "@/assets/dialogue/pr-402-stem_03.mp3.asset.json";
import clip3 from "@/assets/dialogue/pr-402-stem_04.mp3.asset.json";
import clip4 from "@/assets/dialogue/pr-402-stem_05.mp3.asset.json";
import clip5 from "@/assets/dialogue/pr-402-stem_06.mp3.asset.json";
import clip6 from "@/assets/dialogue/pr-402-stem_07.mp3.asset.json";
import clip7 from "@/assets/dialogue/pr-402-stem_08.mp3.asset.json";
import clip8 from "@/assets/dialogue/incident-stem_01.mp3.asset.json";
import clip9 from "@/assets/dialogue/incident-stem_02.mp3.asset.json";
import clip10 from "@/assets/dialogue/incident-stem_03.mp3.asset.json";
import clip11 from "@/assets/dialogue/incident-stem_04.mp3.asset.json";
import clip12 from "@/assets/dialogue/incident-stem_05.mp3.asset.json";

export const DEMO_SPEECH: Record<string, { url: string; duration_ms: number; spoken_text: string; provider: "edge"; provider_voice_id: string }> = {
  "pr-402-stem_01": {
    url: clip0.url,
    duration_ms: 8856,
    spoken_text: "PR four oh two. I replaced Red lock with one dictionary lookup. The benchmark says checkout is ten times faster.",
    provider: "edge",
    provider_voice_id: "en-US-JennyNeural",
  },
  "pr-402-stem_02": {
    url: clip1.url,
    duration_ms: 1872,
    spoken_text: "On one pod?",
    provider: "edge",
    provider_voice_id: "en-GB-RyanNeural",
  },
  "pr-402-stem_03": {
    url: clip2.url,
    duration_ms: 3768,
    spoken_text: "…Sure. If you want to be picky.",
    provider: "edge",
    provider_voice_id: "en-US-JennyNeural",
  },
  "pr-402-stem_04": {
    url: clip3.url,
    duration_ms: 9552,
    spoken_text: "On forty pods, two checkouts can lock the same cart. That is not a benchmark. It is a duplicate charge generator.",
    provider: "edge",
    provider_voice_id: "en-GB-RyanNeural",
  },
  "pr-402-stem_05": {
    url: clip4.url,
    duration_ms: 5760,
    spoken_text: "So double charging isn’t a race condition. It’s a revenue strategy.",
    provider: "edge",
    provider_voice_id: "en-US-JennyNeural",
  },
  "pr-402-stem_06": {
    url: clip5.url,
    duration_ms: 10560,
    spoken_text: "And the T T L argument does nothing. Locks never leave the dictionary, so memory grows until the pod dies. Faster checkout, surprise outage.",
    provider: "edge",
    provider_voice_id: "en-GB-RyanNeural",
  },
  "pr-402-stem_07": {
    url: clip6.url,
    duration_ms: 8760,
    spoken_text: "Fine. Red lock returns, the benchmark stays, and I will write a two pod test. A real one.",
    provider: "edge",
    provider_voice_id: "en-US-JennyNeural",
  },
  "pr-402-stem_08": {
    url: clip7.url,
    duration_ms: 5880,
    spoken_text: "Approved. Keep the speed. Lose the business model.",
    provider: "edge",
    provider_voice_id: "en-GB-RyanNeural",
  },
  "incident-stem_01": {
    url: clip8.url,
    duration_ms: 9168,
    spoken_text: "Two thirteen A M. Checkout p ninety nine hits four point eight seconds. Twelve times our four hundred millisecond S L O.",
    provider: "edge",
    provider_voice_id: "en-GB-RyanNeural",
  },
  "incident-stem_02": {
    url: clip9.url,
    duration_ms: 9936,
    spoken_text: "Thirty four seconds later, a pod is O O M killed. Then Redis hits nine thousand eight hundred twelve connections. Which one started it?",
    provider: "edge",
    provider_voice_id: "en-US-JennyNeural",
  },
  "incident-stem_03": {
    url: clip10.url,
    duration_ms: 10632,
    spoken_text: "The log does not prove that yet. It proves latency, memory pressure, and nearly ten thousand Redis connections. No root cause fan fiction.",
    provider: "edge",
    provider_voice_id: "en-GB-RyanNeural",
  },
  "incident-stem_04": {
    url: clip11.url,
    duration_ms: 7944,
    spoken_text: "After the two nineteen rollback, p ninety nine recovers to three hundred twelve milliseconds. So, fixed?",
    provider: "edge",
    provider_voice_id: "en-US-JennyNeural",
  },
  "incident-stem_05": {
    url: clip12.url,
    duration_ms: 10368,
    spoken_text: "Latency recovered. Forty one duplicate orders did not roll back. Follow-up: idempotent checkout, and fewer victory laps.",
    provider: "edge",
    provider_voice_id: "en-GB-RyanNeural",
  },
};
