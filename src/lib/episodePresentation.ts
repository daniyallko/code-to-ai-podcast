import type { Episode } from "@/lib/localStudio";

export type GenerationStage = {
  id: "scripting" | "voices" | "ducking" | "mastering";
  label: string;
  state: "pending" | "active" | "complete" | "failed";
};

const STAGES: Omit<GenerationStage, "state">[] = [
  { id: "scripting", label: "Scripting" },
  { id: "voices", label: "Neural voices" },
  { id: "ducking", label: "Sidechain ducking" },
  { id: "mastering", label: "Mastering · -16 LUFS" },
];

export function generationStages(job: Pick<Episode, "step" | "status">): GenerationStage[] {
  if (job.status === "COMPLETED" || job.step === "done") {
    return STAGES.map((stage) => ({ ...stage, state: "complete" }));
  }

  const realSteps = ["scripting", "voices", "mixing"];
  const current = realSteps.indexOf(job.step);
  return STAGES.map((stage) => {
    const realStep = stage.id === "ducking" || stage.id === "mastering" ? "mixing" : stage.id;
    const index = realSteps.indexOf(realStep);
    const state =
      current < 0 || index > current
        ? "pending"
        : index < current
          ? "complete"
          : job.status === "FAILED"
            ? "failed"
            : "active";
    return { ...stage, state };
  });
}

export function diffStats(diff: string): { additions: number; deletions: number } {
  let additions = 0;
  let deletions = 0;
  for (const line of diff.split("\n")) {
    if (line.startsWith("+") && !line.startsWith("+++")) additions++;
    if (line.startsWith("-") && !line.startsWith("---")) deletions++;
  }
  return { additions, deletions };
}

export function diffSignals(diff: string): { id: string; label: string }[] {
  const added = diff.split("\n").filter((line) => line.startsWith("+") && !line.startsWith("+++"));
  const signals: { id: string; label: string }[] = [];
  if (added.some((line) => /\bconsole\.log\s*\(/.test(line)))
    signals.push({ id: "abandoned-log", label: "Abandoned log" });
  if (added.some((line) => /\b(?:describe|it|test)\.skip\s*\(/.test(line)))
    signals.push({ id: "skipped-test", label: "Skipped test" });
  if (added.some((line) => /\bdebugger\b/.test(line)))
    signals.push({ id: "debug-statement", label: "Debug statement" });
  return signals;
}
