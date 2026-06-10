"use client";
import { useEffect, useState } from "react";
import KPICard from "@/components/dashboard/KPICard";
import Spinner from "@/components/ui/Spinner";
import { api, type Stats } from "@/lib/api";
import { pct, fmt } from "@/lib/utils";

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.stats()
      .then(setStats)
      .catch((e: Error) => setError(e.message));
  }, []);

  if (error) return (
    <div className="text-red-500 bg-red-50 border border-red-200 rounded-xl p-4 text-sm">
      Could not reach backend: {error}
    </div>
  );

  if (!stats) return (
    <div className="flex items-center gap-2 text-slate-500">
      <Spinner /> <span>Loading stats…</span>
    </div>
  );

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Overview</h1>
        <p className="text-slate-500 mt-1">Real-time extraction metrics across all documents</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KPICard label="Total Documents" value={fmt(stats.total_documents)} color="slate" />
        <KPICard label="Total Signals" value={fmt(stats.total_signals)} color="blue" />
        <KPICard label="Approved Signals" value={fmt(stats.approved_signals)} color="green"
          sub={stats.total_signals ? `${pct(stats.approval_rate)} approval rate` : undefined} />
        <KPICard label="Avg Confidence" value={pct(stats.avg_confidence)} color="amber" />
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <KPICard label="Pending Review" value={fmt(stats.pending_signals)} color="amber" />
        <KPICard label="Rejected" value={fmt(stats.rejected_signals)} />
        <KPICard label="Docs Completed" value={fmt(stats.documents_done)} color="green"
          sub={stats.total_documents ? `of ${fmt(stats.total_documents)} total` : undefined} />
      </div>

      {stats.total_documents === 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 text-center">
          <p className="text-blue-700 font-medium">No documents yet</p>
          <p className="text-blue-500 text-sm mt-1">
            Go to <a href="/dashboard/documents" className="underline font-semibold">Documents</a> to upload your first file.
          </p>
        </div>
      )}
    </div>
  );
}
