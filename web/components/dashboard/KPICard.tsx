import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

type Tone = "blue" | "green" | "amber" | "slate";

interface Props {
  label: string;
  value: string | number;
  sub?: string;
  color?: Tone;
  icon?: LucideIcon;
}

const ICON_TONE: Record<Tone, string> = {
  blue: "text-accent-2 bg-accent/10",
  green: "text-success bg-success/10",
  amber: "text-warning bg-warning/10",
  slate: "text-muted bg-surface-2",
};

export default function KPICard({ label, value, sub, color = "slate", icon: Icon }: Props) {
  return (
    <div className="card-surface group relative overflow-hidden p-5 transition-colors hover:border-border-strong">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-wider text-subtle">{label}</p>
        {Icon && (
          <span className={cn("grid h-8 w-8 place-items-center rounded-lg", ICON_TONE[color])}>
            <Icon size={15} />
          </span>
        )}
      </div>
      <p className="mt-3 font-mono text-3xl font-semibold tracking-tight text-fg tabular-nums">
        {value}
      </p>
      {sub && <p className="mt-1.5 text-xs text-subtle">{sub}</p>}
    </div>
  );
}
