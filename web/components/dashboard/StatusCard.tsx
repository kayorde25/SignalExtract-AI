type StatusCardProps = {
  title: string;
  value: string;
  detail: string;
  health: "healthy" | "degraded";
};

export function StatusCard({ title, value, detail, health }: StatusCardProps) {
  const healthClassName =
    health === "healthy"
      ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
      : "border-amber-400/30 bg-amber-500/10 text-amber-200";

  return (
    <article className="rounded-2xl border border-white/10 bg-slate-900/45 p-4 shadow-[0_14px_28px_rgba(2,6,23,0.28)] transition duration-200 hover:border-blue-400/30 hover:bg-slate-900/60">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-slate-300">{title}</p>
        <span
          className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${healthClassName}`}
        >
          {health === "healthy" ? "Healthy" : "Degraded"}
        </span>
      </div>
      <p className="mt-3 text-base font-semibold text-white">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{detail}</p>
    </article>
  );
}
