import { useEffect, useRef, useState } from "react";
import { duckingAt, type Scenario } from "@/lib/demoScenario";

/** Six-second scenario-derived gain-reduction window centered on the playhead. */
export function SidechainVisualizer({
  scenario,
  positionMs,
  playing,
}: {
  scenario: Scenario;
  positionMs: number;
  playing: boolean;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setVisible(!!entry?.isIntersecting), {
      rootMargin: "100px",
    });
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !visible) return;
    const draw = () => {
      const dpr = window.devicePixelRatio || 1;
      const width = (canvas.width = canvas.clientWidth * dpr);
      const height = (canvas.height = canvas.clientHeight * dpr);
      const context = canvas.getContext("2d");
      if (!context) return;
      const css = getComputedStyle(canvas);
      const coral = css.getPropertyValue("--coral").trim();
      const border = css.getPropertyValue("--border").trim();
      const signal = css.getPropertyValue("--signal").trim();
      context.clearRect(0, 0, width, height);
      context.strokeStyle = border;
      context.lineWidth = dpr;
      context.font = `${10 * dpr}px JetBrains Mono`;
      context.fillStyle = css.getPropertyValue("--muted-foreground").trim();
      for (const db of [0, -6, -12]) {
        const y = height * 0.1 + (-db / 12) * height * 0.75;
        context.beginPath();
        context.moveTo(0, y);
        context.lineTo(width, y);
        context.stroke();
        context.fillText(`${db} dB`, 6 * dpr, y - 4 * dpr);
      }
      const windowMs = 6000;
      const start = positionMs - windowMs / 2;
      context.fillStyle = signal;
      context.globalAlpha = 0.12;
      for (const stem of scenario.stems) {
        const x0 = ((stem.start_ms - start) / windowMs) * width;
        const x1 = ((stem.start_ms + stem.duration_ms - start) / windowMs) * width;
        if (x1 > 0 && x0 < width) context.fillRect(x0, 0, x1 - x0, height);
      }
      context.globalAlpha = 1;
      context.strokeStyle = coral;
      context.lineWidth = 2 * dpr;
      context.shadowColor = coral;
      context.shadowBlur = playing ? 9 * dpr : 0;
      context.beginPath();
      for (let x = 0; x <= width; x += 2 * dpr) {
        const reduction = duckingAt(scenario, start + (x / width) * windowMs);
        const y = height * 0.1 + (-reduction / 12) * height * 0.75;
        if (x === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      }
      context.stroke();
      context.shadowBlur = 0;
      context.strokeStyle = css.getPropertyValue("--foreground").trim();
      context.lineWidth = dpr;
      context.beginPath();
      context.moveTo(width / 2, 0);
      context.lineTo(width / 2, height);
      context.stroke();
    };
    draw();
    window.addEventListener("resize", draw);
    return () => window.removeEventListener("resize", draw);
  }, [scenario, positionMs, playing, visible]);

  const reduction = duckingAt(scenario, positionMs);
  return (
    <div className="rack-panel min-w-0 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div>
          <p className="font-mono text-[10px] tracking-[0.12em] text-muted-foreground">
            SIDECHAIN SCOPE
          </p>
          <p className="mt-1 font-mono text-[8px] text-muted-foreground">
            SCENARIO-DERIVED · {playing ? "PLAYHEAD LIVE" : "PAUSED FRAME"}
          </p>
        </div>
        <span className="font-mono text-sm tabular-nums text-coral">
          {reduction.toFixed(1)} dB GR
        </span>
      </div>
      <div className="bg-[linear-gradient(rgb(255,255,255,0.012)_1px,transparent_1px)] bg-[size:100%_12px]">
        <canvas
          ref={ref}
          role="img"
          aria-label="Sidechain gain reduction scope"
          className="h-44 w-full"
        >
          Six-second view of music gain reduction around the current playhead. Current derived
          reduction: {reduction.toFixed(1)} dB.
        </canvas>
      </div>
      <p className="border-t border-border px-4 py-2 font-mono text-[8px] leading-4 text-muted-foreground">
        THRESHOLD 0.03 · RATIO 6 · ATTACK 50MS · RELEASE 600MS
      </p>
    </div>
  );
}
