"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { FileText, Activity, CheckCircle2, Gauge, ArrowUpRight, AlertCircle } from "lucide-react";
import KPICard from "@/components/dashboard/KPICard";
import Donut from "@/components/dashboard/Donut";
import PageHeader from "@/components/PageHeader";
import { api, type Stats } from "@/lib/api";
import { pct, fmt } from "@/lib/utils";

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.stats().then(setStats).catch((e: Error) => setError(e.message));
  }, []);

  if (error)
    return (
      <div className="flex items-center gap-3 rounded-xl border border-danger/30 bg-danger/10 p-4 text-sm text-danger">
        <AlertCircle size={18} /> Could not reach backend: {error}
      </div>
    );

  if (!stats)
    return (
      <div>
        <div className="mb-7 h-12 w-64 skeleton rounded-lg" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-28 skeleton rounded-2xl" />)}
        </div>
      </div>
    );

  const reviewed = stats.approved_signals + stats.rejected_signals;
  return (
    <div>
      <PageHeader
        title="Home"
        subtitle="A quick look at your files and what we found."
        actions={
          <Link href="/dashboard/documents">
            <span className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-accent px-4 text-sm font-medium text-accent-contrast shadow-glow-sm transition-colors hover:bg-accent-2">
              Add a file <ArrowUpRight size={15} />
            </span>
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KPICard label="Files" value={fmt(stats.total_documents)} color="slate" icon={FileText}
          sub={`${fmt(stats.documents_done)} scanned`} />
        <KPICard label="Things found" value={fmt(stats.total_signals)} color="blue" icon={Activity} />
        <KPICard label="Marked right" value={fmt(stats.approved_signals)} color="green" icon={CheckCircle2}
          sub={stats.total_signals ? `${pct(stats.approval_rate)} of all items` : undefined} />
        <KPICard label="Avg. how sure" value={pct(stats.avg_confidence)} color="amber" icon={Gauge} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="card-surface p-6 lg:col-span-3">
          <h2 className="text-sm font-semibold text-fg">What&apos;s been checked</h2>
          <p className="mb-5 text-xs text-subtle">How many items you&apos;ve marked right, wrong, or not yet</p>
          <Donut
            centerLabel={fmt(stats.total_signals)}
            centerSub="found"
            segments={[
              { label: "Right", value: stats.approved_signals, color: "rgb(var(--success))" },
              { label: "Not checked", value: stats.pending_signals, color: "rgb(var(--warning))" },
              { label: "Wrong", value: stats.rejected_signals, color: "rgb(var(--danger))" },
            ]}
          />
        </div>

        <div className="card-surface flex flex-col justify-between p-6 lg:col-span-2">
          <div>
            <h2 className="text-sm font-semibold text-fg">Your progress</h2>
            <p className="mb-5 text-xs text-subtle">How far you&apos;ve got</p>
          </div>
          <div className="space-y-5">
            <MiniStat label="Items checked" value={`${fmt(reviewed)} / ${fmt(stats.total_signals)}`}
              ratio={stats.total_signals ? reviewed / stats.total_signals : 0} />
            <MiniStat label="Files done" value={`${fmt(stats.documents_done)} / ${fmt(stats.total_documents)}`}
              ratio={stats.total_documents ? stats.documents_done / stats.total_documents : 0} />
            <MiniStat label="Marked right" value={pct(stats.approval_rate)} ratio={stats.approval_rate} />
          </div>
        </div>
      </div>

      {stats.total_documents === 0 && (
        <div className="mt-4 flex flex-col items-center rounded-2xl border border-dashed border-border bg-surface/50 p-10 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-xl bg-accent/10 text-accent-2">
            <FileText size={22} />
          </span>
          <p className="mt-4 font-medium text-fg">No files yet</p>
          <p className="mt-1 text-sm text-muted">
            Go to <Link href="/dashboard/documents" className="font-medium text-accent-2 hover:underline">My files</Link> to add your first one.
          </p>
        </div>
      )}
    </div>
  );
}

function MiniStat({ label, value, ratio }: { label: string; value: string; ratio: number }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="text-muted">{label}</span>
        <span className="font-mono font-medium tabular-nums text-fg">{value}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
        <div className="h-full rounded-full bg-accent transition-all duration-700"
          style={{ width: `${Math.min(100, Math.max(2, ratio * 100))}%` }} />
      </div>
    </div>
  );
}
