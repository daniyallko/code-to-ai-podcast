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

export const DEMO_SPEECH: Record<
  string,
  {
    url: string;
    duration_ms: number;
    spoken_text: string;
    provider: "edge";
    provider_voice_id: string;
  }
> = {
  "pr-402-stem_01": {
    url: clip0.url,
    duration_ms: 7728,
    spoken_text: "Okay, I'm proud of this one. I ripped out Red lock and swapped it for a plain dictionary. Checkout is ten times faster.",
    provider: "edge",
    provider_voice_id: "en-US-AvaMultilingualNeural",
  },
  "pr-402-stem_02": {
    url: clip1.url,
    duration_ms: 3384,
    spoken_text: "Faster on your laptop, or faster in production?",
    provider: "edge",
    provider_voice_id: "en-US-AndrewMultilingualNeural",
  },
  "pr-402-stem_03": {
    url: clip2.url,
    duration_ms: 3840,
    spoken_text: "…On my laptop. Which is basically production, right?",
    provider: "edge",
    provider_voice_id: "en-US-AvaMultilingualNeural",
  },
  "pr-402-stem_04": {
    url: clip3.url,
    duration_ms: 9936,
    spoken_text: "We run forty pods. Each one gets its own little locks dictionary, so two shoppers can grab the same cart at once. That's not a lock. That's a suggestion.",
    provider: "edge",
    provider_voice_id: "en-US-AndrewMultilingualNeural",
  },
  "pr-402-stem_05": {
    url: clip4.url,
    duration_ms: 4152,
    spoken_text: "So charging people twice is a growth feature. Got it.",
    provider: "edge",
    provider_voice_id: "en-US-AvaMultilingualNeural",
  },
  "pr-402-stem_06": {
    url: clip5.url,
    duration_ms: 9168,
    spoken_text: "And look at the T T L argument. You accept it, then never use it. Nothing ever gets deleted, so memory just climbs until the pod falls over.",
    provider: "edge",
    provider_voice_id: "en-US-AndrewMultilingualNeural",
  },
  "pr-402-stem_07": {
    url: clip6.url,
    duration_ms: 6216,
    spoken_text: "Fair. Red lock comes back, I keep the benchmark, and I add a real two pod test.",
    provider: "edge",
    provider_voice_id: "en-US-AvaMultilingualNeural",
  },
  "pr-402-stem_08": {
    url: clip7.url,
    duration_ms: 4152,
    spoken_text: "Approved. Keep the speed, lose the double charges.",
    provider: "edge",
    provider_voice_id: "en-US-AndrewMultilingualNeural",
  },
  "incident-stem_01": {
    url: clip8.url,
    duration_ms: 8328,
    spoken_text: "Two thirteen in the morning. Checkout latency jumps to almost five seconds. Our target is under half a second.",
    provider: "edge",
    provider_voice_id: "en-US-AndrewMultilingualNeural",
  },
  "incident-stem_02": {
    url: clip9.url,
    duration_ms: 7968,
    spoken_text: "Then half a minute later a pod runs out of memory, and Redis is nearly maxed on connections. So which one started it?",
    provider: "edge",
    provider_voice_id: "en-US-AvaMultilingualNeural",
  },
  "incident-stem_03": {
    url: clip10.url,
    duration_ms: 7536,
    spoken_text: "Honestly? The logs can't tell us yet. Slow checkout, memory pressure, a crowded Redis. Let's not invent a villain.",
    provider: "edge",
    provider_voice_id: "en-US-AndrewMultilingualNeural",
  },
  "incident-stem_04": {
    url: clip11.url,
    duration_ms: 5112,
    spoken_text: "We roll back at two nineteen, and latency drops right back to normal. So we're fine?",
    provider: "edge",
    provider_voice_id: "en-US-AvaMultilingualNeural",
  },
  "incident-stem_05": {
    url: clip12.url,
    duration_ms: 7848,
    spoken_text: "Latency is fine. The forty one customers who got charged twice are not. Next step: make checkout safe to retry.",
    provider: "edge",
    provider_voice_id: "en-US-AndrewMultilingualNeural",
  },
};
