import { useEffect, useRef } from "react";

export function StudioBackdrop() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) return;

    let frame = 0;
    const update = () => {
      frame = 0;
      const distance = Math.max(1, window.innerHeight * 1.15);
      const progress = Math.min(1, Math.max(0, window.scrollY / distance));
      root.style.setProperty("--studio-zoom", (1 + progress * 0.14).toFixed(4));
      root.style.setProperty("--studio-drift", `${(-progress * 2.5).toFixed(2)}%`);
      root.style.setProperty("--studio-shade", (progress * 0.2).toFixed(3));
    };
    const requestUpdate = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
    };
  }, []);

  return (
    <div
      ref={rootRef}
      aria-hidden="true"
      className="fixed inset-0 -z-10 overflow-hidden bg-[#08112c]"
    >
      <div
        className="absolute -left-[5.556%] top-0 h-full w-[111.11%] will-change-transform"
        style={{
          transform: "translateY(var(--studio-drift, 0%)) scale(var(--studio-zoom, 1))",
          transformOrigin: "62% 44%",
        }}
      >
        <img
          src="/assets/studio/rainy-window.jpg"
          alt=""
          className="absolute inset-0 size-full object-cover"
        />
        <video
          className="murmur-video absolute inset-0 size-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          poster="/assets/studio/rainy-window.jpg"
        >
          <source src="/assets/studio/rainy-window.mp4" type="video/mp4" />
        </video>
      </div>
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(4,9,26,0.78)_0%,rgba(4,9,26,0.48)_38%,rgba(4,9,26,0.18)_72%,rgba(4,9,26,0.3)_100%)]" />
      <div className="absolute inset-0 bg-[#050914] opacity-[var(--studio-shade,0)]" />
      <div className="murmur-bloom absolute inset-0 animate-[murmur-bloom_5.2s_ease-in-out_infinite] bg-[radial-gradient(circle_at_72%_62%,rgba(255,120,174,0.13),transparent_34%),radial-gradient(circle_at_82%_46%,rgba(255,179,0,0.1),transparent_28%),radial-gradient(circle_at_42%_20%,rgba(134,162,255,0.12),transparent_38%)] mix-blend-screen" />
      <div className="murmur-sweep absolute -top-1/2 left-0 h-[200%] w-24 bg-white/10 blur-2xl animate-[murmur-sweep_7s_linear_infinite]" />
      <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-[#050914]/80 to-transparent" />
    </div>
  );
}
