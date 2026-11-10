import { describe, expect, it } from "vitest";

import { getAgents, OSES, prereqSteps, type OsKey } from "@/components/showcase/AgentConfigs";
import { buildSetupPrompt } from "@/lib/setupPrompt";

function guidedPrompt(os: OsKey) {
  return buildSetupPrompt(os, "claude-code", "https://example.com/studio-engineer.git");
}

describe("connection-first setup", () => {
  for (const { key: os } of OSES) {
    it(`${os} reaches Connected before optional validation and voice downloads`, () => {
      const prompt = guidedPrompt(os);
      const install = prompt.indexOf("uv sync --locked");
      const server = prompt.indexOf("--transport sse");
      const status = prompt.indexOf("/api/status");
      const connected = prompt.indexOf("Connected");

      expect(prompt).toContain("uv sync --locked --extra dev && uv run --no-sync pytest -q");
      expect(install).toBeGreaterThanOrEqual(0);
      expect(server).toBeGreaterThan(install);
      expect(status).toBeGreaterThan(server);
      expect(connected).toBeGreaterThan(status);
      expect(prompt.indexOf("pytest")).toBeGreaterThan(connected);
      expect(prompt.toLowerCase().indexOf("kokoro")).toBeGreaterThan(connected);
    });

    it(`${os} restarts and verifies the companion after switching to Kokoro`, () => {
      const prompt = guidedPrompt(os);
      const connected = prompt.indexOf("Connected");
      const offline = prompt.toLowerCase().indexOf("fully offline", connected);
      const companionRestart = prompt.toLowerCase().indexOf("restart the local companion", offline);
      const status = prompt.indexOf("/api/status", companionRestart);
      const agentRestart = prompt.toLowerCase().indexOf("restart", status + "/api/status".length);

      expect(offline).toBeGreaterThan(connected);
      expect(companionRestart).toBeGreaterThan(offline);
      expect(status).toBeGreaterThan(companionRestart);
      expect(prompt.slice(status)).toContain("kokoro");
      expect(agentRestart).toBeGreaterThan(status);
    });

    it(`${os} development validation preserves an installed Kokoro runtime`, () => {
      expect(guidedPrompt(os)).toContain(
        "uv sync --locked --extra dev --extra kokoro && uv run --no-sync pytest -q",
      );
    });

    it(`${os} manual setup uses locked runtime installs and no-sync agent startup`, () => {
      const steps = prereqSteps(os);
      expect(steps.map((step) => step.title)).not.toContain("Run the tests");
      expect(steps.map((step) => step.code ?? "").join("\n")).toContain("uv sync --locked");

      for (const agent of getAgents(os)) {
        expect(agent.config).toContain("--no-sync");
        if (agent.lang === "json") {
          const run = agent.config.indexOf('"run"');
          const noSync = agent.config.indexOf('"--no-sync"');
          const python = agent.config.indexOf('"python"');
          expect(noSync).toBeGreaterThan(run);
          expect(python).toBeGreaterThan(noSync);
        }
      }
    });
  }
});
