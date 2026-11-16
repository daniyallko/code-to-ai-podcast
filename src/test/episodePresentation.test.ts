import { describe, expect, it } from "vitest";
import { diffSignals, diffStats, generationStages } from "@/lib/episodePresentation";

const states = (step: string, status: "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED" = "RUNNING") =>
  generationStages({ step, status }).map((stage) => [stage.id, stage.state]);

describe("generationStages", () => {
  it("maps the real scripting step", () => {
    expect(states("scripting")).toEqual([
      ["scripting", "active"],
      ["voices", "pending"],
      ["ducking", "pending"],
      ["mastering", "pending"],
    ]);
  });

  it("maps the real voices step", () => {
    expect(states("voices")).toEqual([
      ["scripting", "complete"],
      ["voices", "active"],
      ["ducking", "pending"],
      ["mastering", "pending"],
    ]);
  });

  it("advances ducking and mastering together during mixing", () => {
    expect(states("mixing")).toEqual([
      ["scripting", "complete"],
      ["voices", "complete"],
      ["ducking", "active"],
      ["mastering", "active"],
    ]);
  });

  it("completes every stage for done or completed jobs", () => {
    expect(states("done")).toEqual([
      ["scripting", "complete"],
      ["voices", "complete"],
      ["ducking", "complete"],
      ["mastering", "complete"],
    ]);
    expect(states("voices", "COMPLETED")).toEqual([
      ["scripting", "complete"],
      ["voices", "complete"],
      ["ducking", "complete"],
      ["mastering", "complete"],
    ]);
  });

  it("marks both visual mixing stages failed when mixing fails", () => {
    expect(states("mixing", "FAILED")).toEqual([
      ["scripting", "complete"],
      ["voices", "complete"],
      ["ducking", "failed"],
      ["mastering", "failed"],
    ]);
  });

  it("does not invent progress for an unknown server step", () => {
    expect(states("uploading")).toEqual([
      ["scripting", "pending"],
      ["voices", "pending"],
      ["ducking", "pending"],
      ["mastering", "pending"],
    ]);
  });
});

describe("diff presentation", () => {
  it("counts changes without counting file headers", () => {
    expect(diffStats("+++ b/a.ts\n--- a/a.ts\n+one\n-two")).toEqual({ additions: 1, deletions: 1 });
    expect(diffStats("")).toEqual({ additions: 0, deletions: 0 });
  });

  it("reports conservative signals from added lines only", () => {
    expect(diffSignals('-console.log("old")\n+console.log("new")\n+it.skip("later")\n+debugger;')).toEqual([
      { id: "abandoned-log", label: "Abandoned log" },
      { id: "skipped-test", label: "Skipped test" },
      { id: "debug-statement", label: "Debug statement" },
    ]);
    expect(diffSignals('-console.log("old")\n-it.skip("old")')).toEqual([]);
  });
});
