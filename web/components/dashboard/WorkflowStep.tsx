import { LucideIcon } from "lucide-react";

type WorkflowStepProps = {
  label: string;
  icon: LucideIcon;
  active?: boolean;
};

export function WorkflowStep({ label, icon: Icon, active = false }: WorkflowStepProps) {
  return (
    <div
      className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition ${
        active
          ? "border-blue-400/40 bg-blue-500/10 text-blue-200"
          : "border-white/10 bg-white/[0.03] text-slate-300"
      }`}
    >
      <Icon className="h-4 w-4" />
      <span>{label}</span>
    </div>
  );
}
