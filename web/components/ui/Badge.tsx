import { STATUS_COLOR } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface Props {
  status: string;
  className?: string;
}

export default function Badge({ status, className }: Props) {
  const color = STATUS_COLOR[status] ?? "bg-slate-100 text-slate-600";
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold", color, className)}>
      {status.replace(/_/g, " ")}
    </span>
  );
}
