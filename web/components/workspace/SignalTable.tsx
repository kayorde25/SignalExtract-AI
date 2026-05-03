"use client";

import { DocumentStatusBadge } from "@/components/workspace/DocumentStatusBadge";

export type WorkspaceSignal = {
  signalId: string;
  signalType: string;
  signalText: string;
  evidenceText: string;
  confidence: number;
  paragraphId: string | null;
  sourcePage: number | null;
  sourceSection: string | null;
  explicitness: string;
  validationStatus: string;
  reviewStatus: string;
  needsReview: boolean;
};

const confidenceWidthClass = (confidence: number) => {
  if (confidence >= 0.9) return "w-full";
  if (confidence >= 0.8) return "w-10/12";
  if (confidence >= 0.7) return "w-9/12";
  if (confidence >= 0.6) return "w-8/12";
  if (confidence >= 0.5) return "w-7/12";
  if (confidence >= 0.4) return "w-6/12";
  if (confidence >= 0.3) return "w-5/12";
  if (confidence >= 0.2) return "w-4/12";
  if (confidence >= 0.1) return "w-3/12";
  return "w-2/12";
};

type SignalTableProps = {
  signals: WorkspaceSignal[];
  selectedSignalId: string | null;
  onSelectSignal: (signalId: string) => void;
};

export function SignalTable({
  signals,
  selectedSignalId,
  onSelectSignal,
}: SignalTableProps) {
  if (signals.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-slate-900/45 px-5 py-8 text-sm text-slate-300">
        No extracted signals yet. Run extraction to populate this table.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-white/10 bg-slate-900/45">
      <table className="min-w-full divide-y divide-white/10 text-sm">
        <thead className="bg-white/3 text-left text-slate-300">
          <tr>
            <th className="px-4 py-3 font-medium uppercase tracking-[0.14em] text-slate-400">Type</th>
            <th className="px-4 py-3 font-medium uppercase tracking-[0.14em] text-slate-400">Signal</th>
            <th className="px-4 py-3 font-medium uppercase tracking-[0.14em] text-slate-400">Confidence</th>
            <th className="px-4 py-3 font-medium uppercase tracking-[0.14em] text-slate-400">Validation</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/10 text-slate-200">
          {signals.map((signal) => {
            return (
              <tr
                key={signal.signalId}
                className={`cursor-pointer transition hover:bg-white/3 ${
                  selectedSignalId === signal.signalId ? "bg-white/6" : ""
                }`}
                onClick={() => onSelectSignal(signal.signalId)}
              >
                <td className="px-4 py-3"><span className="dx-chip">{signal.signalType}</span></td>
                <td className="px-4 py-3">
                  <p className="max-w-xl truncate text-slate-100">{signal.signalText}</p>
                  <p className="mt-1 text-xs text-slate-500">{signal.signalId}</p>
                </td>
                <td className="px-4 py-3">
                  <div className="w-40 space-y-1">
                    <div className="h-1.5 rounded-full bg-slate-800">
                      <div className={`h-full rounded-full bg-linear-to-r from-blue-500 to-cyan-300 ${confidenceWidthClass(signal.confidence)}`} />
                    </div>
                    <p className="text-xs text-slate-400">{signal.confidence.toFixed(2)}</p>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    <DocumentStatusBadge status={signal.validationStatus} />
                    <DocumentStatusBadge status={signal.reviewStatus} kind="review" />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
