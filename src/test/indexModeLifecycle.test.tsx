import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Route } from "@/routes/index";
import type { Mode } from "@/components/showcase/HeroSection";

const mocks = vi.hoisted(() => ({
  play: vi.fn(),
  stop: vi.fn(),
  pause: vi.fn(),
  seek: vi.fn(),
  setScenario: vi.fn(),
  dispose: vi.fn(),
  applyMix: vi.fn(),
  position: vi.fn(() => 0),
  levels: vi.fn(() => [0, 0]),
  audible: vi.fn(() => true),
  navigate: vi.fn(),
}));

vi.mock("@/lib/webAudioEngine", () => ({
  StudioEngine: class {
    playing = false;
    play = mocks.play;
    stop = mocks.stop;
    pause = mocks.pause;
    seek = mocks.seek;
    setScenario = mocks.setScenario;
    dispose = mocks.dispose;
    applyMix = mocks.applyMix;
    position = mocks.position;
    levels = mocks.levels;
    audible = mocks.audible;
    constructor() {
      this.play.mockImplementation(async () => {
        this.playing = true;
      });
      this.stop.mockImplementation(() => {
        this.playing = false;
      });
    }
  },
  TRACKS: ["alex", "sam", "sfx", "bgm"],
  fmtTime: (ms: number) => String(ms),
  toDb: () => -60,
}));

vi.mock("@/lib/localStudio", () => ({
  CLOUD_URL: "https://cloud.test",
  LOCAL_URL: "http://localhost:8000",
  createApi: (base: string) => ({ masterUrl: (id: string) => `${base}/${id}/master.mp3` }),
  episodeToScenario: vi.fn(),
  useCloudServer: () => ({ state: "offline", status: null, retry: vi.fn() }),
  useLocalServer: () => ({ state: "offline", status: null }),
  warmCloud: vi.fn(),
}));

vi.mock("@/components/showcase/HeroSection", () => ({ HeroSection: () => null }));
vi.mock("@/components/showcase/StudioHeader", () => ({ StudioHeader: () => null }));
vi.mock("@/components/showcase/McpProtocolInspector", () => ({ McpProtocolInspector: () => null }));
vi.mock("@/components/showcase/SidechainVisualizer", () => ({ SidechainVisualizer: () => null }));
vi.mock("@/components/showcase/FiltergraphDiagram", () => ({ FiltergraphDiagram: () => null }));
vi.mock("@/components/showcase/GitHubStudioPanel", () => ({ GitHubStudioPanel: () => null }));
vi.mock("@/components/showcase/LocalStudioPanel", () => ({ LocalStudioPanel: () => null }));
vi.mock("@/components/showcase/SetupPromptCard", () => ({ SetupPromptCard: () => null }));

let dawProps: { playing: boolean } | null = null;
vi.mock("@/components/showcase/MultiTrackDaw", () => ({
  MultiTrackDaw: (props: { onPlay: () => void; playing: boolean }) => {
    dawProps = props;
    return <button onClick={props.onPlay}>Preview transport</button>;
  },
}));

let mode: Mode = "picker";

beforeEach(() => {
  Object.defineProperty(Element.prototype, "scrollIntoView", {
    configurable: true,
    writable: true,
    value: vi.fn(),
  });
  mode = "picker";
  vi.spyOn(Route, "useSearch").mockImplementation(() => ({ mode }));
  vi.spyOn(Route, "useNavigate").mockReturnValue(mocks.navigate);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  for (const mock of Object.values(mocks)) mock.mockClear();
  dawProps = null;
});

function renderIndex() {
  const Index = Route.options.component;
  if (!Index) throw new Error("Index component missing");
  return render(<Index />);
}

describe("Index mode lifecycle", () => {
  it("stops playback when search navigation returns to picker", async () => {
    vi.useFakeTimers();
    const view = renderIndex();
    fireEvent.click(screen.getByRole("button", { name: "Preview transport" }));
    mode = "demo";
    view.rerender(<Route.options.component />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });
    expect(mocks.play).toHaveBeenCalled();
    expect(dawProps?.playing).toBe(true);

    const stops = mocks.stop.mock.calls.length;
    mode = "picker";
    view.rerender(<Route.options.component />);
    expect(mocks.stop.mock.calls.length).toBeGreaterThan(stops);
    expect(dawProps?.playing).toBe(false);
  });

  it("cancels preview playback after a rapid mode change", async () => {
    vi.useFakeTimers();
    const view = renderIndex();
    fireEvent.click(screen.getByRole("button", { name: "Preview transport" }));
    mode = "online";
    view.rerender(<Route.options.component />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(150);
    });
    expect(mocks.play).not.toHaveBeenCalled();
  });

  it("cancels preview playback on route unmount", async () => {
    vi.useFakeTimers();
    const view = renderIndex();
    fireEvent.click(screen.getByRole("button", { name: "Preview transport" }));
    view.unmount();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(150);
    });
    expect(mocks.play).not.toHaveBeenCalled();
  });
});
