import Link from "next/link";

import { DocumentStatusBadge } from "@/components/workspace/DocumentStatusBadge";

export type WorkspaceRow = {
  documentId: string;
  filename: string;
  createdAt: string;
  extractionStatus: string;
  signalCount: number;
  needsReviewCount: number;
  approvedCount: number;
  rejectedCount: number;
};

type DocumentCardProps = {
  document: WorkspaceRow;
  onExtract: (documentId: string) => void;
};

const formatTimestamp = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown time";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
};

export function DocumentCard({ document, onExtract }: DocumentCardProps) {
  return (
    <article className="rounded-2xl border border-white/10 bg-slate-900/45 p-4 shadow-[0_14px_28px_rgba(2,6,23,0.3)] transition hover:-translate-y-0.5 hover:border-blue-400/35 hover:bg-slate-900/60">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-white">{document.filename}</p>
          <p className="mt-1 text-xs text-slate-500">{document.documentId}</p>
        </div>
        <DocumentStatusBadge status={document.extractionStatus} />
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <span className="dx-chip">{document.signalCount} signals</span>
        <span className="dx-chip">Needs review {document.needsReviewCount}</span>
        <span className="dx-chip">Approved {document.approvedCount}</span>
        <span className="dx-chip">Rejected {document.rejectedCount}</span>
      </div>

      <p className="mt-3 text-xs text-slate-400">Uploaded {formatTimestamp(document.createdAt)}</p>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link href={`/dashboard/workspace/${document.documentId}`} className="dx-button-secondary">
          Open
        </Link>
        <button
          type="button"
          className="dx-button-secondary"
          onClick={() => onExtract(document.documentId)}
        >
          Extract
        </button>
        <Link href="/dashboard/review" className="dx-button-secondary">
          Review
        </Link>
        <Link href={`/dashboard/workspace/${document.documentId}`} className="dx-button-secondary">
          Export
        </Link>
      </div>
    </article>
  );
}
