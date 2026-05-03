"use client";

import { useMemo, useState, useTransition } from "react";

import { DocumentStatusBadge } from "@/components/workspace/DocumentStatusBadge";
import { EvidencePanel } from "@/components/workspace/EvidencePanel";
import { SignalTable, WorkspaceSignal } from "@/components/workspace/SignalTable";
import type { WorkspaceRun } from "@/lib/api";

type WorkspaceDocumentDetailClientProps = {
  documentId: string;
  filename: string;
  createdAt: string;
  extractionStatus: string;
  signalCount: number;
  needsReviewCount: number;
  approvedCount: number;
  rejectedCount: number;
  signals: WorkspaceSignal[];
  runs: WorkspaceRun[];
};

const formatTimestamp = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown time";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
};

export function WorkspaceDocumentDetailClient({
  documentId,
  filename,
  createdAt,
  extractionStatus,
  signalCount,
  needsReviewCount,
  approvedCount,
  rejectedCount,
  signals,
  runs,
}: WorkspaceDocumentDetailClientProps) {
  const [selectedSignalId, setSelectedSignalId] = useState<string | null>(
    signals[0]?.signalId ?? null
  );
  const [isPending, startTransition] = useTransition();
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const selectedSignal = useMemo(
    () => signals.find((signal) => signal.signalId === selectedSignalId) ?? null,
    [signals, selectedSignalId]
  );

  const runTimeline = useMemo(
    () =>
      runs
        .filter((run) => run.documentId === documentId)
        .sort((a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
        .slice(0, 8),
    [runs, documentId]
  );

  const runAction = (path: string) => {
    setStatusMessage(null);
    startTransition(async () => {
      try {
        const response = await fetch(path, { method: "POST" });
        if (!response.ok) {
          throw new Error("Request failed");
        }
        setStatusMessage("Action submitted successfully.");
      } catch {
        setStatusMessage("Action failed. Please retry.");
      }
    });
  };

  const hasSignals = signals.length > 0;
  const disabledExportClass = hasSignals ? "" : "pointer-events-none opacity-50";

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-white/10 bg-slate-900/45 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-white">{filename}</h1>
            <p className="mt-1 text-xs text-slate-500">{documentId}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="dx-button-secondary"
              onClick={() =>
                runAction(`/api/documents/${documentId}/extract-text`)
              }
            >
              Extract Text
            </button>
            <button
              type="button"
              className="dx-button-secondary"
              onClick={() =>
                runAction(`/api/documents/${documentId}/extract-signals`)
              }
            >
              Extract Signals
            </button>
            <a
              className={`dx-button-secondary ${disabledExportClass}`}
              href={hasSignals ? `/api/documents/${documentId}/export-json` : undefined}
              aria-disabled={!hasSignals}
            >
              Export JSON
            </a>
            <a
              className={`dx-button-secondary ${disabledExportClass}`}
              href={hasSignals ? `/api/documents/${documentId}/export-csv` : undefined}
              aria-disabled={!hasSignals}
            >
              Export CSV
            </a>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs uppercase tracking-[0.14em] text-slate-500">Approved exports</span>
          <a
            className={`dx-button-secondary ${disabledExportClass}`}
            href={hasSignals ? `/api/documents/${documentId}/export-approved-json` : undefined}
            aria-disabled={!hasSignals}
          >
            Export Approved JSON
          </a>
          <a
            className={`dx-button-secondary ${disabledExportClass}`}
            href={hasSignals ? `/api/documents/${documentId}/export-approved-csv` : undefined}
            aria-disabled={!hasSignals}
          >
            Export Approved CSV
          </a>
        </div>

        <div className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-white/10 bg-white/3 px-3 py-2 text-sm">
            <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Uploaded</p>
            <p className="mt-1 text-slate-200">{formatTimestamp(createdAt)}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/3 px-3 py-2 text-sm">
            <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Extraction status</p>
            <div className="mt-1">
              <DocumentStatusBadge status={extractionStatus} />
            </div>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/3 px-3 py-2 text-sm text-slate-200">
            <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Signal summary</p>
            <p className="mt-1">{signalCount} total · {approvedCount} approved · {rejectedCount} rejected</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/3 px-3 py-2 text-sm text-slate-200">
            <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Review workload</p>
            <p className="mt-1">{needsReviewCount} needs review</p>
          </div>
        </div>

        {!hasSignals ? (
          <div className="mt-4 rounded-xl border border-amber-400/25 bg-amber-500/10 px-4 py-2 text-sm text-amber-100">
            Exports are disabled until at least one signal is available.
          </div>
        ) : null}

        {statusMessage ? (
          <div className="mt-4 rounded-xl border border-blue-400/25 bg-blue-500/10 px-4 py-2 text-sm text-blue-200">
            {statusMessage}
          </div>
        ) : null}

        {isPending ? (
          <p className="mt-3 text-sm text-slate-400">Submitting action...</p>
        ) : null}

        <div className="mt-5 grid gap-2">
          <p className="text-xs uppercase tracking-[0.14em] text-slate-500">
            Extraction Timeline
          </p>
          {runTimeline.length === 0 ? (
            <p className="text-sm text-slate-400">No extraction runs recorded yet.</p>
          ) : (
            <div className="grid gap-2">
              {runTimeline.map((run) => (
                <div
                  key={run.extractionRunId}
                  className="rounded-xl border border-white/10 bg-white/2 px-3 py-2 text-sm text-slate-300"
                >
                  <span className="font-medium text-white">{run.status}</span>
                  <span className="mx-2 text-slate-600">•</span>
                  <span>{formatTimestamp(run.createdAt)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[2fr_1fr]">
        <SignalTable
          signals={signals}
          selectedSignalId={selectedSignalId}
          onSelectSignal={setSelectedSignalId}
        />
        <EvidencePanel signal={selectedSignal} />
      </div>
    </div>
  );
}
