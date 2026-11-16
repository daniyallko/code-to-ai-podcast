import { cleanup, fireEvent, render, screen } from "@testing-library/react";
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
  it("puts the interactive demo first and routes all three channels", () => {
    const onMode = vi.fn();
    render(<HeroSection mode="picker" onMode={onMode} onWarmOnline={vi.fn()} />);
    expect(screen.getByRole("heading", { name: "Code To AI Podcast" })).toBeInTheDocument();
    expect(screen.getAllByRole("button")[0]).toHaveTextContent("Interactive demo");

    fireEvent.click(screen.getByRole("button", { name: /Interactive demo/ }));
    expect(onMode).toHaveBeenCalledWith("demo");
    fireEvent.click(screen.getByRole("button", { name: /^Online Free/ }));
    expect(onMode).toHaveBeenCalledWith("online");
    fireEvent.click(screen.getByRole("button", { name: /Offline \/ Local/ }));
    expect(onMode).toHaveBeenCalledWith("offline");
  });

  it("does not render secondary mode-picker or agent links", () => {
    render(<HeroSection mode="picker" onMode={vi.fn()} onWarmOnline={vi.fn()} />);
    expect(screen.queryByRole("button", { name: /Mode picker/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Manual setup/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cursor" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Claude Desktop" })).not.toBeInTheDocument();
  });

  it("warms the cloud only while online mode is active", () => {
    const onWarmOnline = vi.fn();
    const { rerender } = render(
      <HeroSection mode="picker" onMode={vi.fn()} onWarmOnline={onWarmOnline} />,
    );
    const online = screen.getByRole("button", { name: /^Online Free/ });
    fireEvent.focus(online);
    fireEvent.mouseEnter(online);
    expect(onWarmOnline).not.toHaveBeenCalled();
    rerender(<HeroSection mode="demo" onMode={vi.fn()} onWarmOnline={onWarmOnline} />);
    fireEvent.focus(online);
    fireEvent.mouseEnter(online);
    expect(onWarmOnline).not.toHaveBeenCalled();
    rerender(<HeroSection mode="online" onMode={vi.fn()} onWarmOnline={onWarmOnline} />);
    fireEvent.focus(online);
    fireEvent.mouseEnter(online);
    expect(onWarmOnline).toHaveBeenCalledTimes(2);
  });
});
