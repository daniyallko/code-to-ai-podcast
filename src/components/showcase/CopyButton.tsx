import { useEffect, useRef, useState } from "react";
import { AlertCircle, Check, Copy } from "lucide-react";

export function CopyButton({
  text,
  label = "Copy",
  className = "",
}: {
  text: string;
  label?: string;
  className?: string;
}) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const copy = async () => {
    if (timer.current) clearTimeout(timer.current);
    try {
      if (!navigator.clipboard) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(text);
      setState("copied");
    } catch {
      setState("failed");
    }
    timer.current = setTimeout(() => setState("idle"), 1800);
  };

  const message = state === "copied" ? "Copied" : state === "failed" ? "Copy failed" : "";
  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={() => void copy()}
        className={`hardware-button min-h-9 px-3 py-1.5 font-mono text-xs ${className}`}
      >
        {state === "copied" ? (
          <Check className="size-3.5 text-signal" />
        ) : state === "failed" ? (
          <AlertCircle className="size-3.5 text-coral" />
        ) : (
          <Copy className="size-3.5" />
        )}
        {message || label}
      </button>
      <span role="status" aria-live="polite" className="sr-only">
        {message}
      </span>
    </span>
  );
}
