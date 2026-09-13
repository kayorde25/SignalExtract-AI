"use client";
import { useState, useEffect } from "react";
import { X, FolderOpen, Plus, Check } from "lucide-react";
import { api } from "@/lib/api";
import type { CollectionSummary } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  documentId?: string;
  collections: CollectionSummary[];
  onClose: () => void;
  onCreated: (c: CollectionSummary) => void;
  onAdded?: () => void;
}

export default function CollectionPickerModal({
  documentId,
  collections,
  onClose,
  onCreated,
  onAdded,
}: Props) {
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [creating, setCreating] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [addedId, setAddedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const title = documentId ? "Add to Collection" : "New Collection";

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  async function handleAdd(collectionId: string) {
    if (!documentId) return;
    setAddingId(collectionId);
    setError(null);
    try {
      await api.collections.addDocument(collectionId, documentId);
      setAddedId(collectionId);
      onAdded?.();
      setTimeout(onClose, 800);
    } catch {
      setError("Failed to add document. Try again.");
    } finally {
      setAddingId(null);
    }
  }

  async function handleCreate() {
    if (!newName.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const col = await api.collections.create({
        name: newName.trim(),
        description: newDesc.trim() || undefined,
      });
      if (documentId) {
        await api.collections.addDocument(col.id, documentId);
        onAdded?.();
      }
      onCreated(col);
      onClose();
    } catch {
      setError("Failed to create collection. Try again.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-bg/70 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Card */}
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-surface shadow-xl animate-fade-in">
        {/* Header */}
        <div className="flex h-14 items-center justify-between border-b border-border px-5">
          <span className="text-sm font-semibold text-fg">{title}</span>
          <button
            onClick={onClose}
            className="grid h-7 w-7 place-items-center rounded-lg text-subtle transition-colors hover:bg-surface-2 hover:text-fg"
          >
            <X size={15} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Existing collections — only shown in Add mode */}
          {documentId && collections.length > 0 && (
            <div>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-subtle">
                Existing Collections
              </p>
              <ul className="max-h-40 overflow-y-auto space-y-1">
                {collections.map(col => {
                  const isAdded = addedId === col.id;
                  const isAdding = addingId === col.id;
                  return (
                    <li
                      key={col.id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-2 px-3 py-2"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <FolderOpen size={13} className="shrink-0 text-accent-2" />
                        <span className="truncate text-sm text-fg">{col.name}</span>
                      </div>
                      <button
                        onClick={() => handleAdd(col.id)}
                        disabled={isAdding || isAdded}
                        className={cn(
                          "shrink-0 flex h-7 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium transition-colors",
                          isAdded
                            ? "bg-success/15 text-success"
                            : "bg-accent/10 text-accent hover:bg-accent/20 disabled:opacity-50",
                        )}
                      >
                        {isAdded ? (
                          <><Check size={11} /> Added</>
                        ) : isAdding ? (
                          <div className="h-3 w-3 animate-spin rounded-full border border-current border-t-transparent" />
                        ) : (
                          <><Plus size={11} /> Add</>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
              <div className="mt-4 border-t border-border" />
            </div>
          )}

          {/* Create new */}
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-subtle">
              {documentId && collections.length > 0 ? "Or Create New" : "Collection Details"}
            </p>
            <div className="space-y-2">
              <input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") handleCreate(); }}
                placeholder="Collection name"
                className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-fg placeholder:text-subtle outline-none focus:border-accent"
                autoFocus
              />
              <input
                type="text"
                value={newDesc}
                onChange={e => setNewDesc(e.target.value)}
                placeholder="Description (optional)"
                className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-fg placeholder:text-subtle outline-none focus:border-accent"
              />
            </div>
          </div>

          {error && (
            <p className="text-xs text-danger">{error}</p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              onClick={onClose}
              className="h-8 rounded-lg border border-border px-3 text-sm text-muted transition-colors hover:border-border-strong hover:text-fg"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={!newName.trim() || creating}
              className="h-8 rounded-lg bg-accent px-4 text-sm font-medium text-accent-contrast transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {creating ? "Creating…" : documentId ? "Create & Add" : "Create"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
