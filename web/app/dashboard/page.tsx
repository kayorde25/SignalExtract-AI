import {
  AlertCircle,
  Brain,
  CheckCircle2,
  Clock3,
  CloudUpload,
  FileCheck2,
  FileText,
  HardDrive,
  ScanSearch,
  Sparkles,
  Waypoints,
  XCircle,
} from "lucide-react";

import { MetricCard } from "@/components/dashboard/MetricCard";
import { StatusCard } from "@/components/dashboard/StatusCard";
import { WorkflowStep } from "@/components/dashboard/WorkflowStep";
import {
  getBackendBaseUrlForDisplay,
  getLatestDocuments,
  getSignalsByDocument,
  getStats,
  getSystemStatus,
} from "@/lib/api";

type RecentActivityItem = {
  id: string;
  filename: string;
  status: string;
  createdAt: string;
  signalCount?: number;
};

function formatTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unknown timestamp";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function normalizeRunStatus(status?: string) {
  if (!status) return "No run";

  const normalized = status.toLowerCase();
  if (normalized === "completed") return "Completed";
  if (normalized === "failed") return "Failed";
  if (normalized === "running") return "Running";
  return status;
}

export default async function DashboardPage() {
  const backendUrl = getBackendBaseUrlForDisplay();

  const [statsResult, systemStatusResult, historyResult] = await Promise.allSettled([
    getStats(),
    getSystemStatus(),
    getLatestDocuments(),
  ]);

  const stats =
    statsResult.status === "fulfilled"
      ? statsResult.value
      : {
          documents: 0,
          extractionRuns: 0,
          signals: 0,
          pending: 0,
          approved: 0,
          rejected: 0,
          needsClarification: 0,
        };

  const systemStatus =
    systemStatusResult.status === "fulfilled"
      ? systemStatusResult.value
      : {
          api: "Unavailable",
          llm: "Unknown",
          storage: "Unavailable",
          extractionMode: "Unknown",
          apiKeyConfigured: false,
          database: "Unavailable",
        };

  const history =
    historyResult.status === "fulfilled"
      ? historyResult.value
      : {
          documents: [],
          extractionRuns: [],
        };

  const runsByDocument = new Map(
    history.extractionRuns.map((run) => [run.document_id, run])
  );

  const recentDocuments = history.documents.slice(0, 5);

  const recentActivity: RecentActivityItem[] = await Promise.all(
    recentDocuments.map(async (document) => {
      const linkedRun = runsByDocument.get(document.document_id);

      const signalsResult = await getSignalsByDocument(document.document_id)
        .then((result) => ({ count: result.length }))
        .catch(() => ({ count: undefined }));

      return {
        id: document.document_id,
        filename: document.filename,
        status: normalizeRunStatus(linkedRun?.status),
        createdAt: linkedRun?.created_at ?? document.created_at,
        signalCount: signalsResult.count,
      };
    })
  );

  const hasBackendFailures =
    statsResult.status === "rejected" ||
    systemStatusResult.status === "rejected" ||
    historyResult.status === "rejected";

  const metricCards = [
    {
      label: "Documents processed",
      value: stats.documents,
      helper: "Documents successfully ingested into the workspace.",
      icon: FileText,
      toneClassName: "text-blue-300",
    },
    {
      label: "Total signals extracted",
      value: stats.signals,
      helper: "Structured signals generated with evidence links.",
      icon: Brain,
      toneClassName: "text-indigo-300",
    },
    {
      label: "Needs review",
      value: stats.pending,
      helper: "Signals currently queued for human review.",
      icon: AlertCircle,
      toneClassName: "text-amber-300",
    },
    {
      label: "Approved signals",
      value: stats.approved,
      helper: "Validated outputs ready for downstream workflows.",
      icon: CheckCircle2,
      toneClassName: "text-emerald-300",
    },
    {
      label: "Rejected signals",
      value: stats.rejected,
      helper: "Signals excluded from export and approval summaries.",
      icon: XCircle,
      toneClassName: "text-rose-300",
    },
    {
      label: "Extraction mode",
      value: systemStatus.extractionMode,
      helper: `System status: ${systemStatus.api}`,
      icon: Sparkles,
      toneClassName: "text-cyan-300",
    },
  ];

  return (
    <section className="dx-page">
      <header className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/90 via-slate-900/75 to-blue-950/50 px-6 py-6 shadow-[0_24px_60px_rgba(2,6,23,0.45)] md:px-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="dx-eyebrow">Overview</p>
            <h2 className="dx-title">Operations Dashboard</h2>
            <p className="dx-subtitle">
              Real-time overview of document intelligence, extraction quality, and review activity.
            </p>
          </div>
          <span className="inline-flex items-center rounded-full border border-blue-400/30 bg-blue-500/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-blue-200">
            Production workspace
          </span>
        </div>

        {hasBackendFailures ? (
          <div className="mt-5 rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            <p className="font-semibold">Backend connection unavailable</p>
            <p className="mt-1">Some dashboard data could not be loaded. Backend URL: {backendUrl}</p>
          </div>
        ) : null}
      </header>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {metricCards.map((card) => (
          <MetricCard key={card.label} {...card} />
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
        <section className="rounded-2xl border border-white/10 bg-slate-900/45 p-5 shadow-[0_20px_40px_rgba(2,6,23,0.35)]">
          <div className="mb-4 flex items-start justify-between gap-3 border-b border-white/10 pb-4">
            <div>
              <h3 className="text-lg font-semibold text-white">Recent activity</h3>
              <p className="mt-1 text-sm text-slate-400">
                Latest extraction runs with document status and signal output.
              </p>
            </div>
            <span className="dx-chip">{recentActivity.length} items</span>
          </div>

          {recentActivity.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-6 text-sm text-slate-300">
              No documents processed yet. Upload your first document to begin.
            </div>
          ) : (
            <div className="space-y-3">
              {recentActivity.map((item) => (
                <article
                  key={item.id}
                  className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 transition hover:-translate-y-0.5 hover:border-blue-400/30 hover:bg-white/[0.05]"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="truncate text-sm font-semibold text-white">{item.filename}</p>
                    <span className="dx-chip">{item.status}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-400">
                    <span className="inline-flex items-center gap-1">
                      <Clock3 className="h-3.5 w-3.5" />
                      {formatTimestamp(item.createdAt)}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <FileCheck2 className="h-3.5 w-3.5" />
                      {typeof item.signalCount === "number"
                        ? `${item.signalCount} signals`
                        : "Signals unavailable"}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-white/10 bg-slate-900/45 p-5 shadow-[0_20px_40px_rgba(2,6,23,0.35)]">
          <div className="mb-4 border-b border-white/10 pb-4">
            <h3 className="text-lg font-semibold text-white">System status</h3>
            <p className="mt-1 text-sm text-slate-400">
              Live readiness, infrastructure health, and extraction runtime details.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <StatusCard
              title="API status"
              value={systemStatus.api}
              detail={systemStatus.apiKeyConfigured ? "API key configured" : "API key missing"}
              health={systemStatus.api === "Operational" ? "healthy" : "degraded"}
            />
            <StatusCard
              title="Database status"
              value={systemStatus.database}
              detail={`Extraction runs: ${stats.extractionRuns}`}
              health={systemStatus.database === "ok" ? "healthy" : "degraded"}
            />
            <StatusCard
              title="Storage status"
              value={systemStatus.storage}
              detail="Persistent storage path"
              health={systemStatus.storage !== "Unavailable" ? "healthy" : "degraded"}
            />
            <StatusCard
              title="LLM / extraction mode"
              value={systemStatus.llm}
              detail={`Mode: ${systemStatus.extractionMode}`}
              health={systemStatus.llm !== "Unknown" ? "healthy" : "degraded"}
            />
          </div>
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
        <section className="rounded-2xl border border-white/10 bg-slate-900/45 p-5 shadow-[0_20px_40px_rgba(2,6,23,0.35)]">
          <div className="mb-4 border-b border-white/10 pb-4">
            <h3 className="text-lg font-semibold text-white">Extraction workflow</h3>
            <p className="mt-1 text-sm text-slate-400">
              End-to-end processing lifecycle from ingestion through export.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <WorkflowStep label="Upload" icon={CloudUpload} active />
            <Waypoints className="h-4 w-4 text-slate-500" />
            <WorkflowStep label="Extract" icon={ScanSearch} />
            <Waypoints className="h-4 w-4 text-slate-500" />
            <WorkflowStep label="Validate" icon={FileCheck2} />
            <Waypoints className="h-4 w-4 text-slate-500" />
            <WorkflowStep label="Review" icon={AlertCircle} />
            <Waypoints className="h-4 w-4 text-slate-500" />
            <WorkflowStep label="Export" icon={HardDrive} />
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-slate-900/45 p-5 shadow-[0_20px_40px_rgba(2,6,23,0.35)]">
          <div className="mb-4 border-b border-white/10 pb-4">
            <h3 className="text-lg font-semibold text-white">Quality overview</h3>
            <p className="mt-1 text-sm text-slate-400">
              Assurance pillars designed for investor and audit-grade reporting.
            </p>
          </div>

          <div className="space-y-3 text-sm">
            <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-slate-300">
              <p className="font-semibold text-white">Evidence-linked outputs</p>
              <p className="mt-1 text-slate-400">Each signal is tied back to source passages for explainability.</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-slate-300">
              <p className="font-semibold text-white">Human review workflow</p>
              <p className="mt-1 text-slate-400">Pending, approved, and rejected states support governance controls.</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-slate-300">
              <p className="font-semibold text-white">Confidence scoring</p>
              <p className="mt-1 text-slate-400">Confidence and validation statuses support risk-aware triage.</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-slate-300">
              <p className="font-semibold text-white">Export-ready structured data</p>
              <p className="mt-1 text-slate-400">Approved records are prepared for downstream operational systems.</p>
            </div>
          </div>
        </section>
      </div>

    </section>
  );
}
