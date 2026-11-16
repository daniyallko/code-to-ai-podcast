import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CopyButton } from "@/components/showcase/CopyButton";
import { DiffView } from "@/components/showcase/DiffView";
import { FormatCards } from "@/components/showcase/FormatCards";
import { GenerationProgress } from "@/components/showcase/GenerationProgress";
import type { Episode } from "@/lib/localStudio";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function clipboard(result: "resolve" | "reject") {
  const writeText = vi.fn(() => result === "resolve" ? Promise.resolve() : Promise.reject(new Error("denied")));
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
  return writeText;
}

function job(overrides: Partial<Episode> = {}): Episode {
  return {
    id: "episode-1",
    format: "roast",
    status: "RUNNING",
    step: "scripting",
    progress: 0.25,
    error: null,
    title: "Test episode",
    created_at: 1,
    ...overrides,
  };
}

describe("CopyButton", () => {
  it("copies the supplied text and announces success", async () => {
    const writeText = clipboard("resolve");
    render(<CopyButton text="exact payload" />);
    fireEvent.click(screen.getByRole("button", { name: "Copy" }));
    expect(await screen.findByRole("button", { name: "Copied" })).toBeInTheDocument();
    expect(writeText).toHaveBeenCalledWith("exact payload");
  });

  it("announces failure instead of false success", async () => {
    clipboard("reject");
    render(<CopyButton text="payload" />);
    fireEvent.click(screen.getByRole("button", { name: "Copy" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Copy failed");
  });
});

describe("FormatCards", () => {
  it("renders three formats and selects the requested format", () => {
    const onChange = vi.fn();
    render(<FormatCards value="roast" onChange={onChange} />);
    expect(screen.getAllByRole("button")).toHaveLength(3);
    expect(screen.getByRole("button", { name: /PR Roast/ })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: /Code Explainer/ }));
    expect(onChange).toHaveBeenCalledWith("explainer");
  });
});

describe("DiffView", () => {
  it("caps rendered lines and labels change kinds for assistive technology", () => {
    render(<DiffView diff={"+one\n-two\n context"} maxLines={2} />);
    expect(screen.getByLabelText("Addition: +one")).toBeInTheDocument();
    expect(screen.getByLabelText("Deletion: -two")).toBeInTheDocument();
    expect(screen.queryByText(" context")).not.toBeInTheDocument();
  });
});

describe("GenerationProgress", () => {
  it("shows an unknown real step without inventing a stage", () => {
    render(<GenerationProgress job={job({ step: "uploading" })} />);
    expect(screen.getByText("uploading")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem").every((item) => item.getAttribute("data-state") === "pending")).toBe(true);
  });

  it("shows only real queue positions and export URLs", () => {
    const { rerender } = render(<GenerationProgress job={job({ status: "QUEUED", queue_position: 0 })} />);
    expect(screen.queryByText(/in line/)).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Download MP3/ })).not.toBeInTheDocument();
    rerender(<GenerationProgress job={job({ status: "QUEUED", queue_position: 2 })} masterUrl="https://example.com/master.mp3" />);
    expect(screen.getByText("#2 in line")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Download MP3/ })).toHaveAttribute("href", "https://example.com/master.mp3");
  });
});
