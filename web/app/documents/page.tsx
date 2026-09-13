"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity, Search, Upload, FileText, Clock, ArrowLeft, RefreshCw,
} from "lucide-react";
import { api, type Doc } from "@/lib/api";
import { getStatusMeta } from "@/lib/status";
import { fmtBytes, relTime } from "@/lib/utils";
import { cn } from "@/lib/utils";
import ThemeToggle from "@/components/ThemeToggle";

export default function DocumentsPage() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const list = await api.documents.list(0, 100);
      setDocs(list.items);
    } catch (err) {
      console.error("[documents] fetch failed:", err);
      setError("Couldn't load documents. Is the backend running?");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const filtered = docs.filter(d =>
    d.original_filename.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="min-h-screen bg-bg">
      {/* nav */}
      <header className="sticky top-0 z-20 border-b border-border/60 bg-bg/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-subtle transition-colors hover:text-fg">
              <ArrowLeft size={16} />
            </Link>
            <div className="flex items-center gap-2">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-accent text-accent-contrast shadow-glow-sm">
                <Activity size={14} strokeWidth={2.4} />
              </span>
              <span className="text-sm font-semibold text-fg">Documents</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link
              href="/workspace"
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-accent px-3 text-sm font-medium text-accent-contrast shadow-glow-sm transition-colors hover:bg-accent-2"
            >
              <Upload size={13} />
              Upload
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        {/* search */}
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-2.5 transition-colors focus-within:border-accent/50">
          <Search size={15} className="shrink-0 text-subtle" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search documents…"
            className="flex-1 bg-transparent text-sm text-fg placeholder:text-subtle outline-none"
          />
          {docs.length > 0 && (
            <span className="shrink-0 text-xs text-subtle">{docs.length} total</span>
          )}
        </div>

        {/* states */}
        {loading && <SkeletonList />}

        {!loading && error && (
          <div className="card-surface flex flex-col items-center gap-3 py-14 text-center">
            <p className="text-sm text-muted">{error}</p>
            <button
              onClick={load}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-xs text-fg transition-colors hover:bg-surface"
            >
              <RefreshCw size={13} /> Retry
            </button>
          </div>
        )}

        {!loading && !error && filtered.length === 0 && query && (
          <div className="card-surface py-16 text-center text-sm text-muted">
            No documents match &ldquo;{query}&rdquo;
          </div>
        )}

        {!loading && !error && docs.length === 0 && !query && (
          <div className="card-surface flex flex-col items-center gap-4 py-16 text-center">
            <FileText size={32} className="text-subtle" />
            <p className="text-sm text-muted">No documents yet.</p>
            <Link
              href="/workspace"
              className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-accent px-4 text-sm font-medium text-accent-contrast shadow-glow-sm hover:bg-accent-2 transition-colors"
            >
              <Upload size={14} /> Upload your first document
            </Link>
          </div>
        )}

        {/* document list */}
        {!loading && !error && filtered.length > 0 && (
          <div className="space-y-2">
            {filtered.map(doc => {
              const meta = getStatusMeta(doc.status);
              return (
                <div
                  key={doc.id}
                  className="card-surface flex items-center gap-4 p-4 transition-colors hover:border-border-strong"
                >
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent/10 text-accent-2">
                    <FileText size={18} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-fg">
                      {doc.original_filename}
                    </p>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-subtle">
                      <span>{fmtBytes(doc.file_size)}</span>
                      <span aria-hidden>·</span>
                      <Clock size={10} />
                      <span>{relTime(doc.uploaded_at)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={cn(
                      "rounded-full px-2.5 py-0.5 text-[11px] font-medium",
                      meta.badge,
                    )}>
                      {meta.label}
                    </span>
                    {doc.signal_count > 0 && (
                      <span className="font-mono text-xs text-muted">
                        {doc.signal_count} signals
                      </span>
                    )}
                    <Link
                      href={`/dashboard/workspace/${doc.id}`}
                      className="inline-flex h-7 items-center rounded-lg border border-border bg-surface-2 px-2.5 text-xs text-muted transition-colors hover:border-border-strong hover:text-fg"
                    >
                      View
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

function SkeletonList() {
  return (
    <div className="space-y-2">
      {[0, 1, 2, 3].map(i => (
        <div
          key={i}
          className="skeleton h-[72px] rounded-2xl"
          style={{ animationDelay: `${i * 60}ms` }}
        />
      ))}
    </div>
  );
}
