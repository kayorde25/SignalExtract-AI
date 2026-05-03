import { LucideIcon } from "lucide-react";

type MetricCardProps = {
  label: string;
  value: string | number;
  helper: string;
  icon: LucideIcon;
  toneClassName: string;
};

export function MetricCard({
  label,
  value,
  helper,
  icon: Icon,
  toneClassName,
}: MetricCardProps) {
  return (
    <article className="group rounded-2xl border border-white/10 bg-slate-900/45 p-5 shadow-[0_20px_40px_rgba(2,6,23,0.35)] transition duration-200 hover:-translate-y-1 hover:border-blue-400/35 hover:bg-slate-900/65">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
            {label}
          </p>
          <p className="mt-3 text-3xl font-semibold text-white">{value}</p>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] transition group-hover:border-blue-300/40 group-hover:bg-blue-500/10">
          <Icon className={`h-5 w-5 ${toneClassName}`} />
        </div>
      </div>
      <p className="mt-4 text-sm text-slate-400">{helper}</p>
    </article>
  );
}
