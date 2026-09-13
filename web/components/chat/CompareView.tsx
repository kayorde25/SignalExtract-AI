"use client";
import { useState, useMemo, type ReactNode } from "react";
import {
  GitMerge, ArrowRight, Download, FileJson, FileSpreadsheet,
  ChevronDown, Plus, Minus, RefreshCw,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { api } from "@/lib/api";
import type { Doc } from "@/lib/api";
import type { CompareResponse, ChunkChange, SignalChange, DiffToken } from "@/lib/types";
import { signalMeta } from "@/lib/signal-types";
import { cn } from "@/lib/utils";

interface Props {
  docs: Doc[];
}

type Phase = "select" | "loading" | "result";
type Filter = "all" | "added" | "removed" | "modified";

export default function CompareView({ docs }: Props) {
  const [phase, setPhase] = useState<Phase>("select");
  const [docAId, setDocAId] = useState("");
  const [docBId, setDocBId] = useState("");
  const [result, setResult] = useState<CompareResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<Filter>("all");

  async function handleCompare() {
    if (!docAId || !docBId || docAId === docBId) return;
    setPhase("loading");
    setError(null);
    try {
      const r = await api.documents.compare(docAId, docBId);
      setResult(r);
      setActiveFilter("all");
      setPhase("result");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Comparison failed");
      setPhase("select");
    }
  }

  if (phase === "select" || phase === "loading") {
    return (
      <SelectionView
        docs={docs}
        docAId={docAId}
        docBId={docBId}
        setDocAId={setDocAId}
        setDocBId={setDocBId}
        onCompare={handleCompare}
        loading={phase === "loading"}
        error={error}
      />
    );
  }

  return (
    <ResultsView
      result={result!}
      docAId={docAId}
      docBId={docBId}
      activeFilter={activeFilter}
      setActiveFilter={setActiveFilter}
      onReset={() => { setResult(null); setPhase("select"); }}
    />
  );
}

// ── Selection phase ─────────────────────────────────────────────────────────

function SelectionView({
  docs, docAId, docBId, setDocAId, setDocBId, onCompare, loading, error,
}: {
  docs: Doc[];
  docAId: string;
  docBId: string;
  setDocAId: (v: string) => void;
  setDocBId: (v: string) => void;
  onCompare: () => void;
  loading: boolean;
  error: string | null;
}) {
  const sameDoc = docAId && docBId && docAId === docBId;
  const canCompare = docAId && docBId && !sameDoc && !loading;

  return (
    <div className="flex h-full items-center justify-center">
      <div className="w-full max-w-sm space-y-6 p-6">
        <div className="text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-surface-2 text-accent-2">
            <GitMerge size={22} />
          </div>
          <h2 className="mt-3 text-base font-semibold text-fg">Compare Documents</h2>
          <p className="mt-1 text-sm text-subtle">
            Select two documents to compare content, signals, and entities.
          </p>
        </div>

        {docs.length < 2 ? (
          <p className="text-center text-sm text-subtle">
            Upload at least two documents to compare.
          </p>
        ) : (
          <>
            <div className="space-y-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted">Document A</label>
                <DocSelect
                  docs={docs}
                  value={docAId}
                  onChange={setDocAId}
                  placeholder="Select document A…"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted">Document B</label>
                <DocSelect
                  docs={docs}
                  value={docBId}
                  onChange={setDocBId}
                  placeholder="Select document B…"
                />
              </div>
            </div>

            {sameDoc && (
              <p className="text-center text-xs text-warning">
                Select two different documents.
              </p>
            )}
            {error && (
              <p className="rounded-lg border border-danger/25 bg-danger/10 px-3 py-2 text-xs text-danger">
                {error}
              </p>
            )}

            <button
              onClick={onCompare}
              disabled={!canCompare}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-2.5 text-sm font-medium text-accent-contrast transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-accent-contrast/30 border-t-accent-contrast" />
              ) : (
                <>
                  <GitMerge size={14} />
                  Compare Documents
                </>
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function DocSelect({
  docs, value, onChange, placeholder,
}: {
  docs: Doc[];
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full appearance-none rounded-lg border border-border bg-surface px-3 py-2 pr-8 text-sm text-fg outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
      >
        <option value="" disabled>{placeholder}</option>
        {docs.map(d => (
          <option key={d.id} value={d.id}>{d.original_filename}</option>
        ))}
      </select>
      <ChevronDown size={13} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-subtle" />
    </div>
  );
}

// ── Results phase ────────────────────────────────────────────────────────────

function ResultsView({
  result, docAId, docBId, activeFilter, setActiveFilter, onReset,
}: {
  result: CompareResponse;
  docAId: string;
  docBId: string;
  activeFilter: Filter;
  setActiveFilter: (f: Filter) => void;
  onReset: () => void;
}) {
  const { summary } = result;

  const visibleChunks = useMemo(() => {
    if (activeFilter === "all") return result.chunk_changes;
    return result.chunk_changes.filter(c => c.type === activeFilter);
  }, [result.chunk_changes, activeFilter]);

  const signalGroups = useMemo(() => groupByType(result.signal_changes), [result.signal_changes]);
  const entityGroups = useMemo(() => groupByType(result.entity_changes), [result.entity_changes]);

  function downloadJson() {
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" });
    triggerBlobDownload(blob, "comparison.json");
  }

  function downloadCsv() {
    const rows: string[][] = [
      ["Section", "Change Type", "Signal/Chunk Type", "Doc A Value", "Doc B Value", "Evidence"],
    ];
    for (const c of result.chunk_changes) {
      rows.push(["Chunk Changes", c.type, "", c.text_a ?? "", c.text_b ?? "", ""]);
    }
    for (const s of result.signal_changes) {
      rows.push([
        "Signal Changes", s.change_type, s.signal_type,
        s.value_a ?? s.value ?? "", s.value_b ?? "", s.evidence,
      ]);
    }
    for (const e of result.entity_changes) {
      rows.push([
        "Entity Changes", e.change_type, e.signal_type,
        e.value_a ?? e.value ?? "", e.value_b ?? "", e.evidence,
      ]);
    }
    const csv = rows.map(r => r.map(cell => `"${cell.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    triggerBlobDownload(blob, "comparison.csv");
  }

  function downloadXlsx() {
    triggerDownload(api.documents.compareExportXlsx(docAId, docBId), "comparison.xlsx");
  }

  const filterCounts: Record<Filter, number> = {
    all: result.chunk_changes.length,
    added: result.chunk_changes.filter(c => c.type === "added").length,
    removed: result.chunk_changes.filter(c => c.type === "removed").length,
    modified: result.chunk_changes.filter(c => c.type === "modified").length,
  };

  const totalSignalChanges =
    summary.added_signals + summary.removed_signals + summary.changed_signals;
  const totalEntityChanges =
    summary.added_entities + summary.removed_entities + summary.changed_entities;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-border bg-bg px-6 py-3">
        <div className="flex min-w-0 items-center gap-2 text-sm font-medium text-fg">
          <span className="max-w-[180px] truncate">{result.document_a.filename}</span>
          <ArrowRight size={13} className="shrink-0 text-subtle" />
          <span className="max-w-[180px] truncate">{result.document_b.filename}</span>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            onClick={onReset}
            className="flex h-7 items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 text-xs text-muted transition-colors hover:border-border-strong hover:text-fg"
          >
            <RefreshCw size={11} />
            New
          </button>
          <button
            onClick={downloadJson}
            className="flex h-7 items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 text-xs text-muted transition-colors hover:border-border-strong hover:text-fg"
          >
            <FileJson size={11} />
            JSON
          </button>
          <button
            onClick={downloadCsv}
            className="flex h-7 items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 text-xs text-muted transition-colors hover:border-border-strong hover:text-fg"
          >
            <Download size={11} />
            CSV
          </button>
          <button
            onClick={downloadXlsx}
            className="flex h-7 items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 text-xs text-muted transition-colors hover:border-border-strong hover:text-fg"
          >
            <FileSpreadsheet size={11} />
            Excel
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="flex shrink-0 items-center gap-3 overflow-x-auto border-b border-border px-6 py-3">
        <StatCard label="Added" value={summary.added_chunks} tone="success" />
        <StatCard label="Removed" value={summary.removed_chunks} tone="danger" />
        <StatCard label="Modified" value={summary.modified_chunks} tone="warning" />
        <StatCard label="Signal Changes" value={totalSignalChanges} tone="accent" />
        <StatCard label="Entity Changes" value={totalEntityChanges} tone="muted" />
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-8">

        {/* Chunk changes */}
        <section>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-subtle">
            Content Changes
            <span className="ml-2 font-mono normal-case tracking-normal text-muted">
              {summary.unchanged_chunks} unchanged
            </span>
          </h3>

          {/* Filter chips */}
          <div className="mb-3 flex items-center gap-1.5 overflow-x-auto">
            {(["all", "added", "removed", "modified"] as Filter[]).map(f => (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors",
                  activeFilter === f
                    ? "bg-accent text-accent-contrast"
                    : "border border-border bg-surface-2 text-muted hover:border-border-strong hover:text-fg",
                )}
              >
                {f}
                <span className={cn(
                  "font-mono",
                  activeFilter === f ? "text-accent-contrast/70" : "text-subtle",
                )}>
                  {filterCounts[f]}
                </span>
              </button>
            ))}
          </div>

          {/* Chunk list */}
          {result.chunk_changes.length === 0 ? (
            <p className="text-center py-8 text-sm text-subtle">
              Documents are identical — no differences found.
            </p>
          ) : visibleChunks.length === 0 ? (
            <p className="text-center py-6 text-sm text-subtle">
              No {activeFilter} sections.
            </p>
          ) : (
            <div className="space-y-2">
              {visibleChunks.map((c, i) => (
                <ChunkChangeRow key={i} change={c} />
              ))}
            </div>
          )}
        </section>

        {/* Signal changes */}
        {result.signal_changes.length > 0 && (
          <section>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-subtle">
              Signal Changes
            </h3>
            <ChangeGroupList groups={signalGroups} />
          </section>
        )}

        {/* Entity changes */}
        {result.entity_changes.length > 0 && (
          <section>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-subtle">
              Entity Changes
            </h3>
            <ChangeGroupList groups={entityGroups} />
          </section>
        )}

        {result.signal_changes.length === 0 && result.entity_changes.length === 0 && (
          <p className="text-center text-sm text-subtle">No signal or entity differences found.</p>
        )}
      </div>
    </div>
  );
}

// ── Chunk change rendering ───────────────────────────────────────────────────

function ChunkChangeRow({ change }: { change: ChunkChange }) {
  const BADGE: Record<string, string> = {
    added: "bg-success/15 text-success",
    removed: "bg-danger/15 text-danger",
    modified: "bg-warning/15 text-warning",
  };

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface p-4">
      <div className="mb-2 flex items-center gap-2">
        <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize", BADGE[change.type])}>
          {change.type}
        </span>
        {change.chunk_index_a != null && (
          <span className="font-mono text-[10px] text-subtle">§{change.chunk_index_a + 1}</span>
        )}
        {change.chunk_index_a == null && change.chunk_index_b != null && (
          <span className="font-mono text-[10px] text-subtle">§{change.chunk_index_b + 1}</span>
        )}
      </div>

      {change.type === "modified" && change.diff_tokens ? (
        <DiffRenderer tokens={change.diff_tokens} />
      ) : change.type === "added" ? (
        <p className="rounded-lg bg-success/8 px-3 py-2 text-xs leading-relaxed text-muted">
          {change.text_b}
        </p>
      ) : (
        <p className="rounded-lg bg-danger/8 px-3 py-2 text-xs leading-relaxed text-muted line-through decoration-danger/50">
          {change.text_a}
        </p>
      )}
    </div>
  );
}

function DiffRenderer({ tokens }: { tokens: DiffToken[] }) {
  return (
    <p className="break-words font-mono text-xs leading-relaxed">
      {tokens.map((t, i) => (
        <span
          key={i}
          className={cn(
            t.type === "removed" && "bg-danger/15 text-danger line-through",
            t.type === "added" && "bg-success/15 text-success",
            t.type === "equal" && "text-muted",
          )}
        >
          {t.text}
        </span>
      ))}
    </p>
  );
}

// ── Signal / entity change groups ────────────────────────────────────────────

function groupByType(changes: SignalChange[]): Map<string, SignalChange[]> {
  const map = new Map<string, SignalChange[]>();
  for (const c of changes) {
    const arr = map.get(c.signal_type) ?? [];
    arr.push(c);
    map.set(c.signal_type, arr);
  }
  return map;
}

function ChangeGroupList({ groups }: { groups: Map<string, SignalChange[]> }) {
  return (
    <div className="space-y-3">
      {Array.from(groups.entries()).map(([type, changes]) => {
        const meta = signalMeta(type);
        const Icon = meta.icon as LucideIcon;
        return (
          <div key={type} className="overflow-hidden rounded-xl border border-border bg-surface p-4">
            <div className="mb-3 flex items-center gap-2">
              <Icon size={13} className="text-accent-2 shrink-0" />
              <span className="text-xs font-semibold text-fg">{meta.label}</span>
              <span className="ml-auto font-mono text-[10px] text-subtle">
                {changes.length} change{changes.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="space-y-1.5">
              {changes.map((c, i) => (
                <ChangeRow key={i} change={c} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ChangeRow({ change }: { change: SignalChange }) {
  if (change.change_type === "changed") {
    return (
      <div className="flex flex-wrap items-center gap-1.5 rounded-lg bg-warning/8 px-3 py-1.5">
        <span className="text-[10px] font-semibold text-warning">~</span>
        <span className="font-mono text-xs text-muted line-through decoration-muted/50">
          {change.value_a}
        </span>
        <ArrowRight size={11} className="shrink-0 text-subtle" />
        <span className="font-mono text-xs text-fg">{change.value_b}</span>
      </div>
    );
  }

  const isAdded = change.change_type === "added";
  return (
    <div className={cn(
      "flex items-start gap-2 rounded-lg px-3 py-1.5",
      isAdded ? "bg-success/8" : "bg-danger/8",
    )}>
      <span className={cn(
        "mt-px text-[10px] font-bold shrink-0",
        isAdded ? "text-success" : "text-danger",
      )}>
        {isAdded ? "+" : "−"}
      </span>
      <div className="min-w-0 flex-1">
        <p className={cn("font-mono text-xs", isAdded ? "text-fg" : "text-muted")}>
          {change.value}
        </p>
        {change.evidence && (
          <p className="mt-0.5 truncate text-[10px] text-subtle" title={change.evidence}>
            {change.evidence}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Summary stat card ────────────────────────────────────────────────────────

const TONE_STYLES: Record<string, string> = {
  success: "text-success border-success/25 bg-success/8",
  danger:  "text-danger  border-danger/25  bg-danger/8",
  warning: "text-warning border-warning/25 bg-warning/8",
  accent:  "text-accent-2 border-accent/25 bg-accent/8",
  muted:   "text-muted   border-border    bg-surface-2",
};

function StatCard({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className={cn(
      "flex shrink-0 flex-col rounded-xl border px-4 py-2.5 min-w-[110px]",
      TONE_STYLES[tone],
    )}>
      <span className="font-mono text-2xl font-semibold tabular-nums">{value}</span>
      <span className="mt-0.5 text-[10px] font-medium opacity-80">{label}</span>
    </div>
  );
}

// ── Download helpers ─────────────────────────────────────────────────────────

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

async function triggerDownload(promise: Promise<Response>, filename: string) {
  try {
    const res = await promise;
    const blob = await res.blob();
    triggerBlobDownload(blob, filename);
  } catch (err) {
    console.error("[compare export]", err);
  }
}
