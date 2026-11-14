export interface DemoDialogueLine {
  speaker: "Alex (Staff SRE)" | "Sam (Builder)";
  text: string;
  spoken_text: string;
  emotion: string;
  overlap_ms: number;
}

const ALEX = "Alex (Staff SRE)" as const;
const SAM = "Sam (Builder)" as const;

const line = (
  speaker: DemoDialogueLine["speaker"],
  emotion: string,
  overlap_ms: number,
  text: string,
  spoken_text = text,
): DemoDialogueLine => ({ speaker, emotion, overlap_ms, text, spoken_text });

export const DEMO_DIALOGUE: Record<"pr-402" | "incident", DemoDialogueLine[]> = {
  "pr-402": [
    line(SAM, "excited", 600,
      "Okay, I'm proud of this one. I ripped out Redlock and swapped it for a plain dictionary. Checkout is ten times faster.",
      "Okay, I'm proud of this one. I ripped out Red lock and swapped it for a plain dictionary. Checkout is ten times faster."),
    line(ALEX, "deadpan", -300, "Faster on your laptop, or faster in production?"),
    line(SAM, "hesitant", -120, "…On my laptop. Which is basically production, right?"),
    line(ALEX, "cynical", -220,
      "We run forty pods. Each one gets its own little locks dictionary, so two shoppers can grab the same cart at once. That's not a lock. That's a suggestion.",
      "We run forty pods. Each one gets its own little locks dictionary, so two shoppers can grab the same cart at once. That's not a lock. That's a suggestion."),
    line(SAM, "smug", 120, "So charging people twice is a growth feature. Got it."),
    line(ALEX, "exasperated", -250,
      "And look at the TTL argument. You accept it, then never use it. Nothing ever gets deleted, so memory just climbs until the pod falls over.",
      "And look at the T T L argument. You accept it, then never use it. Nothing ever gets deleted, so memory just climbs until the pod falls over."),
    line(SAM, "resigned", 180,
      "Fair. Redlock comes back, I keep the benchmark, and I add a real two-pod test.",
      "Fair. Red lock comes back, I keep the benchmark, and I add a real two pod test."),
    line(ALEX, "dry", -180, "Approved. Keep the speed, lose the double charges."),
  ],
  incident: [
    line(ALEX, "grim", 500,
      "Two thirteen in the morning. Checkout latency jumps to almost five seconds. Our target is under half a second."),
    line(SAM, "curious", -180,
      "Then half a minute later a pod runs out of memory, and Redis is nearly maxed on connections. So which one started it?"),
    line(ALEX, "focused", -140,
      "Honestly? The logs can't tell us yet. Slow checkout, memory pressure, a crowded Redis. Let's not invent a villain."),
    line(SAM, "relieved", 160,
      "We roll back at two nineteen, and latency drops right back to normal. So we're fine?"),
    line(ALEX, "dry", -160,
      "Latency is fine. The forty one customers who got charged twice are not. Next step: make checkout safe to retry."),
  ],
};
