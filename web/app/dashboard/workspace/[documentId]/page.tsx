"use client";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Download, FileJson, FileSpreadsheet, ShieldCheck, SearchX, AlertCircle } from "lucide-react";
import { api, type Doc, type Signal } from "@/lib/api";
import SignalTable from "@/components/workspace/SignalTable";
import DocumentViewer from "@/components/workspace/DocumentViewer";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { fmtBytes, relTime, pct, cn, friendlyStatus } from "@/lib/utils";

export default function WorkspacePage() {
  const { documentId } = useParams<{ documentId: string }>();
  const toast = useToast();
  const [doc, setDoc] = useState<Doc | null>(null);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [text, setText] = useState<string | null>(null);
  const [textLoading, setTextLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

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

  useEffect(() => {
    setTextLoading(true);
    api.documents.text(documentId)
      .then((r) => setText(r.text))
      .catch(() => setText(null))
      .finally(() => setTextLoading(false));
  }, [documentId]);

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
      toast.success(`Exported ${type.toUpperCase()}`, approvedOnly ? "Approved signals only" : "All signals");
    } catch (e: unknown) {
      toast.error("Export failed", e instanceof Error ? e.message : "Please try again");
    } finally {
      setExporting(false);
    }
  }

  if (loading)
    return (
      <div className="space-y-4">
        <div className="h-10 w-72 skeleton rounded-lg" />
        <div className="grid grid-cols-4 gap-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 skeleton rounded-xl" />)}</div>
        <div className="h-64 skeleton rounded-2xl" />
      </div>
    );

  if (error || !doc)
    return (
      <div className="flex items-center gap-2 rounded-xl border border-danger/30 bg-danger/10 p-4 text-sm text-danger">
        <AlertCircle size={18} /> {error ?? "Document not found"}
      </div>
    );

  const pending = signals.filter((s) => s.review_status === "pending").length;
  const approvedPct = doc.signal_count > 0 ? doc.approved_count / doc.signal_count : 0;
  const selected = signals.find((s) => s.id === selectedId) ?? null;

  const stats = [
    { label: "Things found", value: doc.signal_count, tone: "text-fg" },
    { label: "Marked right", value: doc.approved_count, tone: "text-success" },
    { label: "Still to check", value: pending, tone: "text-warning" },
    { label: "Checked so far", value: pct(approvedPct), tone: "text-accent-2" },
  ];

  return (
    <div>
      <Link href="/dashboard/documents" className="mb-3 inline-flex items-center gap-1 text-xs text-muted transition-colors hover:text-fg">
        <ChevronLeft size={14} /> Documents
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="truncate text-[22px] font-semibold tracking-tight text-fg">{doc.original_filename}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-subtle">
            <Badge status={doc.status} label={friendlyStatus(doc.status)} />
            <span className="font-mono">{fmtBytes(doc.file_size)}</span>
            <span className="text-border-strong">·</span>
            <span>Added {relTime(doc.uploaded_at)}</span>
          </div>
        </div>

        <div className="flex flex-shrink-0 items-center gap-2">
          <Button size="sm" variant="secondary" loading={exporting} title="Download everything (JSON file)" onClick={() => downloadExport("json", false)}>
            <FileJson size={14} /> Save all
          </Button>
          <Button size="sm" variant="secondary" loading={exporting} title="Download as a spreadsheet (CSV)" onClick={() => downloadExport("csv", false)}>
            <FileSpreadsheet size={14} /> As a table
          </Button>
          <Button size="sm" variant="primary" loading={exporting} title="Download only the items you marked right" onClick={() => downloadExport("json", true)}>
            <ShieldCheck size={14} /> Save right ones
          </Button>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="card-surface p-4">
            <p className="text-xs text-subtle">{s.label}</p>
            <p className={cn("mt-1 font-mono text-2xl font-semibold tabular-nums", s.tone)}>{s.value}</p>
          </div>
        ))}
      </div>

      {signals.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-surface/40 p-12 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-xl bg-surface-2 text-subtle"><SearchX size={22} /></span>
          <p className="mt-4 font-medium text-fg">Nothing found yet</p>
          <p className="mt-1 text-sm text-muted">Go back and click Scan to find the key info in this file.</p>
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-12">
          <div className="xl:col-span-5">
            <div className="xl:sticky xl:top-20 xl:h-[calc(100vh-9rem)]">
              <DocumentViewer text={text} loading={textLoading} selected={selected} />
            </div>
          </div>
          <div className="min-w-0 xl:col-span-7">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-fg">
              <Download size={15} className="text-subtle" /> What we found
              <span className="text-xs font-normal text-subtle">— click an item to see where it came from</span>
            </div>
            <SignalTable
              signals={signals}
              onChanged={refresh}
              compact
              selectedId={selectedId}
              onSelect={(s) => setSelectedId(s.id)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
