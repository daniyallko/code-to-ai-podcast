function Primitive({ name, value }: { name?: string; value: unknown }) {
  const type = value === null ? "null" : typeof value;
  const rendered = value === undefined ? "undefined" : JSON.stringify(value);
  return (
    <div className="flex min-w-0 gap-2 py-0.5 font-mono text-[10px] leading-4">
      {name !== undefined && <span className="flex-none text-muted-foreground">{name}:</span>}
      <span
        className={`break-words ${type === "string" ? "text-signal" : type === "number" ? "text-primary" : type === "boolean" ? "text-wave" : "text-muted-foreground"}`}
      >
        {rendered}
      </span>
    </div>
  );
}

function Node({ name, value, depth }: { name?: string; value: unknown; depth: number }) {
  if (value === null || typeof value !== "object") return <Primitive name={name} value={value} />;
  const entries = Array.isArray(value)
    ? value.map((item, index) => [String(index), item] as const)
    : Object.entries(value);
  return (
    <details open={depth === 0} className="min-w-0 border-l border-border/70 pl-2">
      <summary className="flex min-h-6 cursor-pointer items-center gap-2 font-mono text-[10px] text-wave">
        <span>{name ?? (Array.isArray(value) ? "array" : "object")}</span>
        <span className="text-[8px] text-muted-foreground">
          {Array.isArray(value) ? `[${entries.length}]` : `{${entries.length}}`}
        </span>
      </summary>
      <div className="ml-1 min-w-0">
        {entries.map(([key, item]) => (
          <Node key={key} name={key} value={item} depth={depth + 1} />
        ))}
      </div>
    </details>
  );
}

export function JsonTree({ value, name }: { value: unknown; name?: string }) {
  return (
    <div className="min-w-0 font-mono">
      <Node name={name} value={value} depth={0} />
    </div>
  );
}
