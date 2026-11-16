import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { LocalStudioPanel } from "@/components/showcase/LocalStudioPanel";
import { SetupPromptCard } from "@/components/showcase/SetupPromptCard";
import type { ConnState, Episode } from "@/lib/localStudio";

const mocks = vi.hoisted(() => ({
  commits: vi.fn(),
  episodes: vi.fn(),
  diff: vi.fn(),
  create: vi.fn(),
  episode: vi.fn(),
  masterUrl: vi.fn(() => "http://localhost:8000/master.mp3"),
}));

vi.mock("@/lib/localStudio", () => ({
  localApi: {
    commits: mocks.commits,
    episodes: mocks.episodes,
    diff: mocks.diff,
    create: mocks.create,
    episode: mocks.episode,
    masterUrl: mocks.masterUrl,
  },
}));

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    Link: ({ children, to }: { children: ReactNode; to: string }) => <a href={to}>{children}</a>,
  };
});

const connected: ConnState = {
  state: "connected",
  status: {
    ok: true,
    version: "1",
    tts_provider: "edge",
    ffmpeg: true,
    repo: { is_repo: true, repo_name: "demo-repo", branch: "main", dirty: true },
  },
};

beforeEach(() => {
  mocks.commits.mockResolvedValue([]);
  mocks.episodes.mockResolvedValue([]);
  mocks.diff.mockResolvedValue({ title: "Working changes", diff: "+one" });
  mocks.create.mockResolvedValue({ id: "job-1" });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("offline studio", () => {
  it("keeps disconnected localhost guidance and the setup path", () => {
    render(
      <>
        <SetupPromptCard />
        <LocalStudioPanel conn={{ state: "offline", status: null }} onLoad={vi.fn()} />
      </>,
    );
    expect(screen.getByText(/Chrome or Edge/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Prefer manual setup? →" })).toHaveAttribute(
      "href",
      "/setup",
    );
  });

  it("exposes source and format selections with their current values", async () => {
    render(<LocalStudioPanel conn={connected} onLoad={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Uncommitted changes" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: /PR Roast/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("uses labelled groups instead of orphaned setup tablists", () => {
    render(<SetupPromptCard />);
    expect(screen.getByRole("group", { name: "System" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Agent" })).toBeInTheDocument();
    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "macOS" })).toHaveAttribute("aria-pressed", "true");
  });

  it("retains real download and improve actions after completion", async () => {
    const completed: Episode = {
      id: "job-1",
      format: "roast",
      status: "COMPLETED",
      step: "done",
      progress: 1,
      error: null,
      title: "Local episode",
      created_at: 1,
    };
    mocks.episode.mockResolvedValue(completed);
    render(<LocalStudioPanel conn={connected} onLoad={vi.fn()} />);
    const generate = await screen.findByRole("button", { name: /Generate audio/ });
    await waitFor(() => expect(generate).toBeEnabled());
    fireEvent.click(generate);
    expect(
      await screen.findByRole("link", { name: /Download MP3/ }, { timeout: 2500 }),
    ).toHaveAttribute("href", "http://localhost:8000/master.mp3");
    expect(
      screen.getByRole("button", { name: /Improve script with my agent/ }),
    ).toBeInTheDocument();
  });
});
