interface Segment {
  label: string;
  value: number;
  color: string; // a tailwind text-color class is NOT used; pass a css var rgb string
}

/** Lightweight SVG donut. Colors are CSS rgb() strings so they theme correctly. */
export default function Donut({
  segments,
  size = 168,
  thickness = 18,
  centerLabel,
  centerSub,
}: {
  segments: Segment[];
  size?: number;
  thickness?: number;
  centerLabel: string;
  centerSub?: string;
}) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className="flex items-center gap-6">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2} cy={size / 2} r={r} fill="none"
            stroke="rgb(var(--surface-2))" strokeWidth={thickness}
          />
          {segments.map((seg) => {
            const len = (seg.value / total) * c;
            const el = (
              <circle
                key={seg.label}
                cx={size / 2} cy={size / 2} r={r} fill="none"
                stroke={seg.color} strokeWidth={thickness}
                strokeDasharray={`${len} ${c - len}`}
                strokeDashoffset={-offset}
                strokeLinecap="round"
                style={{ transition: "stroke-dasharray .6s ease" }}
              />
            );
            offset += len;
            return el;
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-2xl font-semibold tabular-nums text-fg">{centerLabel}</span>
          {centerSub && <span className="text-xs text-subtle">{centerSub}</span>}
        </div>
      </div>
      <ul className="space-y-2.5">
        {segments.map((seg) => (
          <li key={seg.label} className="flex items-center gap-2.5 text-sm">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: seg.color }} />
            <span className="text-muted">{seg.label}</span>
            <span className="ml-auto font-mono font-medium tabular-nums text-fg">{seg.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
