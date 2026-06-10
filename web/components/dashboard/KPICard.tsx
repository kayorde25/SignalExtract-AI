interface Props {
  label: string;
  value: string | number;
  sub?: string;
  color?: "blue" | "green" | "amber" | "slate";
}

const colors = {
  blue: "text-blue-600",
  green: "text-green-600",
  amber: "text-amber-600",
  slate: "text-slate-700",
};

export default function KPICard({ label, value, sub, color = "slate" }: Props) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${colors[color]}`}>{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  );
}
