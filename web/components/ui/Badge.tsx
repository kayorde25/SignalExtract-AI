import { cn } from "@/lib/utils";

type Tone = "neutral" | "info" | "success" | "warning" | "danger" | "accent";

const TONE: Record<Tone, string> = {
  neutral: "bg-surface-2 text-muted border-border",
  info: "bg-accent/10 text-accent-2 border-accent/25",
  success: "bg-success/12 text-success border-success/25",
  warning: "bg-warning/12 text-warning border-warning/25",
  danger: "bg-danger/12 text-danger border-danger/25",
  accent: "bg-accent/12 text-accent-2 border-accent/30",
};

const DOT: Record<Tone, string> = {
  neutral: "bg-subtle",
  info: "bg-accent-2",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  accent: "bg-accent-2",
};

const STATUS_TONE: Record<string, Tone> = {
  uploaded: "neutral",
  extracting_text: "info",
  text_ready: "info",
  extracting_signals: "accent",
  done: "success",
  error: "danger",
  pending: "warning",
  approved: "success",
  rejected: "danger",
  edited: "info",
  rule_based: "neutral",
  hybrid: "accent",
  llm: "info",
};

interface Props {
  status: string;
  label?: string;
  className?: string;
  dot?: boolean;
}

export default function Badge({ status, label, className, dot = true }: Props) {
  const tone = STATUS_TONE[status] ?? "neutral";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize",
        TONE[tone],
        className,
      )}
    >
      {dot && <span className={cn("h-1.5 w-1.5 rounded-full", DOT[tone])} />}
      {label ?? status.replace(/_/g, " ")}
    </span>
  );
}
