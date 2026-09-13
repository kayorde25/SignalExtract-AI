"use client";
import { useState, useEffect, useMemo, useCallback, type ReactNode } from "react";
import { Search, X, RefreshCw, Download, FileJson, FileSpreadsheet, Zap, Share2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { api, type Signal } from "@/lib/api";
import { signalMeta } from "@/lib/signal-types";
import { cn, pct, confidenceTone } from "@/lib/utils";
import SignalTable from "@/components/workspace/SignalTable";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";

const ENTITY_SIGNAL_TYPES = new Set(["person_name", "organization", "location"]);

interface Props {
  documentId: string;
  onViewInGraph?: () => void;
}

export default function SignalExplorer({ documentId, onViewInGraph }: Props) {
  const toast = useToast();
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeType, setActiveType] = useState("");
  const [search, setSearch] = useState("");
  const [selectedSignal, setSelectedSignal] = useState<Signal | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await api.documents.signals(documentId);
      setSignals(list.items);
    } catch {
      toast.error("Failed to load signals", "Please try again.");
    } finally {
      setLoading(false);
    }
  }, [documentId, toast]);

  useEffect(() => { load(); }, [load]);

  const typeCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const s of signals) map[s.signal_type] = (map[s.signal_type] ?? 0) + 1;
    return map;
  }, [signals]);

  const docStats = useMemo(() => ({
    total:    signals.length,
    approved: signals.filter(s => s.review_status === "approved").length,
    pending:  signals.filter(s => s.review_status === "pending").length,
    rejected: signals.filter(s => s.review_status === "rejected").length,
  }), [signals]);

  const visible = useMemo(() => signals.filter(s => {
    if (activeType && s.signal_type !== activeType) return false;
    if (search) {
      const q = search.toLowerCase();
      return s.value.toLowerCase().includes(q) || s.evidence.toLowerCase().includes(q);
    }
    return true;
  }), [signals, activeType, search]);

  function downloadCsv() {
    triggerDownload(api.documents.exportCsv(documentId), "signals.csv");
  }
  function downloadJson() {
    triggerDownload(api.documents.exportJson(documentId), "signals.json");
  }
  function downloadXlsx() {
    triggerDownload(api.documents.exportExcel(documentId), "signals.xlsx");
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">

      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-border bg-bg px-6 py-3">
        <div>
          <span className="text-sm font-semibold text-fg">Signal Explorer</span>
          {!loading && (
            <div className="mt-0.5 flex items-center gap-3 text-xs text-subtle">
              <span>{docStats.total} total</span>
              {docStats.approved > 0 && (
                <span className="text-success">{docStats.approved} approved</span>
              )}
              {docStats.pending > 0 && <span>{docStats.pending} pending</span>}
              {docStats.rejected > 0 && (
                <span className="text-danger">{docStats.rejected} rejected</span>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={load}
            title="Refresh"
            className="grid h-7 w-7 place-items-center rounded-lg text-subtle transition-colors hover:bg-surface-2 hover:text-fg"
          >
            <RefreshCw size={13} />
          </button>
          <button
            onClick={downloadCsv}
            disabled={signals.length === 0}
            className="flex h-7 items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 text-xs text-muted transition-colors hover:border-border-strong hover:text-fg disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Download size={11} />
            CSV
          </button>
          <button
            onClick={downloadJson}
            disabled={signals.length === 0}
            className="flex h-7 items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 text-xs text-muted transition-colors hover:border-border-strong hover:text-fg disabled:cursor-not-allowed disabled:opacity-40"
          >
            <FileJson size={11} />
            JSON
          </button>
          <button
            onClick={downloadXlsx}
            disabled={signals.length === 0}
            className="flex h-7 items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 text-xs text-muted transition-colors hover:border-border-strong hover:text-fg disabled:cursor-not-allowed disabled:opacity-40"
          >
            <FileSpreadsheet size={11} />
            Excel
          </button>
        </div>
      </div>

      {/* Type chip row */}
      <div className="flex shrink-0 items-center gap-1.5 overflow-x-auto border-b border-border px-6 py-2.5">
        <TypeChip
          label="All"
          count={signals.length}
          active={activeType === ""}
          onClick={() => setActiveType("")}
        />
        {Object.keys(typeCounts).sort().map(t => {
          const meta = signalMeta(t);
          return (
            <TypeChip
              key={t}
              icon={meta.icon as LucideIcon}
              label={meta.label}
              count={typeCounts[t]}
              active={activeType === t}
              onClick={() => setActiveType(t)}
            />
          );
        })}
      </div>

      {/* Search bar */}
      <div className="flex shrink-0 items-center gap-2.5 border-b border-border bg-surface px-6 py-2">
        <Search size={13} className="shrink-0 text-subtle" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by value or evidence…"
          className="flex-1 bg-transparent text-sm text-fg placeholder:text-subtle outline-none"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="text-subtle transition-colors hover:text-fg"
          >
            <X size={13} />
          </button>
        )}
        <span className="shrink-0 font-mono text-xs text-subtle">
          {visible.length}{signals.length !== visible.length ? ` of ${signals.length}` : ""}
        </span>
      </div>

      {/* Signal list */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-accent" />
          </div>
        ) : signals.length === 0 ? (
          <EmptyState />
        ) : visible.length === 0 ? (
          <div className="py-12 text-center text-sm text-subtle">
            No signals match your search.
          </div>
        ) : (
          <SignalTable
            signals={visible}
            onChanged={load}
            selectedId={selectedSignal?.id}
            onSelect={setSelectedSignal}
          />
        )}
      </div>

      {/* Detail drawer */}
      {selectedSignal && (
        <SignalDetailDrawer
          signal={selectedSignal}
          onClose={() => setSelectedSignal(null)}
          onChanged={() => { load(); setSelectedSignal(null); }}
          onViewInGraph={onViewInGraph}
        />
      )}
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function TypeChip({
  icon: Icon, label, count, active, onClick,
}: {
  icon?: LucideIcon;
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors",
        active
          ? "bg-accent text-accent-contrast"
          : "border border-border bg-surface-2 text-muted hover:border-border-strong hover:text-fg",
      )}
    >
      {Icon && <Icon size={11} />}
      {label}
      <span className={cn("font-mono", active ? "text-accent-contrast/70" : "text-subtle")}>
        {count}
      </span>
    </button>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-surface-2 text-subtle mb-4">
        <Zap size={22} />
      </div>
      <p className="text-sm font-medium text-fg">No signals found</p>
      <p className="mt-1 text-xs text-subtle">
        Run signal extraction on this document to get started.
      </p>
    </div>
  );
}

