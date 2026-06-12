"use client";
import { useMemo, useState } from "react";
import { Check, X, Pencil, Search } from "lucide-react";
import type { Signal, ReviewBody } from "@/lib/api";
import { api } from "@/lib/api";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import { cn, pct, confidenceTone } from "@/lib/utils";
import { signalMeta, isClaimLevel } from "@/lib/signal-types";

interface Props {
  signals: Signal[];
  onChanged: () => void;
  selectedId?: string | null;
  onSelect?: (s: Signal) => void;
  compact?: boolean;
}

const TONE_BAR: Record<string, string> = {
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
};
const TONE_TEXT: Record<string, string> = {
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger",
};

function ConfidenceMeter({ value }: { value: number }) {
  const tone = confidenceTone(value);
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-14 overflow-hidden rounded-full bg-surface-2">
        <div className={cn("h-full rounded-full", TONE_BAR[tone])} style={{ width: `${value * 100}%` }} />
      </div>
      <span className={cn("font-mono text-xs tabular-nums", TONE_TEXT[tone])}>{pct(value)}</span>
    </div>
  );
}

function Evidence({ evidence, value }: { evidence: string; value: string }) {
  const parts = useMemo(() => {
    if (!value) return [evidence];
    const i = evidence.toLowerCase().indexOf(value.toLowerCase());
    if (i === -1) return [evidence];
    return [evidence.slice(0, i), evidence.slice(i, i + value.length), evidence.slice(i + value.length)];
  }, [evidence, value]);

  return (
    <p className="line-clamp-2 text-xs leading-relaxed text-muted" title={evidence}>
      {parts.length === 3 ? (
        <>
          {parts[0]}
          <mark className="rounded bg-accent/20 px-0.5 text-accent-2">{parts[1]}</mark>
          {parts[2]}
        </>
      ) : (
        evidence
      )}
    </p>
  );
}

const SELECT =
  "h-8 rounded-lg border border-border bg-surface px-2.5 text-xs text-fg outline-none transition-colors hover:border-border-strong focus:border-accent";

export default function SignalTable({ signals, onChanged, selectedId, onSelect, compact }: Props) {
  const toast = useToast();
  const [loading, setLoading] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const types = Array.from(new Set(signals.map((s) => s.signal_type))).sort();
  const filtered = signals.filter(
    (s) => (!filterType || s.signal_type === filterType) && (!filterStatus || s.review_status === filterStatus),
  );

  async function review(signal: Signal, body: ReviewBody) {
    setLoading(signal.id);
    try {
      await api.signals.review(signal.id, body);
      const verb = body.review_status === "edited" ? "updated" : body.review_status;
      toast.success(`Signal ${verb}`, signal.value);
      onChanged();
    } catch (e: unknown) {
      toast.error("Review failed", e instanceof Error ? e.message : "Please try again");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-subtle" />
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className={cn(SELECT, "pl-7")}>
            <option value="">All types</option>
            {types.map((t) => <option key={t} value={t}>{signalMeta(t).label}</option>)}
          </select>
        </div>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className={SELECT}>
          <option value="">All statuses</option>
          {["pending", "approved", "rejected", "edited"].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <span className="ml-auto font-mono text-xs text-subtle">
          {filtered.length} thing{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="card-surface overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-subtle">
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Info</th>
              {!compact && <th className="px-4 py-3 font-medium">From the document</th>}
              <th className="px-4 py-3 font-medium">How sure</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">Is it right?</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={compact ? 5 : 6} className="px-4 py-10 text-center text-sm text-subtle">Nothing matches your filters</td></tr>
            )}
            {filtered.map((sig) => {
              const meta = signalMeta(sig.signal_type);
              const Icon = meta.icon;
              const isSelected = selectedId === sig.id;
              const claim = isClaimLevel(sig.signal_type);
              return (
                <tr key={sig.id}
                  onClick={() => onSelect?.(sig)}
                  className={cn("group border-b border-border/60 align-top last:border-0 transition-colors",
                    onSelect && "cursor-pointer",
                    isSelected ? "bg-accent/10" : "hover:bg-surface-2/40",
                    loading === sig.id && "opacity-50")}>
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <span className="inline-flex items-center gap-2 text-muted">
                      <span className={cn(
                        "grid h-7 w-7 place-items-center rounded-lg border text-accent-2",
                        claim ? "border-accent/40 bg-accent/15" : "border-border bg-surface-2",
                      )}>
                        <Icon size={14} />
                      </span>
                      <span className="text-xs">{meta.label}</span>
                    </span>
                  </td>
                  <td className="max-w-[180px] px-4 py-3.5">
                    {editId === sig.id ? (
                      <input
                        autoFocus value={editValue} onChange={(e) => setEditValue(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full rounded-lg border border-accent bg-surface px-2 py-1 font-mono text-xs text-fg outline-none"
                      />
                    ) : (
                      <span className="break-words font-mono text-[13px] font-medium text-fg">{sig.value}</span>
                    )}
                  </td>
                  {!compact && <td className="max-w-[280px] px-4 py-3.5"><Evidence evidence={sig.evidence} value={sig.value} /></td>}
                  <td className="px-4 py-3.5"><ConfidenceMeter value={sig.confidence} /></td>
                  <td className="px-4 py-3.5"><Badge status={sig.review_status} /></td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                      {editId === sig.id ? (
                        <>
                          <Button size="sm" variant="success" loading={loading === sig.id}
                            onClick={() => { review(sig, { review_status: "edited", edited_value: editValue }); setEditId(null); }}>
                            Save
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditId(null)}>Cancel</Button>
                        </>
                      ) : (
                        <div className="flex items-center gap-1 opacity-60 transition-opacity group-hover:opacity-100">
                          {sig.review_status !== "approved" && (
                            <Button size="icon" variant="success" aria-label="Mark right" title="This is right" loading={loading === sig.id}
                              onClick={() => review(sig, { review_status: "approved" })}><Check size={14} /></Button>
                          )}
                          {sig.review_status !== "rejected" && (
                            <Button size="icon" variant="danger" aria-label="Mark wrong" title="This is wrong" loading={loading === sig.id}
                              onClick={() => review(sig, { review_status: "rejected" })}><X size={14} /></Button>
                          )}
                          <Button size="icon" variant="ghost" aria-label="Fix the words" title="Fix the words"
                            onClick={() => { setEditId(sig.id); setEditValue(sig.value); }}><Pencil size={13} /></Button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
