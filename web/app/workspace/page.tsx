"use client";
import { Suspense, useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { PanelRight, FolderPlus } from "lucide-react";
import { api, type Doc, type Stats } from "@/lib/api";
import type { CollectionSummary } from "@/lib/types";
import { getStatusMeta } from "@/lib/status";
import { relTime, cn } from "@/lib/utils";
import ChatSidebar from "@/components/chat/ChatSidebar";
import ChatWindow from "@/components/chat/ChatWindow";
import InsightsPanel from "@/components/chat/InsightsPanel";
import SignalExplorer from "@/components/chat/SignalExplorer";
import CompareView from "@/components/chat/CompareView";
import GraphView from "@/components/chat/GraphView";
import CollectionPickerModal from "@/components/chat/CollectionPickerModal";
import ThemeToggle from "@/components/ThemeToggle";

type Tab = "chat" | "signals" | "compare" | "graph" | "documents";
const VALID_TABS = new Set<Tab>(["chat", "signals", "compare", "graph", "documents"]);

function WorkspaceInner() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [docs, setDocs] = useState<Doc[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<Doc | null>(null);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [collections, setCollections] = useState<CollectionSummary[]>([]);
  const [collectionsLoading, setCollectionsLoading] = useState(true);
  const [collectionPickerDocId, setCollectionPickerDocId] = useState<string | null>(null);
  const [showCreateCollection, setShowCreateCollection] = useState(false);
  const [insightsOpen, setInsightsOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    const t = searchParams.get("tab");
    return VALID_TABS.has(t as Tab) ? (t as Tab) : "chat";
  });

  function changeTab(tab: Tab) {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.replace(`/workspace?${params.toString()}`, { scroll: false });
  }

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [docList, statsData, collList] = await Promise.all([
          api.documents.list(0, 100),
          api.stats(),
          api.collections.list(),
        ]);
        if (cancelled) return;
        setDocs(docList.items);
        setStats(statsData);
        setCollections(collList.items);
        setCollectionsLoading(false);

        const paramId = searchParams.get("doc");
        if (paramId) {
          const target = docList.items.find(d => d.id === paramId) ?? null;
          setSelectedDoc(target);
        }
      } catch (err) {
        console.error("[workspace] load failed:", err);
      } finally {
        if (!cancelled) setLoadingDocs(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [searchParams]);

  const handleSelect = useCallback((doc: Doc) => {
    setSelectedDoc(doc);
  }, []);

  const statusMeta = selectedDoc ? getStatusMeta(selectedDoc.status) : null;

  return (
    <div className="flex h-screen overflow-hidden bg-bg">
      {/* left sidebar */}
      <ChatSidebar
        docs={docs}
        loading={loadingDocs}
        selectedId={selectedDoc?.id ?? null}
        onSelect={handleSelect}
        collections={collections}
        collectionsLoading={collectionsLoading}
        onNewCollection={() => setShowCreateCollection(true)}
      />

      {/* main column */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">

        {/* topbar */}
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-bg px-4">
          {selectedDoc ? (
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="truncate text-sm font-medium text-fg">
                {selectedDoc.original_filename}
              </span>
              <span className={cn(
                "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium",
                statusMeta?.badge,
              )}>
                {statusMeta?.label}
              </span>
              {selectedDoc.signal_count > 0 && (
                <span className="shrink-0 text-xs text-muted">
                  {selectedDoc.signal_count} signals
                </span>
              )}
              <span className="shrink-0 text-xs text-subtle">
                {relTime(selectedDoc.uploaded_at)}
              </span>
            </div>
          ) : (
            <span className="text-sm font-medium text-fg">New Conversation</span>
          )}

          <div className="flex shrink-0 items-center gap-1.5">
            <ThemeToggle />
            {activeTab === "chat" && (
              <button
                onClick={() => setInsightsOpen(o => !o)}
                title={insightsOpen ? "Hide insights" : "Show insights"}
                className="grid h-8 w-8 place-items-center rounded-lg text-subtle transition-colors hover:bg-surface-2 hover:text-fg"
              >
                <PanelRight size={15} />
              </button>
            )}
          </div>
        </header>

        {/* Tab bar */}
        <div className="flex shrink-0 items-center gap-1 border-b border-border bg-bg px-4">
          {(["chat", "signals", "compare", "graph", "documents"] as Tab[]).map(tab => (
            <button
              key={tab}
              onClick={() => changeTab(tab)}
              className={cn(
                "-mb-px border-b-2 px-3 py-2.5 text-sm font-medium capitalize transition-colors",
                activeTab === tab
                  ? "border-accent text-fg"
                  : "border-transparent text-muted hover:text-fg",
              )}
            >
              {tab}
              {tab === "signals" && selectedDoc && selectedDoc.signal_count > 0 && (
                <span className="ml-1.5 inline-block rounded-full bg-surface-2 px-1.5 py-px font-mono text-[10px] text-subtle">
                  {selectedDoc.signal_count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content row — changes per tab */}
        {activeTab === "chat" ? (
          <div className="flex min-h-0 flex-1 overflow-hidden">
            <ChatWindow selectedDoc={selectedDoc} />
            <InsightsPanel
              open={insightsOpen}
              onClose={() => setInsightsOpen(false)}
              selectedDoc={selectedDoc}
              stats={stats}
              onOpenSignals={() => changeTab("signals")}
            />
          </div>
        ) : activeTab === "signals" ? (
          <div className="min-h-0 flex-1 overflow-hidden">
            {selectedDoc ? (
              <SignalExplorer documentId={selectedDoc.id} onViewInGraph={() => changeTab("graph")} />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-subtle">
                Select a document from the sidebar to view signals.
              </div>
            )}
          </div>
        ) : activeTab === "compare" ? (
          <div className="min-h-0 flex-1 overflow-hidden">
            <CompareView docs={docs} />
          </div>
        ) : activeTab === "graph" ? (
          <div className="min-h-0 flex-1 overflow-hidden">
            {selectedDoc ? (
              <GraphView key={selectedDoc.id} documentId={selectedDoc.id} />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-subtle">
                Select a document from the sidebar to view its entity graph.
              </div>
            )}
          </div>
        ) : (
          <DocumentsTab
            docs={docs}
            onOpen={doc => { setSelectedDoc(doc); changeTab("chat"); }}
            onAddToCollection={setCollectionPickerDocId}
          />
        )}
      </div>

      {/* Collection picker modal */}
      {(collectionPickerDocId !== null || showCreateCollection) && (
        <CollectionPickerModal
          documentId={collectionPickerDocId ?? undefined}
          collections={collections}
          onClose={() => { setCollectionPickerDocId(null); setShowCreateCollection(false); }}
          onCreated={c => setCollections(prev => [c, ...prev])}
          onAdded={() => { setCollectionPickerDocId(null); }}
        />
      )}
    </div>
  );
}

export default function WorkspacePage() {
  return (
    <Suspense fallback={<WorkspaceSkeleton />}>
      <WorkspaceInner />
    </Suspense>
  );
}

function WorkspaceSkeleton() {
  return (
    <div className="flex h-screen overflow-hidden bg-bg">
      <div className="w-64 shrink-0 border-r border-border bg-surface" />
      <div className="flex flex-1 flex-col">
        <div className="h-14 shrink-0 border-b border-border" />
        <div className="h-10 shrink-0 border-b border-border" />
        <div className="flex-1" />
      </div>
    </div>
  );
}

function DocumentsTab({
  docs,
  onOpen,
  onAddToCollection,
}: {
  docs: Doc[];
  onOpen: (d: Doc) => void;
  onAddToCollection?: (docId: string) => void;
}) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-6">
      {!docs.length ? (
        <div className="flex h-full items-center justify-center text-sm text-subtle">
          No documents yet.
        </div>
      ) : (
        <div className="mx-auto grid max-w-4xl grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {docs.map(doc => {
            const meta = getStatusMeta(doc.status);
            return (
              <div key={doc.id} className="relative">
                <button
                  onClick={() => onOpen(doc)}
                  className="card-surface flex w-full flex-col gap-1.5 p-4 text-left transition-colors hover:border-border-strong"
                >
                  <span className="truncate text-sm font-medium text-fg pr-6">
                    {doc.original_filename}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", meta.badge)}>
                      {meta.label}
                    </span>
                    <span className="text-xs text-subtle">{doc.signal_count} signals</span>
                  </div>
                  <span className="text-xs text-subtle">{relTime(doc.uploaded_at)}</span>
                </button>
                {onAddToCollection && (
                  <button
                    onClick={e => { e.stopPropagation(); onAddToCollection(doc.id); }}
                    title="Add to Collection"
                    className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded text-subtle transition-colors hover:bg-surface-2 hover:text-accent z-10"
                  >
                    <FolderPlus size={13} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
