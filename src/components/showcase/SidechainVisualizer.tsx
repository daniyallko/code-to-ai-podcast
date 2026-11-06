import { useEffect, useRef } from "react";
import { duckingAt, type Scenario } from "@/lib/demoScenario";

/** Scrolling 6-second window of BGM gain reduction centered on the playhead. */
export function SidechainVisualizer({ scenario, positionMs }: { scenario: Scenario; positionMs: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const dpr = devicePixelRatio;
    const w = (c.width = c.clientWidth * dpr);
    const h = (c.height = c.clientHeight * dpr);
    const g = c.getContext("2d");
    if (!g) return;
    const css = getComputedStyle(c);
    const primary = css.getPropertyValue("--primary").trim();
    const border = css.getPropertyValue("--border").trim();
    const signal = css.getPropertyValue("--signal").trim();
    g.clearRect(0, 0, w, h);
    g.strokeStyle = border;
    g.lineWidth = dpr;
    g.font = `${10 * dpr}px JetBrains Mono`;
    g.fillStyle = border;
    for (const db of [0, -6, -12]) {
      const y = h * 0.1 + (-db / 12) * h * 0.75;
      g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke();
      g.fillText(`${db} dB`, 6 * dpr, y - 4 * dpr);
    }
    const win = 6000, t0 = positionMs - win / 2;
    // voice activity
    g.fillStyle = signal;
    g.globalAlpha = 0.15;
    for (const s of scenario.stems) {
      const x0 = ((s.start_ms - t0) / win) * w, x1 = ((s.start_ms + s.duration_ms - t0) / win) * w;
      if (x1 > 0 && x0 < w) g.fillRect(x0, 0, x1 - x0, h);
    }
    g.globalAlpha = 1;
    g.strokeStyle = primary;
    g.lineWidth = 2.5 * dpr;
    g.shadowColor = primary;
    g.shadowBlur = 12 * dpr;
    g.beginPath();
    for (let x = 0; x <= w; x += 2 * dpr) {
      const gr = duckingAt(scenario, t0 + (x / w) * win);
      const y = h * 0.1 + (-gr / 12) * h * 0.75;
      if (x === 0) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.stroke();
    g.shadowBlur = 0;
    g.strokeStyle = css.getPropertyValue("--foreground").trim();
    g.lineWidth = dpr;
    g.beginPath(); g.moveTo(w / 2, 0); g.lineTo(w / 2, h); g.stroke();
  }, [scenario, positionMs]);

  return (
    <div className="panel overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <span className="font-mono text-xs text-muted-foreground">SIDECHAIN · sidechaincompress threshold=0.03 ratio=6 attack=50 release=600</span>
        <span className="font-mono text-xs text-primary">{duckingAt(scenario, positionMs).toFixed(1)} dB</span>
      </div>
      <canvas ref={ref} className="h-44 w-full" />
    </div>
  );
}
