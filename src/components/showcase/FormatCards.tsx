import type { EpisodeFormat } from "@/lib/localStudio";

const FORMATS: { value: EpisodeFormat; label: string; description: string }[] = [
  { value: "roast", label: "PR Roast", description: "Alex & Sam debate the change" },
  { value: "explainer", label: "Code Explainer", description: "One narrator walks through it" },
  { value: "postmortem", label: "Incident Postmortem", description: "Blast radius and follow-ups" },
];

export function FormatCards({
  value,
  onChange,
}: {
  value: EpisodeFormat;
  onChange: (value: EpisodeFormat) => void;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-3" role="group" aria-label="Episode format">
      {FORMATS.map((format) => (
        <button
          key={format.value}
          type="button"
          aria-pressed={value === format.value}
          onClick={() => onChange(format.value)}
          className={`hardware-button relative min-h-28 flex-col items-start justify-start overflow-hidden p-3 text-left ${value === format.value ? "border-primary/70 bg-primary/5 text-primary" : "text-foreground"}`}
        >
          <span className="block text-sm">{format.label}</span>
          <span className="mt-1 block text-xs font-normal text-muted-foreground">
            {format.description}
          </span>
          <span aria-hidden="true" className="mt-auto flex h-5 items-end gap-0.5 opacity-60">
            {[7, 13, 9, 18, 11, 16, 6, 12, 8].map((height, index) => (
              <span
                key={index}
                className={`w-0.5 ${value === format.value ? "bg-primary" : "bg-muted-foreground"}`}
                style={{ height }}
              />
            ))}
          </span>
        </button>
      ))}
    </div>
  );
}
