export interface DemoDialogueLine {
  speaker: "Alex (Staff SRE)" | "Sam (Builder)";
  text: string;
  spoken_text: string;
  emotion: string;
  overlap_ms: number;
}

export const DEMO_DIALOGUE: Record<"pr-402" | "incident", DemoDialogueLine[]> = {
  "pr-402": [
    {
      speaker: "Sam (Builder)",
      text: "Okay, PR four-oh-two. We ripped out Redis locks for a dictionary. Checkout is ten times faster!",
      spoken_text: "Okay, PR four-oh-two. We ripped out Redis locks for a dictionary. Checkout is ten times faster!",
      emotion: "excited",
      overlap_ms: 600,
    },
    {
      speaker: "Alex (Staff SRE)",
      text: "Wait. A global dictionary. Across forty pods.",
      spoken_text: "Wait. A global dictionary. Across forty pods.",
      emotion: "deadpan",
      overlap_ms: -220,
    },
    {
      speaker: "Sam (Builder)",
      text: "It's in memory, so it's basically free!",
      spoken_text: "It's in memory, so it's basically free!",
      emotion: "cheerful",
      overlap_ms: 250,
    },
    {
      speaker: "Alex (Staff SRE)",
      text: "Free like a race condition at Black Friday. Two pods, same cart, double charge.",
      spoken_text: "Free like a race condition at Black Friday. Two pods, same cart, double charge.",
      emotion: "cynical",
      overlap_ms: -310,
    },
    {
      speaker: "Sam (Builder)",
      text: "Hmm. We could add a TTL?",
      spoken_text: "Hmm. We could add a TTL?",
      emotion: "hesitant",
      overlap_ms: 300,
    },
    {
      speaker: "Alex (Staff SRE)",
      text: "There is no TTL. The dictionary just grows until the pod OOMs. And then my pager goes off.",
      spoken_text: "There is no TTL. The dictionary just grows until the pod OOMs. And then my pager goes off.",
      emotion: "exasperated",
      overlap_ms: -180,
    },
    {
      speaker: "Sam (Builder)",
      text: "Fine. Revert, ship Redlock, and I'll write the load test.",
      spoken_text: "Fine. Revert, ship Redlock, and I'll write the load test.",
      emotion: "resigned",
      overlap_ms: 400,
    },
    {
      speaker: "Alex (Staff SRE)",
      text: "Approved. With one comment: never again.",
      spoken_text: "Approved. With one comment: never again.",
      emotion: "smug",
      overlap_ms: -150,
    },
  ],
  incident: [
    {
      speaker: "Alex (Staff SRE)",
      text: "Two thirteen A M. p ninety nine checkout latency hits four point eight seconds.",
      spoken_text: "Two thirteen A M. p ninety nine checkout latency hits four point eight seconds.",
      emotion: "grim",
      overlap_ms: 500,
    },
    {
      speaker: "Sam (Builder)",
      text: "And that's when the pods started getting OOM killed?",
      spoken_text: "And that's when the pods started getting OOM killed?",
      emotion: "curious",
      overlap_ms: -200,
    },
    {
      speaker: "Alex (Staff SRE)",
      text: "Exactly. Redis was at ninety eight percent of max connections.",
      spoken_text: "Exactly. Redis was at ninety eight percent of max connections.",
      emotion: "focused",
      overlap_ms: -260,
    },
    {
      speaker: "Sam (Builder)",
      text: "So the rollback fixed it in eleven minutes.",
      spoken_text: "So the rollback fixed it in eleven minutes.",
      emotion: "relieved",
      overlap_ms: 300,
    },
    {
      speaker: "Alex (Staff SRE)",
      text: "Fixed latency. We still shipped forty one duplicate orders.",
      spoken_text: "Fixed latency. We still shipped forty one duplicate orders.",
      emotion: "dry",
      overlap_ms: -170,
    },
  ],
};
