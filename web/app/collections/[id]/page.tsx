"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Edit2, Check, X, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import type { CollectionDetail } from "@/lib/types";
import { getStatusMeta } from "@/lib/status";
import { cn } from "@/lib/utils";
import GraphView from "@/components/chat/GraphView";
import ThemeToggle from "@/components/ThemeToggle";

export default function CollectionPage() {
  const { id } = useParams<{ id: string }>();
  const [detail, setDetail] = useState<CollectionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [removingDocId, setRemovingDocId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.collections.get(id);
      setDetail(data);
      setNameInput(data.name);
    } catch {
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function saveName() {
    if (!nameInput.trim() || !detail) return;
    setSavingName(true);
    try {
      await api.collections.update(id, { name: nameInput.trim() });
      setDetail(d => d ? { ...d, name: nameInput.trim() } : d);
      setEditingName(false);
    } catch {
      // revert
      setNameInput(detail.name);
    } finally {
      setSavingName(false);
    }
  }

  async function removeDoc(docId: string) {
    setRemovingDocId(docId);
    try {
      await api.collections.removeDocument(id, docId);
      setDetail(d => d ? {
        ...d,
        documents: d.documents.filter(doc => doc.id !== docId),
        document_count: d.document_count - 1,
        signal_count: d.signal_count - (d.documents.find(doc => doc.id === docId)?.signal_count ?? 0),
      } : d);
    } catch {
      // ignore
    } finally {
      setRemovingDocId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-accent" />
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-bg">
        <p className="text-sm text-subtle">Collection not found.</p>
        <Link href="/workspace" className="text-sm text-accent hover:underline">
          ← Back to workspace
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      {/* Topbar */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-bg px-6">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/workspace"
            className="shrink-0 flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-fg"
          >
            <ArrowLeft size={14} />
            Workspace
          </Link>
          <span className="text-subtle">/</span>
          {editingName ? (
            <div className="flex items-center gap-2">
              <input
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter") saveName();
                  if (e.key === "Escape") { setEditingName(false); setNameInput(detail.name); }
                }}
                className="rounded-lg border border-accent bg-surface px-2.5 py-1 text-sm font-semibold text-fg outline-none"
                autoFocus
              />
              <button
                onClick={saveName}
                disabled={savingName}
                className="grid h-7 w-7 place-items-center rounded-lg text-success transition-colors hover:bg-surface-2"
              >
                <Check size={14} />
              </button>
              <button
                onClick={() => { setEditingName(false); setNameInput(detail.name); }}
                className="grid h-7 w-7 place-items-center rounded-lg text-subtle transition-colors hover:bg-surface-2 hover:text-fg"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 min-w-0">
              <h1 className="truncate text-sm font-semibold text-fg">{detail.name}</h1>
              <button
                onClick={() => setEditingName(true)}
                className="shrink-0 grid h-6 w-6 place-items-center rounded text-subtle transition-colors hover:bg-surface-2 hover:text-fg"
              >
                <Edit2 size={12} />
              </button>
            </div>
          )}
        </div>
        <ThemeToggle />
      </header>

      {/* Stats bar */}
      <div className="shrink-0 border-b border-border bg-surface px-6 py-2.5">
        <div className="flex items-center gap-6 text-xs text-muted">
          {detail.description && (
            <span className="text-fg/70">{detail.description}</span>
          )}
          <span>{detail.document_count} document{detail.document_count !== 1 ? "s" : ""}</span>
          <span>{detail.signal_count.toLocaleString()} signals</span>
          <span>{detail.entity_count} entities</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Documents panel */}
        <div className="w-80 shrink-0 flex flex-col border-r border-border overflow-hidden">
          <div className="flex h-10 shrink-0 items-center border-b border-border px-4">
            <span className="text-xs font-semibold text-muted uppercase tracking-wider">
              Documents
            </span>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
            {detail.documents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center gap-2">
                <p className="text-sm text-subtle">No documents in this collection.</p>
                <Link href="/workspace" className="text-xs text-accent hover:underline">
                  Add documents from workspace →
                </Link>
              </div>
            ) : (
              detail.documents.map(doc => {
                const meta = getStatusMeta(doc.status);
                return (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-border bg-surface-2 px-3 py-2.5"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-fg">{doc.filename}</p>
                      <div className="mt-0.5 flex items-center gap-1.5">
                        <span className={cn("rounded-full px-1.5 py-px text-[10px] font-medium", meta.badge)}>
                          {meta.label}
                        </span>
                        <span className="text-[10px] text-subtle">{doc.signal_count} signals</span>
                      </div>
                    </div>
                    <button
                      onClick={() => removeDoc(doc.id)}
                      disabled={removingDocId === doc.id}
                      title="Remove from collection"
                      className="shrink-0 grid h-6 w-6 place-items-center rounded text-subtle transition-colors hover:bg-danger/10 hover:text-danger disabled:opacity-40"
                    >
                      {removingDocId === doc.id ? (
                        <div className="h-3 w-3 animate-spin rounded-full border border-current border-t-transparent" />
                      ) : (
                        <Trash2 size={12} />
                      )}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Graph panel */}
        <div className="flex-1 min-w-0 overflow-hidden">
          <GraphView
            key={id}
            collectionId={id}
            label="Collection Graph"
          />
        </div>
      </div>
    </div>
  );
}
