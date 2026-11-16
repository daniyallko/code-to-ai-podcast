import { describe, expect, it } from "vitest";
import { studioVisibility } from "@/lib/studioMode";

describe("studioVisibility", () => {
  it("shows only the non-playing DAW preview in picker mode", () => {
    expect(studioVisibility("picker", false)).toEqual({ showDaw: true, showTelemetry: false });
  });

  it("shows the complete studio in demo mode", () => {
    expect(studioVisibility("demo", false)).toEqual({ showDaw: true, showTelemetry: true });
  });

  it("hides the studio before an online or offline episode exists", () => {
    expect(studioVisibility("online", false)).toEqual({ showDaw: false, showTelemetry: false });
    expect(studioVisibility("offline", false)).toEqual({ showDaw: false, showTelemetry: false });
  });

  it("shows the complete studio after either live mode loads an episode", () => {
    expect(studioVisibility("online", true)).toEqual({ showDaw: true, showTelemetry: true });
    expect(studioVisibility("offline", true)).toEqual({ showDaw: true, showTelemetry: true });
  });
});
