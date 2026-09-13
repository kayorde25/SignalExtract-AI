"use client";
import { useState } from "react";
import Link from "next/link";
import {
  Activity, Plus, FileText, ChevronLeft, ChevronRight, FolderOpen,
} from "lucide-react";
import type { Doc } from "@/lib/api";
import type { CollectionSummary } from "@/lib/types";
import { getStatusMeta } from "@/lib/status";
import { fmtBytes } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface Props {
  docs: Doc[];
  loading: boolean;
  selectedId: string | null;
  onSelect: (doc: Doc) => void;
  collections: CollectionSummary[];
  collectionsLoading: boolean;
  onNewCollection: () => void;
}

export default function ChatSidebar({
  docs, loading, selectedId, onSelect,
  collections, collectionsLoading, onNewCollection,
}: Props) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "flex h-full flex-col border-r border-border bg-surface transition-all duration-200",
        collapsed ? "w-14" : "w-64",
      )}
    >
      {/* logo row */}
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-3">
        {collapsed ? (
          <span className="mx-auto grid h-7 w-7 place-items-center rounded-lg bg-accent text-accent-contrast shadow-glow-sm">
            <Activity size={14} strokeWidth={2.4} />
          </span>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-accent text-accent-contrast shadow-glow-sm">
                <Activity size={14} strokeWidth={2.4} />
              </span>
              <span className="text-sm font-semibold text-fg">SignalExtract</span>
            </div>
            <button
              onClick={() => setCollapsed(true)}
              className="grid h-7 w-7 place-items-center rounded-lg text-subtle transition-colors hover:bg-surface-2 hover:text-fg"
              title="Collapse sidebar"
            >
              <ChevronLeft size={15} />
            </button>
          </>
        )}
      </div>

      {/* expand when collapsed */}
      {collapsed && (
        <button
          onClick={() => setCollapsed(false)}
          className="mx-auto mt-3 grid h-7 w-7 place-items-center rounded-lg text-subtle transition-colors hover:bg-surface-2 hover:text-fg"
          title="Expand sidebar"
        >
          <ChevronRight size={15} />
        </button>
      )}

      {/* new conversation */}
      <div className={cn("shrink-0 px-3", collapsed ? "mt-3" : "mt-2 pt-1")}>
        {collapsed ? (
          <button
            title="New Conversation"
            className="mx-auto grid h-8 w-8 place-items-center rounded-xl border border-dashed border-border text-accent-2 transition-colors hover:border-accent/40 hover:bg-accent/5"
          >
            <Plus size={15} />
          </button>
        ) : (
          <button className="flex w-full items-center gap-2.5 rounded-xl border border-dashed border-border px-3 py-2.5 text-sm text-muted transition-colors hover:border-accent/40 hover:bg-accent/5 hover:text-fg">
            <Plus size={15} className="shrink-0 text-accent-2" />
            New Conversation
          </button>
        )}
      </div>

      {/* scrollable content — hidden when collapsed */}
      {!collapsed && (
        <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-3 pb-4 pt-5">

          {/* ── Collections ── */}
          <section>
            <div className="mb-1.5 flex items-center justify-between px-1">
              <div className="flex items-center gap-1.5">
                <FolderOpen size={11} className="text-subtle" />
                <p className="text-[10px] font-semibold uppercase tracking-widest text-subtle">
                  Collections
                </p>
              </div>
              <button
                onClick={onNewCollection}
                title="New Collection"
                className="grid h-5 w-5 place-items-center rounded text-subtle transition-colors hover:bg-surface-2 hover:text-fg"
              >
                <Plus size={12} />
              </button>
            </div>
            {collectionsLoading ? (
              <SkeletonRows />
            ) : collections.length === 0 ? (
              <p className="px-2 py-2 text-xs text-subtle">
                No collections yet.
              </p>
            ) : (
              <div className="space-y-0.5">
                {collections.map(col => (
                  <Link
                    key={col.id}
                    href={`/collections/${col.id}`}
                    className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors hover:bg-surface-2"
                  >
                    <FolderOpen size={14} className="shrink-0 text-accent-2" />
                    <span className="truncate text-xs font-medium text-fg">
                      {col.name}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* ── Documents ── */}
          <section>
            <p className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-widest text-subtle">
              Documents
            </p>

            {loading ? (
              <SkeletonRows />
            ) : docs.length === 0 ? (
              <p className="px-2 py-2 text-xs text-subtle">
                No documents yet — upload one to get started.
              </p>
            ) : (
              <div className="space-y-0.5">
                {docs.map(doc => {
                  const meta = getStatusMeta(doc.status);
                  const active = doc.id === selectedId;
                  return (
                    <button
                      key={doc.id}
                      onClick={() => onSelect(doc)}
                      className={cn(
                        "flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors hover:bg-surface-2",
                        active && "bg-accent/10 hover:bg-accent/10",
                      )}
                    >
                      <FileText size={14} className="shrink-0 text-accent-2" />
                      <div className="min-w-0 flex-1">
                        <p className={cn(
                          "truncate text-xs font-medium",
                          active ? "text-fg" : "text-fg",
                        )}>
                          {doc.original_filename}
                        </p>
                        <div className="mt-0.5 flex items-center gap-1.5">
                          <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", meta.dot)} />
                          <span className="text-[10px] text-subtle">{fmtBytes(doc.file_size)}</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
                <Link
                  href="/documents"
                  className="flex items-center px-2 py-1.5 text-xs text-muted transition-colors hover:text-fg"
                >
                  View all →
                </Link>
              </div>
            )}
          </section>
        </div>
      )}
    </aside>
  );
}

function SkeletonRows() {
  return (
    <div className="space-y-1.5 px-1">
      {[0, 1, 2].map(i => (
        <div key={i} className="skeleton h-9 rounded-lg" style={{ animationDelay: `${i * 80}ms` }} />
      ))}
    </div>
  );
}
