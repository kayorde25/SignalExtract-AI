"use client";
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Share2, RefreshCw, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { api } from "@/lib/api";
import type { GraphNode, GraphEdge, GraphResponse, EntityDetail } from "@/lib/types";
import { signalMeta } from "@/lib/signal-types";
import { cn } from "@/lib/utils";

interface Props {
  documentId?: string;
  collectionId?: string;
  label?: string;
}

const NODE_COLOR: Record<string, string> = {
  person_name:  "rgb(var(--accent))",
  organization: "rgb(var(--success))",
  location:     "rgb(var(--warning))",
};

const CLUSTER_LABEL: Record<string, string> = {
  person_name:  "People",
  organization: "Organizations",
  location:     "Locations",
};

const LEGEND_TYPES = ["person_name", "organization", "location"] as const;

function clusterCenters(w: number, h: number) {
  return {
    person_name:  { x: w * 0.50, y: h * 0.22 },
    organization: { x: w * 0.75, y: h * 0.68 },
    location:     { x: w * 0.25, y: h * 0.68 },
  };
}

function computeLayout(
  nodes: GraphNode[],
  w: number,
  h: number,
): Record<string, { x: number; y: number }> {
  const groups: Record<string, GraphNode[]> = {
    person_name: [], organization: [], location: [],
  };
  for (const n of nodes) (groups[n.entity_type] ??= []).push(n);

  const centers = clusterCenters(w, h);
  const positions: Record<string, { x: number; y: number }> = {};

  for (const [type, cluster] of Object.entries(groups)) {
    const { x: cx, y: cy } = centers[type as keyof typeof centers];
    const r = Math.min(45 + cluster.length * 18, 140);
    cluster.forEach((node, i) => {
      const angle = (2 * Math.PI * i) / Math.max(cluster.length, 1) - Math.PI / 2;
      positions[node.id] = {
        x: cluster.length > 1 ? cx + r * Math.cos(angle) : cx,
        y: cluster.length > 1 ? cy + r * Math.sin(angle) : cy,
      };
    });
  }
  return positions;
}

function truncate(s: string, max: number) {
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}

