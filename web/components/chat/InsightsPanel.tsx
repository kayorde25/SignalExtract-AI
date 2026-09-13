"use client";
import { useState, useEffect } from "react";
import type { ElementType } from "react";
import {
  X, FileText, Calendar, DollarSign, Mail, Download,
  FileJson, FolderOpen, Share2, Phone, User, LayoutGrid,
} from "lucide-react";
import type { Doc, Stats } from "@/lib/api";
import { api } from "@/lib/api";
import type { SignalSummary } from "@/lib/types";
import { getStatusMeta } from "@/lib/status";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onClose: () => void;
  selectedDoc: Doc | null;
  stats: Stats | null;
  onOpenSignals?: () => void;
}

export default function InsightsPanel({ open, onClose, selectedDoc, stats, onOpenSignals }: Props) {
  const [summary, setSummary] = useState<SignalSummary | null>(null);

  useEffect(() => {
    if (!selectedDoc) { setSummary(null); return; }
    api.documents.signalsSummary(selectedDoc.id)
      .then(setSummary)
      .catch(() => setSummary(null));
  }, [selectedDoc?.id]);

  return (
    <aside
      className={cn(
        "flex h-full flex-col border-l border-border bg-surface transition-all duration-200 overflow-hidden",
        open ? "w-72 shrink-0" : "w-0 border-l-0",
      )}
    >
      {open && (
        <>
          <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
            <span className="text-sm font-semibold text-fg">Insights</span>
            <button
              onClick={onClose}
              className="grid h-7 w-7 place-items-center rounded-lg text-subtle transition-colors hover:bg-surface-2 hover:text-fg"
            >
              <X size={15} />
            </button>
          </div>

          <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">

            {/* ── Documents ── */}
            <div className="card-surface p-4">
              <SectionLabel icon={FileText} label="Documents" />
              <p className="mt-3 font-mono text-3xl font-semibold text-fg">
                {stats?.total_documents ?? 0}
              </p>
              <p className="mt-0.5 text-xs text-muted">
                {stats == null
                  ? "Loading…"
                  : stats.total_documents === 0
                  ? "No documents uploaded yet"
                  : `${stats.documents_done} ready · ${stats.total_documents - stats.documents_done} pending`}
              </p>
            </div>

            {/* ── Signals ── */}
            <div className="card-surface p-4">
              <SectionLabel label="Signals" />
              <div className="mt-3 space-y-2.5">
                <SignalRow icon={Calendar}   label="Dates"    count={summary?.dates ?? 0}    tone="text-accent-2" />
                <SignalRow icon={DollarSign} label="Money"    count={summary?.money ?? 0}    tone="text-success"  />
                <SignalRow icon={Mail}       label="Emails"   count={summary?.emails ?? 0}   tone="text-warning"  />
                <SignalRow icon={Phone}      label="Phones"   count={summary?.phones ?? 0}   tone="text-muted"    />
                <SignalRow icon={User}       label="Entities" count={summary?.entities ?? 0} tone="text-accent-2" />
              </div>
              <div className="mt-3 flex items-center gap-2">
                <div className="h-1 flex-1 overflow-hidden rounded-full bg-surface-2">
                  {selectedDoc && selectedDoc.signal_count > 0 && selectedDoc.approved_count > 0 && (
                    <div
                      className="h-full rounded-full bg-success transition-all"
                      style={{ width: `${(selectedDoc.approved_count / selectedDoc.signal_count) * 100}%` }}
                    />
                  )}
                </div>
                <span className="text-[10px] text-subtle">
                  {summary?.total ?? selectedDoc?.signal_count ?? 0} total
                </span>
              </div>
              {(summary?.total ?? 0) > 0 && (
                <button
                  onClick={onOpenSignals}
                  className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-border bg-surface-2 py-2 text-xs text-muted transition-colors hover:border-border-strong hover:text-fg"
                >
                  <LayoutGrid size={12} />
                  Open Signal Explorer
                </button>
              )}
            </div>

            {/* ── Export ── */}
            <div className="card-surface p-4">
              <SectionLabel icon={Download} label="Export" />
              <div className="mt-3 space-y-2">
                <ExportBtn
                  label="CSV"
                  enabled={selectedDoc?.status === "done"}
                  onClick={() => selectedDoc && triggerDownload(
                    api.documents.exportCsv(selectedDoc.id),
                    `${selectedDoc.original_filename}.signals.csv`,
                  )}
                />
                <ExportBtn
                  label="JSON"
                  icon={FileJson}
                  enabled={selectedDoc?.status === "done"}
                  onClick={() => selectedDoc && triggerDownload(
                    api.documents.exportJson(selectedDoc.id),
                    `${selectedDoc.original_filename}.signals.json`,
                  )}
                />
              </div>
              {selectedDoc?.status !== "done" && (
                <p className="mt-3 text-[10px] leading-relaxed text-subtle">
                  {selectedDoc
                    ? `Document is ${getStatusMeta(selectedDoc.status).label.toLowerCase()} — exports unlock when ready.`
                    : "Select a document to enable exports."}
                </p>
              )}
            </div>

            {/* ── Collections placeholder ── */}
            <div className="card-surface p-4 opacity-50">
              <SectionLabel icon={FolderOpen} label="Collections" />
              <p className="mt-2 text-xs text-subtle">Coming soon</p>
            </div>

            {/* ── Knowledge Graph placeholder ── */}
            <div className="card-surface p-4 opacity-50">
              <SectionLabel icon={Share2} label="Knowledge Graph" />
              <p className="mt-2 text-xs text-subtle">Coming soon</p>
            </div>

          </div>
        </>
      )}
    </aside>
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

function SectionLabel({ icon: Icon, label }: { icon?: ElementType; label: string }) {
  return (
    <div className="flex items-center gap-2">
      {Icon && <Icon size={13} className="text-accent-2" />}
      <span className="text-[10px] font-semibold uppercase tracking-widest text-subtle">{label}</span>
    </div>
  );
}

function SignalRow({
  icon: Icon, label, count, tone,
}: { icon: ElementType; label: string; count: number; tone: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <Icon size={14} className={cn("shrink-0", tone)} />
      <span className="flex-1 text-muted">{label}</span>
      <span className="font-mono text-xs text-subtle">{count}</span>
    </div>
  );
}

function ExportBtn({
  label, icon: Icon, enabled, onClick,
}: { label: string; icon?: ElementType; enabled: boolean; onClick: () => void }) {
  return (
    <button
      disabled={!enabled}
      onClick={onClick}
      className="flex w-full items-center gap-2.5 rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-muted transition-colors hover:border-border-strong hover:text-fg disabled:cursor-not-allowed disabled:opacity-50"
    >
      {Icon ? <Icon size={14} className="shrink-0" /> : <Download size={14} className="shrink-0" />}
      {label}
    </button>
  );
}
