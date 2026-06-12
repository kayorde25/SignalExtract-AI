"use client";
import { useEffect, useMemo, useRef } from "react";
import { FileText, MousePointerClick } from "lucide-react";
import type { Signal } from "@/lib/api";
import { signalMeta } from "@/lib/signal-types";

/** Locate a [start,end] span for a signal within the source text. */
function locate(text: string, sig: Signal | null): [number, number] | null {
  if (!sig) return null;
  const lower = text.toLowerCase();
  const { char_offset_start: s, char_offset_end: e } = sig;
  if (typeof s === "number" && typeof e === "number" && e > s && e <= text.length) {
    return [s, e];
  }
  for (const needle of [sig.value, sig.evidence]) {
    if (!needle) continue;
    const i = lower.indexOf(needle.toLowerCase());
    if (i !== -1) return [i, i + needle.length];
  }
  return null;
}

interface Props {
  text: string | null;
  loading: boolean;
  selected: Signal | null;
}

export default function DocumentViewer({ text, loading, selected }: Props) {
  const markRef = useRef<HTMLElement>(null);

  const span = useMemo(() => (text ? locate(text, selected) : null), [text, selected]);

  useEffect(() => {
    if (span && markRef.current) {
      markRef.current.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }, [span, selected]);

  return (
    <div className="card-surface flex h-full flex-col overflow-hidden">
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-2.5">
        <span className="flex items-center gap-2 text-sm font-medium text-fg">
          <FileText size={15} className="text-subtle" /> The document
        </span>
        {selected ? (
          <SelectedChip selected={selected} located={!!span} />
        ) : (
          <span className="hidden items-center gap-1.5 text-xs text-subtle sm:flex">
            <MousePointerClick size={13} /> Click an item to find it
          </span>
        )}
      </div>

      <div className="min-h-[260px] flex-1 overflow-y-auto p-5">
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-3.5 skeleton rounded" style={{ width: `${70 + (i % 4) * 8}%` }} />)}
          </div>
        ) : !text ? (
          <p className="py-10 text-center text-sm text-subtle">We haven&apos;t read this file yet.</p>
        ) : (
          <p className="whitespace-pre-wrap font-mono text-[12.5px] leading-relaxed text-muted">
            {span ? (
              <>
                {text.slice(0, span[0])}
                <mark ref={markRef} className="rounded bg-accent/25 px-0.5 text-fg ring-1 ring-accent/40">
                  {text.slice(span[0], span[1])}
                </mark>
                {text.slice(span[1])}
              </>
            ) : (
              text
            )}
          </p>
        )}
      </div>

      {selected && !span && text && (
        <div className="border-t border-border px-4 py-2 text-xs text-warning">
          We couldn&apos;t point to the exact words for this one.
        </div>
      )}
    </div>
  );
}

function SelectedChip({ selected, located }: { selected: Signal; located: boolean }) {
  const Icon = signalMeta(selected.signal_type).icon;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/25 bg-accent/10 px-2 py-0.5 text-xs text-accent-2">
      <Icon size={12} />
      <span className="max-w-[160px] truncate font-mono">{selected.value}</span>
      {!located && <span className="text-warning">· not found</span>}
    </span>
  );
}
