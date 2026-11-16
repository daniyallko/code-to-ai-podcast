import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { HeroSection } from "@/components/showcase/HeroSection";
import { StudioHeader } from "@/components/showcase/StudioHeader";

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    Link: ({ children, to }: { children: ReactNode; to: string }) => <a href={to}>{children}</a>,
  };
});

afterEach(cleanup);

describe("StudioHeader", () => {
  it("shows a neutral demo state instead of a false offline warning", () => {
    render(
      <StudioHeader
        status={{ tone: "neutral", label: "Prerecorded demo · no server", detail: "Local assets" }}
      />,
    );
    expect(screen.getByRole("status")).toHaveTextContent("Prerecorded demo · no server");
    expect(screen.getByRole("status")).not.toHaveTextContent(/offline/i);
    expect(screen.getByRole("link", { name: "GitHub" })).toHaveAttribute(
      "href",
      "https://github.com/daniyallko/code-to-ai-podcast",
    );
    expect(screen.getByRole("link", { name: "Audio Spec" })).toHaveAttribute(
      "href",
      "/?mode=demo#daw",
    );
  });
});

describe("HeroSection", () => {
  it("routes all three channels and preserves the exact product headline", () => {
    const onMode = vi.fn();
    render(<HeroSection mode="picker" onMode={onMode} onWarmOnline={vi.fn()} />);
    expect(
      screen.getByRole("heading", { name: "Turn Code Diffs into Broadcast Podcasts." }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /ONLINE/ }));
    expect(screen.getByRole("button", { name: /ONLINE/ })).toHaveClass("flex-col");
    expect(onMode).toHaveBeenCalledWith("online");
    fireEvent.click(screen.getByRole("button", { name: /INTERACTIVE DEMO/ }));
    expect(onMode).toHaveBeenCalledWith("demo");
    fireEvent.click(screen.getByRole("button", { name: /OFFLINE \/ LOCAL/ }));
    expect(onMode).toHaveBeenCalledWith("offline");
  });

  it("opens an accessible agent dialog, closes with Escape, and returns focus", async () => {
    render(<HeroSection mode="picker" onMode={vi.fn()} onWarmOnline={vi.fn()} />);
    const trigger = screen.getByRole("button", { name: "Cursor" });
    fireEvent.click(trigger);
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() => expect(trigger).toHaveFocus());
  });
});
