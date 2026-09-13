"use client";
import { Calendar, DollarSign, AlertTriangle, FileText, Layers } from "lucide-react";

const PROMPTS = [
  { icon: FileText,      label: "Summarize this document" },
  { icon: Calendar,      label: "Extract key dates" },
  { icon: DollarSign,    label: "Find monetary values" },
  { icon: AlertTriangle, label: "Identify risks" },
  { icon: Layers,        label: "Compare documents" },
];

interface Props {
  onSelect: (prompt: string) => void;
}

export default function PromptSuggestions({ onSelect }: Props) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {PROMPTS.map(({ icon: Icon, label }) => (
        <button
          key={label}
          onClick={() => onSelect(label)}
          className="flex items-center gap-2.5 rounded-xl border border-border bg-surface px-4 py-3 text-left text-sm text-muted transition-all hover:border-accent/40 hover:bg-accent/5 hover:text-fg hover:shadow-glow-sm"
        >
          <Icon size={15} className="shrink-0 text-accent-2" />
          {label}
        </button>
      ))}
    </div>
  );
}
