"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { FileText, ArrowRight, Trash2, Sparkles, AlertCircle, Upload, Search, ListChecks, ArrowDown } from "lucide-react";
import { api, type Doc } from "@/lib/api";
import UploadZone from "@/components/workspace/UploadZone";
import PageHeader from "@/components/PageHeader";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { fmtBytes, relTime, friendlyStatus } from "@/lib/utils";

const STEPS = [
  { icon: Upload, title: "1. Add a file", note: "Drop in a PDF, Word file, or email" },
  { icon: Search, title: "2. Click Scan", note: "We read it and pull out the key info" },
  { icon: ListChecks, title: "3. Check the results", note: "See what we found and mark what's right" },
];

export default function DocumentsPage() {
  const toast = useToast();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [welcomed, setWelcomed] = useState(true); // default true to avoid a flash before we read storage

  useEffect(() => {
    try { setWelcomed(localStorage.getItem("se_welcomed") === "1"); } catch {}
  }, []);

  const markWelcomed = useCallback(() => {
    try { localStorage.setItem("se_welcomed", "1"); } catch {}
    setWelcomed(true);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const { items } = await api.documents.list();
      setDocs(items);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not load your files");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  // One click does everything: read the file, then find the key info.
  async function scan(doc: Doc) {
    setActionId(doc.id);
    try {
      if (doc.status === "uploaded") await api.documents.extractText(doc.id);
      const result = await api.documents.extractSignals(doc.id);
      await refresh();
      toast.success(`Found ${result.signal_count} things`, doc.original_filename);
    } catch (e: unknown) {
      toast.error("Scan didn't work", e instanceof Error ? e.message : String(e));
    } finally {
      setActionId(null);
    }
  }

  async function deleteDoc(doc: Doc) {
    if (!confirm(`Remove "${doc.original_filename}"? You can't undo this.`)) return;
    setActionId(doc.id);
    try {
      await api.documents.delete(doc.id);
      await refresh();
      toast.success("File removed", doc.original_filename);
    } catch (e: unknown) {
      toast.error("Could not remove file", e instanceof Error ? e.message : String(e));
    } finally {
      setActionId(null);
    }
  }

  return (
    <div>
      <PageHeader title="Your files" subtitle="Add a file, scan it, and check what we found." />

      {/* How it works — 3 simple steps */}
      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {STEPS.map((s) => (
          <div key={s.title} className="card-surface flex items-start gap-3 p-4">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent/10 text-accent-2">
              <s.icon size={17} />
            </span>
            <div>
              <p className="text-sm font-semibold text-fg">{s.title}</p>
              <p className="mt-0.5 text-xs text-muted">{s.note}</p>
            </div>
          </div>
        ))}
      </div>

      {!loading && docs.length === 0 && !welcomed && (
        <div className="mb-2 flex justify-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-4 py-1.5 text-sm font-medium text-accent-2 animate-fade-in">
            👋 Start here — add your first file
            <ArrowDown size={15} className="animate-bounce" />
          </span>
        </div>
      )}
      <div className="mb-6">
        <UploadZone onUploaded={() => { markWelcomed(); refresh(); }} />
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 skeleton rounded-xl" />)}
        </div>
      ) : docs.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-surface/40 p-12 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-xl bg-surface-2 text-subtle">
            <FileText size={22} />
          </span>
          <p className="mt-4 font-medium text-fg">No files yet</p>
          <p className="mt-1 text-sm text-muted">Add a file above to get started.</p>
        </div>
      ) : (
        <div className="card-surface overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-subtle">
                <th className="px-5 py-3 font-medium">File</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 text-center font-medium">Things found</th>
                <th className="px-5 py-3 text-center font-medium">Marked right</th>
                <th className="px-5 py-3 font-medium">Added</th>
                <th className="px-5 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {docs.map((doc) => {
                const isDone = doc.status === "done";
                const busy = actionId === doc.id || doc.status === "extracting_text" || doc.status === "extracting_signals";
                return (
                  <tr key={doc.id} className="group border-b border-border/60 last:border-0 transition-colors hover:bg-surface-2/50">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-border bg-surface-2 text-subtle">
                          <FileText size={16} />
                        </span>
                        <div className="min-w-0">
                          <div className="max-w-[220px] truncate font-medium text-fg" title={doc.original_filename}>
                            {doc.original_filename}
                          </div>
                          <div className="font-mono text-xs text-subtle">{fmtBytes(doc.file_size)}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5"><Badge status={doc.status} label={friendlyStatus(doc.status)} /></td>
                    <td className="px-5 py-3.5 text-center font-mono tabular-nums text-fg">{isDone ? doc.signal_count : "—"}</td>
                    <td className="px-5 py-3.5 text-center font-mono tabular-nums">
                      <span className={doc.approved_count > 0 ? "text-success" : "text-subtle"}>{isDone ? doc.approved_count : "—"}</span>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-muted">{relTime(doc.uploaded_at)}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1.5">
                        {isDone ? (
                          <Link href={`/dashboard/workspace/${doc.id}`}>
                            <Button size="sm" variant="primary">See results <ArrowRight size={13} /></Button>
                          </Link>
                        ) : (
                          <Button size="sm" variant="primary" loading={busy} onClick={() => scan(doc)}>
                            <Sparkles size={13} /> Scan
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" aria-label="Remove file"
                          className="text-subtle hover:text-danger"
                          loading={actionId === doc.id} onClick={() => deleteDoc(doc)}>
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
