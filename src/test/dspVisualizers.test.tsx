import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { FiltergraphDiagram } from "@/components/showcase/FiltergraphDiagram";
import { filterExcerpt } from "@/lib/filtergraph";
import { SidechainVisualizer } from "@/components/showcase/SidechainVisualizer";
import { SCENARIOS } from "@/lib/demoScenario";

const graph =
  "[0:a]adelay=10|10[d0];[bgm][key]sidechaincompress=threshold=0.03:ratio=9[ducked];[ducked]loudnorm=I=-14:TP=-2:LRA=9[out]";

beforeAll(() => {
  Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
    configurable: true,
    value: vi.fn(() => null),
  });
  Object.defineProperty(globalThis, "IntersectionObserver", {
    configurable: true,
    value: class {
      constructor(callback: IntersectionObserverCallback) {
        callback(
          [{ isIntersecting: true } as IntersectionObserverEntry],
          this as unknown as IntersectionObserver,
        );
      }
      observe() {}
      disconnect() {}
    },
  });
});

afterEach(cleanup);

describe("filterExcerpt", () => {
  it("returns the actual matching filter chain and null when absent", () => {
    expect(filterExcerpt(graph, "sidechaincompress")).toBe(
      "[bgm][key]sidechaincompress=threshold=0.03:ratio=9[ducked]",
    );
    expect(filterExcerpt(graph, "loudnorm")).toBe("[ducked]loudnorm=I=-14:TP=-2:LRA=9[out]");
    expect(filterExcerpt(graph, "aresample")).toBeNull();
  });
});

describe("DSP visualizers", () => {
  it("selects real filter nodes by click and keyboard focus", () => {
    render(<FiltergraphDiagram filterComplex={graph} playing={false} />);
    expect(screen.getByRole("group", { name: "FFmpeg signal flow" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "loudnorm" }));
    expect(screen.getByText(/loudnorm=I=-14/, { selector: "code" })).toBeInTheDocument();
    fireEvent.focus(screen.getByRole("button", { name: "sidechaincompress" }));
    expect(screen.getByText(/ratio=9/, { selector: "code" })).toBeInTheDocument();
  });

  it("disables signal pulses while paused", () => {
    const { container, rerender } = render(
      <FiltergraphDiagram filterComplex={graph} playing={false} />,
    );
    expect(container.querySelectorAll('[data-signal="active"]')).toHaveLength(0);
    rerender(<FiltergraphDiagram filterComplex={graph} playing={true} />);
    expect(container.querySelectorAll('[data-signal="active"]').length).toBeGreaterThan(0);
  });

  it("labels the sidechain scope as scenario-derived", () => {
    render(<SidechainVisualizer scenario={SCENARIOS[0]!} positionMs={5000} playing={false} />);
    expect(screen.getByRole("img", { name: "Sidechain gain reduction scope" })).toBeInTheDocument();
    expect(screen.getByText(/SCENARIO-DERIVED/)).toBeInTheDocument();
  });
});