const TONE_BAR: Record<string, string> = {
  success: "bg-success", warning: "bg-warning", danger: "bg-danger",
};
const TONE_TEXT: Record<string, string> = {
  success: "text-success", warning: "text-warning", danger: "text-danger",
};

function ConfidenceMeter({ value }: { value: number }) {
  const tone = confidenceTone(value);
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-surface-2">
        <div className={cn("h-full rounded-full", TONE_BAR[tone])} style={{ width: `${value * 100}%` }} />
      </div>
      <span className={cn("font-mono text-xs tabular-nums", TONE_TEXT[tone])}>{pct(value)}</span>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-subtle">
        {label}
      </p>
      {children}
    </div>
  );
}

function SignalDetailDrawer({
  signal, onClose, onChanged, onViewInGraph,
}: {
  signal: Signal;
  onClose: () => void;
  onChanged: () => void;
  onViewInGraph?: () => void;
}) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const meta = signalMeta(signal.signal_type);
  const Icon = meta.icon as LucideIcon;

  async function review(status: "approved" | "rejected") {
    setLoading(true);
    try {
      await api.signals.review(signal.id, { review_status: status });
      toast.success(`Signal ${status}`);
      onChanged();
    } catch {
      toast.error("Review failed", "Please try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-bg/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      {/* Panel */}
      <div className="relative flex h-full w-full max-w-sm flex-col border-l border-border bg-surface animate-slide-right">
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-5">
          <span className="text-sm font-semibold text-fg">Signal Detail</span>
          <button
            onClick={onClose}
            className="grid h-7 w-7 place-items-center rounded-lg text-subtle transition-colors hover:bg-surface-2 hover:text-fg"
          >
            <X size={15} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <Field label="Value">
            <p className="break-words font-mono text-base font-semibold text-fg">{signal.value}</p>
          </Field>

          <Field label="Type">
            <div className="flex flex-col gap-2">
              <span className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-sm text-muted">
                <Icon size={14} className="text-accent-2" />
                {meta.label}
              </span>
              {ENTITY_SIGNAL_TYPES.has(signal.signal_type) && onViewInGraph && (
                <button
                  onClick={() => { onClose(); onViewInGraph(); }}
                  className="flex items-center gap-1.5 text-xs text-accent-2 hover:text-accent transition-colors"
                >
                  <Share2 size={12} />
                  View in Graph
                </button>
              )}
            </div>
          </Field>

          <Field label="Confidence">
            <ConfidenceMeter value={signal.confidence} />
          </Field>

          <Field label="Evidence">
            <p className="text-xs leading-relaxed text-muted">{signal.evidence}</p>
          </Field>

          <Field label="Status">
            <Badge status={signal.review_status} />
          </Field>
        </div>

        <div className="shrink-0 flex gap-2 border-t border-border p-4">
          <Button
            variant="success"
            className="flex-1"
            loading={loading}
            disabled={signal.review_status === "approved"}
            onClick={() => review("approved")}
          >
            Approve
          </Button>
          <Button
            variant="danger"
            className="flex-1"
            loading={loading}
            disabled={signal.review_status === "rejected"}
            onClick={() => review("rejected")}
          >
            Reject
          </Button>
        </div>
      </div>
    </div>
  );
}

async function triggerDownload(promise: Promise<Response>, filename: string) {
  try {
    const res = await promise;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error("[export]", err);
  }
}
