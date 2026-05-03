import { WorkspaceSignal } from "@/components/workspace/SignalTable";

type EvidencePanelProps = {
  signal: WorkspaceSignal | null;
};

export function EvidencePanel({ signal }: EvidencePanelProps) {
  if (!signal) {
    return (
      <section className="rounded-2xl border border-white/10 bg-slate-900/45 p-5">
        <h3 className="text-lg font-semibold text-white">Evidence preview</h3>
        <p className="mt-3 text-sm text-slate-400">
          Select a signal from the table to inspect evidence and source metadata.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-slate-900/45 p-5">
      <h3 className="text-lg font-semibold text-white">Evidence preview</h3>
      <p className="mt-1 text-xs text-slate-500">{signal.signalId}</p>

      <div className="mt-4 rounded-xl border border-white/10 bg-white/3 p-4">
        <p className="text-sm font-medium text-white">Evidence text</p>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-300">
          {signal.evidenceText || "No evidence text available."}
        </p>
      </div>

      <div className="mt-4 grid gap-2 text-sm text-slate-300">
        <p><span className="text-slate-500">Paragraph ID:</span> {signal.paragraphId || "N/A"}</p>
        <p><span className="text-slate-500">Source page:</span> {signal.sourcePage ?? "N/A"}</p>
        <p><span className="text-slate-500">Source section:</span> {signal.sourceSection || "N/A"}</p>
        <p><span className="text-slate-500">Confidence:</span> {signal.confidence.toFixed(2)}</p>
        <p><span className="text-slate-500">Explicitness:</span> {signal.explicitness || "N/A"}</p>
        <p><span className="text-slate-500">Validation status:</span> {signal.validationStatus || "N/A"}</p>
        <p><span className="text-slate-500">Review status:</span> {signal.reviewStatus || "N/A"}</p>
      </div>
    </section>
  );
}
