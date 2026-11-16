import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { McpProtocolInspector } from "@/components/showcase/McpProtocolInspector";
import { SCENARIOS, buildTrace } from "@/lib/demoScenario";

const scenario = SCENARIOS[0]!;
const packets = buildTrace(scenario);

function renderInspector(overrides: Partial<Parameters<typeof McpProtocolInspector>[0]> = {}) {
  const onSelect = vi.fn();
  render(
    <McpProtocolInspector
      scenario={scenario}
      onScenario={vi.fn()}
      packets={packets}
      positionMs={0}
      started={false}
      selectedId={null}
      onSelect={onSelect}
      demo={true}
      {...overrides}
    />,
  );
  return onSelect;
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("McpProtocolInspector", () => {
  it("filters synchronized packets to the current playhead", () => {
    renderInspector({ started: true, positionMs: 0 });
    expect(screen.getByText(packets[0]!.label)).toBeInTheDocument();
    expect(screen.queryByText(packets.at(-1)!.label)).not.toBeInTheDocument();
  });

  it("selects the original packet object", () => {
    const onSelect = renderInspector();
    fireEvent.click(screen.getByRole("button", { name: /render_master_mix/ }));
    expect(onSelect).toHaveBeenCalledWith(packets.at(-1));
  });

  it("expands and collapses native JSON object nodes", () => {
    const packet = packets.at(-1)!;
    renderInspector({ selectedId: packet.id });
    expect(screen.getByText("REQUEST")).toBeInTheDocument();
    expect(screen.getByText("RESPONSE")).toBeInTheDocument();
    const summary = screen.getByText("params");
    const details = summary.closest("details");
    expect(details).not.toHaveAttribute("open");
    fireEvent.click(summary);
    expect(details).toHaveAttribute("open");
    fireEvent.click(summary);
    expect(details).not.toHaveAttribute("open");
  });

  it("copies the exact selected request JSON", async () => {
    const writeText = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    const packet = packets.at(-1)!;
    renderInspector({ selectedId: packet.id });
    fireEvent.click(screen.getByRole("button", { name: "Copy request" }));
    expect(writeText).toHaveBeenCalledWith(JSON.stringify(packet.request, null, 2));
    expect(await screen.findByRole("button", { name: "Copied" })).toBeInTheDocument();
  });
});
