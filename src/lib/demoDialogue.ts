export interface DemoDialogueLine {
  speaker: "Alex (Staff SRE)" | "Sam (Builder)";
  text: string;
  spoken_text: string;
  emotion: string;
  overlap_ms: number;
}

const ALEX = "Alex (Staff SRE)" as const;
const SAM = "Sam (Builder)" as const;

export const DEMO_DIALOGUE: Record<"pr-402" | "incident", DemoDialogueLine[]> = {
  "pr-402": [
    { speaker: SAM, emotion: "excited", overlap_ms: 600,
      text: "PR #402: I replaced Redlock with one dictionary lookup. The benchmark says checkout is 10× faster.",
      spoken_text: "PR four oh two. I replaced Red lock with one dictionary lookup. The benchmark says checkout is ten times faster." },
    { speaker: ALEX, emotion: "deadpan", overlap_ms: -300, text: "On one pod?", spoken_text: "On one pod?" },
    { speaker: SAM, emotion: "hesitant", overlap_ms: -120,
      text: "…Sure. If you want to be picky.", spoken_text: "…Sure. If you want to be picky." },
    { speaker: ALEX, emotion: "cynical", overlap_ms: -220,
      text: "On 40 pods, two checkouts can lock the same cart. That isn’t a benchmark. It’s a duplicate-charge generator.",
      spoken_text: "On forty pods, two checkouts can lock the same cart. That is not a benchmark. It is a duplicate charge generator." },
    { speaker: SAM, emotion: "smug", overlap_ms: 120,
      text: "So double charging isn’t a race condition. It’s a revenue strategy.",
      spoken_text: "So double charging isn’t a race condition. It’s a revenue strategy." },
    { speaker: ALEX, emotion: "exasperated", overlap_ms: -250,
      text: "And the TTL argument does nothing. Locks never leave the dictionary, so memory grows until the pod dies. Faster checkout, surprise outage.",
      spoken_text: "And the T T L argument does nothing. Locks never leave the dictionary, so memory grows until the pod dies. Faster checkout, surprise outage." },
    { speaker: SAM, emotion: "resigned", overlap_ms: 180,
      text: "Fine. Redlock returns, the benchmark stays, and I’ll write a two-pod test. A real one.",
      spoken_text: "Fine. Red lock returns, the benchmark stays, and I will write a two pod test. A real one." },
    { speaker: ALEX, emotion: "dry", overlap_ms: -180,
      text: "Approved. Keep the speed. Lose the business model.",
      spoken_text: "Approved. Keep the speed. Lose the business model." },
  ],
  incident: [
    { speaker: ALEX, emotion: "grim", overlap_ms: 500,
      text: "02:13. Checkout p99 hits 4.8 seconds—12× our 400 ms SLO.",
      spoken_text: "Two thirteen A M. Checkout p ninety nine hits four point eight seconds. Twelve times our four hundred millisecond S L O." },
    { speaker: SAM, emotion: "curious", overlap_ms: -180,
      text: "34 seconds later, a pod is OOM-killed. Then Redis hits 9,812 connections. Which one started it?",
      spoken_text: "Thirty four seconds later, a pod is O O M killed. Then Redis hits nine thousand eight hundred twelve connections. Which one started it?" },
    { speaker: ALEX, emotion: "focused", overlap_ms: -140,
      text: "The log doesn’t prove that yet. It proves latency, memory pressure, and nearly 10,000 Redis connections. No root-cause fan fiction.",
      spoken_text: "The log does not prove that yet. It proves latency, memory pressure, and nearly ten thousand Redis connections. No root cause fan fiction." },
    { speaker: SAM, emotion: "relieved", overlap_ms: 160,
      text: "After the 02:19 rollback, p99 recovers to 312 milliseconds. So… fixed?",
      spoken_text: "After the two nineteen rollback, p ninety nine recovers to three hundred twelve milliseconds. So, fixed?" },
    { speaker: ALEX, emotion: "dry", overlap_ms: -160,
      text: "Latency recovered. 41 duplicate orders did not roll back. Follow-up: idempotent checkout—and fewer victory laps.",
      spoken_text: "Latency recovered. Forty one duplicate orders did not roll back. Follow-up: idempotent checkout, and fewer victory laps." },
  ],
};
