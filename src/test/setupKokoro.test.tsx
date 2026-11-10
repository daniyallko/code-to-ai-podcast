import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>();
  return { ...actual, Link: ({ children }: { children: ReactNode }) => children };
});

import { Route } from "@/routes/setup";

afterEach(cleanup);

it("manual setup keeps Kokoro locked and preserves it during validation", () => {
  const SetupPage = Route.options.component;
  if (!SetupPage) throw new Error("Setup page component missing");
  render(<SetupPage />);

  expect(screen.getByText("uv sync --locked --extra kokoro")).toBeTruthy();
  expect(screen.getByText("uv sync --locked --extra dev --extra kokoro && uv run --no-sync pytest -q")).toBeTruthy();
});
