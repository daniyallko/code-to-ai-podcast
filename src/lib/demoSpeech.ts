import clip0 from "@/assets/dialogue/incident-stem_01.mp3.asset.json";
import clip1 from "@/assets/dialogue/incident-stem_02.mp3.asset.json";
import clip2 from "@/assets/dialogue/incident-stem_03.mp3.asset.json";
import clip3 from "@/assets/dialogue/incident-stem_04.mp3.asset.json";
import clip4 from "@/assets/dialogue/incident-stem_05.mp3.asset.json";
import clip5 from "@/assets/dialogue/pr-402-stem_01.mp3.asset.json";
import clip6 from "@/assets/dialogue/pr-402-stem_02.mp3.asset.json";
import clip7 from "@/assets/dialogue/pr-402-stem_03.mp3.asset.json";
import clip8 from "@/assets/dialogue/pr-402-stem_04.mp3.asset.json";
import clip9 from "@/assets/dialogue/pr-402-stem_05.mp3.asset.json";
import clip10 from "@/assets/dialogue/pr-402-stem_06.mp3.asset.json";
import clip11 from "@/assets/dialogue/pr-402-stem_07.mp3.asset.json";
import clip12 from "@/assets/dialogue/pr-402-stem_08.mp3.asset.json";

export const DEMO_SPEECH: Record<string, { url: string; duration_ms: number; spoken_text: string }> = {
  "incident-stem_01": {
    url: clip0.url,
    duration_ms: 6193,
    spoken_text: "Two thirteen A M. p ninety nine checkout latency hits four point eight seconds.",
  },
  "incident-stem_02": {
    url: clip1.url,
    duration_ms: 3539,
    spoken_text: "And that's when the pods started getting OOM killed?",
  },
  "incident-stem_03": {
    url: clip2.url,
    duration_ms: 4846,
    spoken_text: "Exactly. Redis was at ninety eight percent of max connections.",
  },
  "incident-stem_04": {
    url: clip3.url,
    duration_ms: 3940,
    spoken_text: "So the rollback fixed it in eleven minutes.",
  },
  "incident-stem_05": {
    url: clip4.url,
    duration_ms: 4357,
    spoken_text: "Fixed latency. We still shipped forty one duplicate orders.",
  },
  "pr-402-stem_01": {
    url: clip5.url,
    duration_ms: 8139,
    spoken_text: "Okay, PR four-oh-two. We ripped out Redis locks for a dictionary. Checkout is ten times faster!",
  },
  "pr-402-stem_02": {
    url: clip6.url,
    duration_ms: 4749,
    spoken_text: "Wait. A global dictionary. Across forty pods.",
  },
  "pr-402-stem_03": {
    url: clip7.url,
    duration_ms: 2995,
    spoken_text: "It's in memory, so it's basically free!",
  },
  "pr-402-stem_04": {
    url: clip8.url,
    duration_ms: 7015,
    spoken_text: "Free like a race condition at Black Friday. Two pods, same cart, double charge.",
  },
  "pr-402-stem_05": {
    url: clip9.url,
    duration_ms: 4277,
    spoken_text: "Hmm. We could add a TTL?",
  },
  "pr-402-stem_06": {
    url: clip10.url,
    duration_ms: 7297,
    spoken_text: "There is no TTL. The dictionary just grows until the pod OOMs. And then my pager goes off.",
  },
  "pr-402-stem_07": {
    url: clip11.url,
    duration_ms: 5968,
    spoken_text: "Fine. Revert, ship Redlock, and I'll write the load test.",
  },
  "pr-402-stem_08": {
    url: clip12.url,
    duration_ms: 5041,
    spoken_text: "Approved. With one comment: never again.",
  },
};
