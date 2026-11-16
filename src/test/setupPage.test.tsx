import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { Route } from "@/routes/setup";

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    Link: ({ children, to }: { children: ReactNode; to: string }) => <a href={to}>{children}</a>,
  };
});

afterEach(cleanup);

function renderSetup() {
  const SetupPage = Route.options.component;
  if (!SetupPage) throw new Error("Setup page component missing");
  return render(<SetupPage />);
}

describe("SetupPage", () => {
  it("keeps the studio return path and neutral guide status", () => {
    renderSetup();
    expect(screen.getByRole("link", { name: "← Back to studio" })).toHaveAttribute("href", "/");
    expect(screen.getByText("Local setup guide")).toBeInTheDocument();
  });

  it("uses a labelled OS group and keyboard-navigable agent tabs", async () => {
    renderSetup();
    expect(screen.getByRole("group", { name: "Operating system" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Windows" }));
    expect(screen.getByRole("button", { name: "Windows" })).toHaveAttribute("aria-pressed", "true");

    const first = screen.getAllByRole("tab")[0]!;
    first.focus();
    fireEvent.keyDown(first, { key: "ArrowRight" });
    const tabs = screen.getAllByRole("tab");
    await waitFor(() => expect(tabs[1]).toHaveFocus());
    await waitFor(() => expect(tabs[1]).toHaveAttribute("aria-selected", "true"));
    const panelId = tabs[1]!.getAttribute("aria-controls");
    expect(panelId).toBeTruthy();
    expect(document.getElementById(panelId!)).toHaveAttribute("role", "tabpanel");
  });

  it("keeps real commands and exposes copy actions", () => {
    renderSetup();
    expect(screen.getByText("uv sync --locked --extra kokoro")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Copy/ }).length).toBeGreaterThan(3);
  });
});