export default function GraphView({ documentId, collectionId, label = "Entity Graph" }: Props) {
  const [graphData, setGraphData]     = useState<GraphResponse | null>(null);
  const [loading, setLoading]         = useState(true);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [dims, setDims]               = useState({ w: 800, h: 500 });
  const containerRef                  = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    if (!documentId && !collectionId) return;
    setLoading(true);
    setSelectedNode(null);
    try {
      const data = documentId
        ? await api.documents.graph(documentId)
        : await api.collections.graph(collectionId!);
      setGraphData(data);
    } catch {
      setGraphData({ nodes: [], edges: [] });
    } finally {
      setLoading(false);
    }
  }, [documentId, collectionId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(([e]) => {
      setDims({ w: e.contentRect.width, h: e.contentRect.height });
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const positions = useMemo(
    () => computeLayout(graphData?.nodes ?? [], dims.w, dims.h),
    [graphData, dims],
  );

  const isEmpty = !loading && graphData?.nodes.length === 0;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-border bg-bg px-6 py-3">
        <div>
          <span className="text-sm font-semibold text-fg">{label}</span>
          {!loading && graphData && graphData.nodes.length > 0 && (
            <div className="mt-0.5 flex items-center gap-3 text-xs text-subtle">
              <span>{graphData.nodes.length} entities</span>
              <span>{graphData.edges.length} relationships</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          {/* Legend */}
          {LEGEND_TYPES.map(type => (
            <span key={type} className="flex items-center gap-1.5 text-xs text-muted">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: NODE_COLOR[type] }}
              />
              {CLUSTER_LABEL[type]}
            </span>
          ))}
          <button
            onClick={load}
            title="Refresh"
            className="ml-1 grid h-7 w-7 place-items-center rounded-lg text-subtle transition-colors hover:bg-surface-2 hover:text-fg"
          >
            <RefreshCw size={13} />
          </button>
        </div>
      </div>

      {/* Body */}
      {loading ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-accent" />
        </div>
      ) : isEmpty ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-surface-2 text-subtle">
            <Share2 size={22} />
          </div>
          <p className="text-sm font-medium text-fg">No entity relationships found</p>
          <p className="text-xs text-subtle">
            Extract signals on this document to build its entity graph.
          </p>
        </div>
      ) : (
        <div className="relative flex min-h-0 flex-1">
          {/* SVG canvas */}
          <div ref={containerRef} className="flex-1 overflow-hidden">
            <svg width={dims.w} height={dims.h} className="select-none">
              {/* Cluster labels */}
              {LEGEND_TYPES.map(type => {
                const centers = clusterCenters(dims.w, dims.h);
                const { x, y } = centers[type];
                return (
                  <text
                    key={type}
                    x={x}
                    y={y - 60}
                    textAnchor="middle"
                    fontSize={11}
                    fill="rgb(var(--subtle))"
                    fontWeight={500}
                    letterSpacing={0.5}
                  >
                    {CLUSTER_LABEL[type].toUpperCase()}
                  </text>
                );
              })}

              {/* Edges */}
              {graphData!.edges.map(edge => {
                const a = positions[edge.source_node_id];
                const b = positions[edge.target_node_id];
                if (!a || !b) return null;
                return (
                  <line
                    key={edge.id}
                    x1={a.x} y1={a.y}
                    x2={b.x} y2={b.y}
                    stroke="rgb(var(--border-strong))"
                    strokeWidth={Math.min(1 + edge.strength, 5)}
                    strokeOpacity={0.4}
                  />
                );
              })}

              {/* Nodes */}
              {graphData!.nodes.map(node => {
                const pos = positions[node.id];
                if (!pos) return null;
                const isSelected = selectedNode?.id === node.id;
                return (
                  <g
                    key={node.id}
                    transform={`translate(${pos.x},${pos.y})`}
                    style={{ cursor: "pointer" }}
                    onClick={() => setSelectedNode(isSelected ? null : node)}
                  >
                    <circle
                      r={22}
                      fill={NODE_COLOR[node.entity_type]}
                      opacity={0.9}
                      stroke={isSelected ? "rgb(var(--fg))" : "none"}
                      strokeWidth={isSelected ? 2 : 0}
                    />
                    <text
                      y={34}
                      textAnchor="middle"
                      fontSize={10}
                      fill="rgb(var(--muted))"
                    >
                      {truncate(node.entity_value, 18)}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Entity detail panel */}
          {selectedNode && (
            <EntityDetailPanel
              node={selectedNode}
              onClose={() => setSelectedNode(null)}
            />
          )}
        </div>
      )}
    </div>
  );
}

function EntityDetailPanel({
  node,
  onClose,
}: {
  node: GraphNode;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<EntityDetail | null>(null);

  useEffect(() => {
    let cancelled = false;
    setDetail(null);
    api.entities.detail(node.id).then(d => {
      if (!cancelled) setDetail(d);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [node.id]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const meta = signalMeta(node.entity_type);
  const Icon = meta.icon as LucideIcon;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 bg-bg/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      <div className="relative flex h-full w-full max-w-sm flex-col border-l border-border bg-surface animate-slide-right">
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-5">
          <span className="text-sm font-semibold text-fg">Entity Detail</span>
          <button
            onClick={onClose}
            className="grid h-7 w-7 place-items-center rounded-lg text-subtle transition-colors hover:bg-surface-2 hover:text-fg"
          >
            <X size={15} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <div>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-subtle">
              Entity
            </p>
            <p className="break-words font-mono text-base font-semibold text-fg">
              {node.entity_value}
            </p>
          </div>

          <div>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-subtle">
              Type
            </p>
            <span className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-sm text-muted">
              <Icon size={14} className="text-accent-2" />
              {meta.label}
            </span>
          </div>

          {detail === null ? (
            <div className="flex justify-center py-6">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-border border-t-accent" />
            </div>
          ) : (
            <>
              <div>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-subtle">
                  Documents ({detail.documents.length})
                </p>
                {detail.documents.length === 0 ? (
                  <p className="text-xs text-subtle">None</p>
                ) : (
                  <ul className="space-y-1">
                    {detail.documents.map(d => (
                      <li key={d.id} className="text-xs text-muted truncate">
                        · {d.filename}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-subtle">
                  Relationships ({detail.relationships.length})
                </p>
                {detail.relationships.length === 0 ? (
                  <p className="text-xs text-subtle">None</p>
                ) : (
                  <ul className="space-y-3">
                    {detail.relationships.map((r, i) => {
                      const rMeta = signalMeta(r.entity.entity_type);
                      const RIcon = rMeta.icon as LucideIcon;
                      return (
                        <li key={i} className="flex items-start justify-between gap-2">
                          <span className="flex items-center gap-1.5 text-xs text-muted min-w-0">
                            <RIcon size={11} className="shrink-0 text-subtle" />
                            <span className="truncate">{r.entity.entity_value}</span>
                          </span>
                          <span className="shrink-0 flex items-center gap-1.5 text-xs text-subtle">
                            <span className="font-mono">{r.strength}×</span>
                            <span className="text-subtle/60">
                              {r.document_count} doc{r.document_count !== 1 ? "s" : ""}
                            </span>
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
