import { getLatestDocuments, getSignalsByDocument } from "@/lib/api";

type ReviewRow = {
  signalId: string;
  type: string;
  text: string;
  confidence: number;
};

export default async function ReviewPage() {
  const historyResult = await getLatestDocuments().catch(() => ({
    documents: [],
    extractionRuns: [],
  }));

  const recentDocuments = historyResult.documents.slice(0, 5);

  const responses = await Promise.all(
    recentDocuments.map((doc) =>
      getSignalsByDocument(doc.document_id).then((signals) => ({
        documentId: doc.document_id,
        signals,
      })).catch(() => ({
        documentId: doc.document_id,
        signals: [],
      }))
    )
  );

  const rows: ReviewRow[] = responses
    .flatMap((response) =>
      response.signals.map((signal, index) => ({
        signalId: `${response.documentId}-${index + 1}`,
        type: signal.signalType,
        text: signal.signalText,
        confidence: signal.confidence,
      }))
    );

  return (
    <section className="dx-page">
      <header className="dx-page-header">
        <p className="dx-eyebrow">Review</p>
        <h2 className="dx-title">Signal queue</h2>
        <p className="dx-subtitle">Prioritize extracted signals in a table layout that matches the rest of the dashboard system.</p>
      </header>

      <div className="dx-card overflow-hidden p-0">
        <div className="flex items-center justify-between border-b border-white/5 px-6 py-4">
          <div>
            <p className="text-lg font-semibold text-white">Signals</p>
            <p className="mt-1 text-sm text-slate-400">Latest extracted items across the most recent documents.</p>
          </div>
          <span className="dx-chip dx-chip-primary">{rows.length} items</span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-white/5 text-sm">
            <thead className="bg-white/[0.04] text-left text-slate-300">
              <tr>
                <th className="px-6 py-4 font-medium uppercase tracking-[0.14em] text-slate-400">Type</th>
                <th className="px-6 py-4 font-medium uppercase tracking-[0.14em] text-slate-400">Text</th>
                <th className="px-6 py-4 font-medium uppercase tracking-[0.14em] text-slate-400">Confidence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-slate-200">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-10 text-center text-slate-400">
                    No signals available yet.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.signalId} className="transition hover:bg-white/[0.03]">
                    <td className="px-6 py-4"><span className="dx-chip">{row.type}</span></td>
                    <td className="max-w-xl px-6 py-4 text-slate-300">{row.text}</td>
                    <td className="px-6 py-4 text-white">{row.confidence.toFixed(2)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
