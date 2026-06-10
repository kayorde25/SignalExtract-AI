"use client";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api, type Doc, type Signal } from "@/lib/api";
import SignalTable from "@/components/workspace/SignalTable";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Spinner from "@/components/ui/Spinner";
import { fmtBytes, fmtDate, pct } from "@/lib/utils";

export default function WorkspacePage() {
  const { documentId } = useParams<{ documentId: string }>();
  const [doc, setDoc] = useState<Doc | null>(null);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [docData, sigData] = await Promise.all([
        api.documents.get(documentId),
        api.documents.signals(documentId),
      ]);
      setDoc(docData);
      setSignals(sigData.items);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  useEffect(() => { refresh(); }, [refresh]);

  async function downloadExport(type: "json" | "csv", approvedOnly: boolean) {
    setExporting(true);
    try {
      const res = type === "json"
        ? await api.documents.exportJson(documentId, approvedOnly)
        : await api.documents.exportCsv(documentId, approvedOnly);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${doc?.original_filename}.signals.${type}`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  if (loading) return (
    <div className="flex items-center gap-2 text-slate-500 py-12">
      <Spinner /> <span>Loading workspace…</span>
    </div>
  );

  if (error || !doc) return (
    <div className="text-red-600 bg-red-50 border border-red-200 rounded-xl p-4">{error ?? "Document not found"}</div>
  );

  const approvedPct = doc.signal_count > 0 ? doc.approved_count / doc.signal_count : 0;

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <Link href="/dashboard/documents" className="text-xs text-blue-600 hover:underline mb-1 inline-block">← Documents</Link>
          <h1 className="text-2xl font-bold text-slate-900 truncate max-w-xl">{doc.original_filename}</h1>
          <div className="flex items-center gap-3 mt-1">
            <Badge status={doc.status} />
            <span className="text-xs text-slate-400">{fmtBytes(doc.file_size)}</span>
            {doc.page_count && <span className="text-xs text-slate-400">{doc.page_count} pages</span>}
            {doc.char_count && <span className="text-xs text-slate-400">{doc.char_count.toLocaleString()} chars</span>}
            <span className="text-xs text-slate-400">Uploaded {fmtDate(doc.uploaded_at)}</span>
          </div>
        </div>

        {/* Export */}
        <div className="flex gap-2 flex-shrink-0">
          <Button size="sm" variant="secondary" loading={exporting} onClick={() => downloadExport("json", false)}>
            ↓ JSON
          </Button>
          <Button size="sm" variant="secondary" loading={exporting} onClick={() => downloadExport("csv", false)}>
            ↓ CSV
          </Button>
          <Button size="sm" variant="success" loading={exporting} onClick={() => downloadExport("json", true)}>
            ↓ Approved JSON
          </Button>
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: "Total Signals", value: doc.signal_count },
          { label: "Approved", value: doc.approved_count, color: "text-green-600" },
          { label: "Pending", value: signals.filter(s => s.review_status === "pending").length, color: "text-amber-600" },
          { label: "Approval Rate", value: pct(approvedPct), color: "text-blue-600" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <p className="text-xs text-slate-500 font-medium">{s.label}</p>
            <p className={`text-2xl font-bold mt-0.5 ${s.color ?? "text-slate-800"}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Extraction mode badge */}
      {doc.extraction_mode && (
        <div className="mb-4 flex items-center gap-2 text-xs text-slate-500">
          <span className="font-medium">Extraction mode:</span>
          <Badge status={doc.extraction_mode} />
        </div>
      )}

      {/* Signal table */}
      {signals.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <p className="text-4xl mb-2">🔍</p>
          <p>No signals extracted yet</p>
        </div>
      ) : (
        <SignalTable signals={signals} onChanged={refresh} />
      )}
    </div>
  );
}
