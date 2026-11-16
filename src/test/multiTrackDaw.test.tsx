import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { ComponentProps } from "react";
import { MultiTrackDaw } from "@/components/showcase/MultiTrackDaw";
import { SCENARIOS } from "@/lib/demoScenario";
import type { StudioEngine } from "@/lib/webAudioEngine";

beforeAll(() => {
  Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
    configurable: true,
    value: vi.fn(() => null),
  });
});

afterEach(cleanup);

const engine = {
  levels: () => [0.1, 0.12] as [number, number],
  audible: () => true,
} as unknown as StudioEngine;

function renderDaw(overrides: Partial<ComponentProps<typeof MultiTrackDaw>> = {}) {
  const onSeek = vi.fn();
  render(
    <MultiTrackDaw
      engine={engine}
      scenario={SCENARIOS[0]!}
      duration={10_000}
      positionMs={0}
      playing={false}
      loadingAudio={false}
      audioError={null}
      loop={true}
      mutes={{ alex: false, sam: false, sfx: false, bgm: false }}
      solos={{ alex: false, sam: false, sfx: false, bgm: false }}
      highlightStem={null}
      highlightCue={null}
      onPlay={vi.fn()}
      onPause={vi.fn()}
      onStop={vi.fn()}
      onLoop={vi.fn()}
      onSeek={onSeek}
      onMute={vi.fn()}
      onSolo={vi.fn()}
      {...overrides}
    />,
  );
  return onSeek;
}

describe("MultiTrackDaw", () => {
  it("seeks precisely with keyboard input and time boundaries", () => {
    const onSeek = renderDaw();
    const timeline = screen.getByRole("slider", { name: "Timeline" });
    fireEvent.keyDown(timeline, { key: "ArrowRight" });
    expect(onSeek).toHaveBeenLastCalledWith(100);
    fireEvent.keyDown(timeline, { key: "ArrowRight", shiftKey: true });
    expect(onSeek).toHaveBeenLastCalledWith(1000);
    fireEvent.keyDown(timeline, { key: "End" });
    expect(onSeek).toHaveBeenLastCalledWith(10_000);
  });

  it("never emits NaN for a zero-duration timeline", () => {
    const onSeek = renderDaw({ duration: 0 });
    fireEvent.keyDown(screen.getByRole("slider", { name: "Timeline" }), { key: "End" });
    expect(onSeek).toHaveBeenCalledWith(0);
    expect(onSeek).not.toHaveBeenCalledWith(Number.NaN);
  });

  it("exposes track toggles, BGM context, and real timecode", () => {
    renderDaw();
    expect(screen.getByRole("button", { name: "Mute Alex" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(screen.getByRole("button", { name: "Solo Alex" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(screen.getByRole("img", { name: "BGM sidechain ducking envelope" })).toBeInTheDocument();
    expect(screen.getByText("00:00.000 / 00:10.000")).toBeInTheDocument();
  });

  it("renders Export only with a real master URL", () => {
    const { rerender } = render(<MultiTrackDaw {...baseProps()} />);
    expect(screen.queryByRole("link", { name: /Export MP3/ })).not.toBeInTheDocument();
    rerender(<MultiTrackDaw {...baseProps()} masterUrl="https://example.com/master.mp3" />);
    expect(screen.getByRole("link", { name: /Export MP3/ })).toHaveAttribute(
      "href",
      "https://example.com/master.mp3",
    );
  });
});

function baseProps(): ComponentProps<typeof MultiTrackDaw> {
  return {
    engine,
    scenario: SCENARIOS[0]!,
    duration: 10_000,
    positionMs: 0,
    playing: false,
    loadingAudio: false,
    audioError: null,
    loop: true,
    mutes: { alex: false, sam: false, sfx: false, bgm: false },
    solos: { alex: false, sam: false, sfx: false, bgm: false },
    highlightStem: null,
    highlightCue: null,
    onPlay: vi.fn(),
    onPause: vi.fn(),
    onStop: vi.fn(),
    onLoop: vi.fn(),
    onSeek: vi.fn(),
    onMute: vi.fn(),
    onSolo: vi.fn(),
  };
}
