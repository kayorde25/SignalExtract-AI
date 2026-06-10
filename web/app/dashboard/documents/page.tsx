"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api, type Doc } from "@/lib/api";
import UploadZone from "@/components/workspace/UploadZone";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Spinner from "@/components/ui/Spinner";
import { fmtBytes, fmtDate } from "@/lib/utils";

const DONE_STATUSES = new Set(["done", "text_ready"]);
const TEXT_READY = new Set(["text_ready", "done"]);

export default function DocumentsPage() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const { items } = await api.documents.list();
      setDocs(items);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load documents");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  async function runExtractText(doc: Doc) {
    setActionId(doc.id);
    try {
      await api.documents.extractText(doc.id);
      await refresh();
    } catch (e: unknown) {
      alert(`Extract text failed: ${e instanceof Error ? e.message : e}`);
    } finally {
      setActionId(null);
    }
  }

  async function runExtractSignals(doc: Doc) {
    setActionId(doc.id);
    try {
      await api.documents.extractSignals(doc.id);
      await refresh();
    } catch (e: unknown) {
      alert(`Extract signals failed: ${e instanceof Error ? e.message : e}`);
    } finally {
      setActionId(null);
    }
  }

  async function deleteDoc(doc: Doc) {
    if (!confirm(`Delete "${doc.original_filename}"?`)) return;
    setActionId(doc.id);
    try {
      await api.documents.delete(doc.id);
      await refresh();
    } finally {
      setActionId(null);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Documents</h1>
        <p className="text-slate-500 mt-1">Upload documents, run extraction, then review signals</p>
      </div>

      <div className="mb-6">
        <UploadZone onUploaded={refresh} />
      </div>

      {error && (
        <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{error}</div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-slate-500 py-8">
          <Spinner /> <span>Loading…</span>
        </div>
      ) : docs.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <p className="text-4xl mb-2">📂</p>
          <p>No documents yet. Upload one above.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 text-left">File</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-center">Signals</th>
                <th className="px-4 py-3 text-center">Approved</th>
                <th className="px-4 py-3 text-left">Uploaded</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {docs.map((doc) => (
                <tr key={doc.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-800 truncate max-w-[220px]" title={doc.original_filename}>
                      {doc.original_filename}
                    </div>
                    <div className="text-xs text-slate-400">{fmtBytes(doc.file_size)}</div>
                  </td>
                  <td className="px-4 py-3"><Badge status={doc.status} /></td>
                  <td className="px-4 py-3 text-center font-semibold text-slate-700">{doc.signal_count}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={doc.approved_count > 0 ? "text-green-600 font-semibold" : "text-slate-400"}>
                      {doc.approved_count}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{fmtDate(doc.uploaded_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 justify-end flex-wrap">
                      {doc.status === "uploaded" && (
                        <Button size="sm" variant="secondary"
                          loading={actionId === doc.id}
                          onClick={() => runExtractText(doc)}>
                          Extract Text
                        </Button>
                      )}
                      {TEXT_READY.has(doc.status) && doc.status !== "done" && (
                        <Button size="sm" variant="primary"
                          loading={actionId === doc.id}
                          onClick={() => runExtractSignals(doc)}>
                          Extract Signals
                        </Button>
                      )}
                      {doc.status === "done" && (
                        <Link href={`/dashboard/workspace/${doc.id}`}>
                          <Button size="sm" variant="primary">Review →</Button>
                        </Link>
                      )}
                      <Button size="sm" variant="danger"
                        loading={actionId === doc.id}
                        onClick={() => deleteDoc(doc)}>
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
