import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GitHubStudioPanel } from "@/components/showcase/GitHubStudioPanel";

const mocks = vi.hoisted(() => ({
  listItems: vi.fn(),
  fetchDiff: vi.fn(),
  create: vi.fn(),
  episode: vi.fn(),
  masterUrl: vi.fn((id: string) => `https://cloud.test/${id}/master.mp3`),
}));

vi.mock("@/lib/github", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/github")>();
  return { ...actual, listItems: mocks.listItems, fetchDiff: mocks.fetchDiff };
});

vi.mock("@/lib/localStudio", () => ({
  cloudApi: {
    base: "https://cloud.test",
    create: mocks.create,
    episode: mocks.episode,
    masterUrl: mocks.masterUrl,
  },
}));

const commit = { id: "abc1234", kind: "commit" as const, label: "abc1234 · Fix playback — Ada" };

beforeEach(() => {
  mocks.listItems.mockResolvedValue([commit]);
  mocks.fetchDiff.mockResolvedValue("+one\n-two");
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function renderPanel() {
  return render(<GitHubStudioPanel onLoad={vi.fn()} online={true} onRetry={vi.fn()} />);
}

describe("GitHubStudioPanel", () => {
  it("keeps invalid repository guidance and does not fetch", async () => {
    renderPanel();
    fireEvent.change(screen.getByRole("textbox", { name: "Public GitHub repository" }), {
      target: { value: "not a repo" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Fetch" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Enter a repo like owner/name or a github.com link.",
    );
    expect(mocks.listItems).not.toHaveBeenCalled();
  });

  it.each([{ key: "ctrlKey" }, { key: "metaKey" }])(
    "loads the repository with $key + Enter",
    async ({ key }) => {
      renderPanel();
      const input = screen.getByRole("textbox", { name: "Public GitHub repository" });
      fireEvent.change(input, { target: { value: "owner/repo" } });
      fireEvent.keyDown(input, { key: "Enter", [key]: true });
      await waitFor(() => expect(mocks.listItems).toHaveBeenCalledWith("owner", "repo"));
    },
  );

  it("selects a format and disables generation until a real diff exists", async () => {
    renderPanel();
    const generate = screen.getByRole("button", { name: /Generate podcast/ });
    expect(generate).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: /Code Explainer/ }));
    expect(screen.getByRole("button", { name: /Code Explainer/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("shows a diff disclosure with real addition and deletion totals", async () => {
    renderPanel();
    fireEvent.change(screen.getByRole("textbox", { name: "Public GitHub repository" }), {
      target: { value: "owner/repo" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Fetch" }));
    expect(await screen.findByText("Diff peek")).toBeInTheDocument();
    expect(await screen.findByText("+1 additions")).toBeInTheDocument();
    expect(screen.getByText("−1 deletions")).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Generate podcast/ })).toBeEnabled(),
    );
  });
});
