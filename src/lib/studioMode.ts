import type { Mode } from "@/components/showcase/HeroSection";

export function studioVisibility(
  mode: Mode,
  hasLiveEpisode: boolean,
): { showDaw: boolean; showTelemetry: boolean } {
  return {
    showDaw: mode === "picker" || mode === "demo" || hasLiveEpisode,
    showTelemetry: mode === "demo" || hasLiveEpisode,
  };
}
