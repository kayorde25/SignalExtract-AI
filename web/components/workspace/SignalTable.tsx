"use client";
import { useState } from "react";
import type { Signal, ReviewBody } from "@/lib/api";
import { api } from "@/lib/api";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { cn, pct } from "@/lib/utils";

interface Props {
  signals: Signal[];
  onChanged: () => void;
}

const TYPE_ICON: Record<string, string> = {
  date: "📅", amount: "💵", percentage: "📊", email: "✉️",
  phone: "📞", url: "🔗", identifier: "🏷️", measurement: "📏",
  person_name: "👤", organization: "🏢", location: "📍", other: "◆",
};

export default function SignalTable({ signals, onChanged }: Props) {
  const [loading, setLoading] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const types = Array.from(new Set(signals.map((s) => s.signal_type))).sort();

  const filtered = signals.filter((s) => {
    if (filterType && s.signal_type !== filterType) return false;
    if (filterStatus && s.review_status !== filterStatus) return false;
    return true;
  });

  async function review(signal: Signal, body: ReviewBody) {
    setLoading(signal.id);
    try {
      await api.signals.review(signal.id, body);
      onChanged();
    } finally {
      setLoading(null);
    }
  }

  return (
    <div>
      {/* Filters */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="text-sm border border-slate-300 rounded-lg px-3 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All types</option>
          {types.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="text-sm border border-slate-300 rounded-lg px-3 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All statuses</option>
          {["pending", "approved", "rejected", "edited"].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <span className="text-sm text-slate-500 self-center ml-auto">{filtered.length} signal{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wider">
            <tr>
              <th className="px-4 py-3 text-left">Type</th>
              <th className="px-4 py-3 text-left">Value</th>
              <th className="px-4 py-3 text-left">Evidence</th>
              <th className="px-4 py-3 text-center">Confidence</th>
              <th className="px-4 py-3 text-center">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No signals found</td></tr>
            )}
            {filtered.map((sig) => (
              <tr key={sig.id} className={cn("hover:bg-slate-50 transition-colors", loading === sig.id && "opacity-50")}>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className="mr-1">{TYPE_ICON[sig.signal_type] ?? "◆"}</span>
                  <span className="text-slate-600">{sig.signal_type}</span>
                </td>
                <td className="px-4 py-3 max-w-[180px]">
                  {editId === sig.id ? (
                    <input
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="w-full border border-blue-400 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  ) : (
                    <span className="font-medium text-slate-800 break-all">{sig.value}</span>
                  )}
                </td>
                <td className="px-4 py-3 max-w-[260px]">
                  <span className="text-slate-400 text-xs line-clamp-2" title={sig.evidence}>{sig.evidence}</span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={cn("font-semibold text-xs",
                    sig.confidence >= 0.9 ? "text-green-600" :
                    sig.confidence >= 0.7 ? "text-amber-600" : "text-red-500"
                  )}>
                    {pct(sig.confidence)}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <Badge status={sig.review_status} />
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex gap-1 justify-end">
                    {editId === sig.id ? (
                      <>
                        <Button size="sm" variant="success"
                          loading={loading === sig.id}
                          onClick={() => { review(sig, { review_status: "edited", edited_value: editValue }); setEditId(null); }}>
                          Save
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditId(null)}>Cancel</Button>
                      </>
                    ) : (
                      <>
                        {sig.review_status !== "approved" && (
                          <Button size="sm" variant="success" loading={loading === sig.id}
                            onClick={() => review(sig, { review_status: "approved" })}>✓</Button>
                        )}
                        {sig.review_status !== "rejected" && (
                          <Button size="sm" variant="danger" loading={loading === sig.id}
                            onClick={() => review(sig, { review_status: "rejected" })}>✗</Button>
                        )}
                        <Button size="sm" variant="ghost"
                          onClick={() => { setEditId(sig.id); setEditValue(sig.value); }}>✎</Button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
