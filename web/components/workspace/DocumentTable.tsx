"use client";

import Link from "next/link";

import { DocumentCard, WorkspaceRow } from "@/components/workspace/DocumentCard";
import { DocumentStatusBadge } from "@/components/workspace/DocumentStatusBadge";

type DocumentTableProps = {
  documents: WorkspaceRow[];
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

export function DocumentTable({ documents, onExtract }: DocumentTableProps) {
  if (documents.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-slate-900/45 px-5 py-8 text-sm text-slate-300">
        No documents yet. Upload your first document to begin extraction.
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-3 md:hidden">
        {documents.map((document) => (
          <DocumentCard
            key={document.documentId}
            document={document}
            onExtract={onExtract}
          />
        ))}
      </div>

      <div className="hidden overflow-x-auto rounded-2xl border border-white/10 bg-slate-900/45 md:block">
        <table className="min-w-full divide-y divide-white/10 text-sm">
          <thead className="bg-white/3 text-left text-slate-300">
            <tr>
              <th className="px-4 py-3 font-medium uppercase tracking-[0.14em] text-slate-400">Document</th>
              <th className="px-4 py-3 font-medium uppercase tracking-[0.14em] text-slate-400">Uploaded</th>
              <th className="px-4 py-3 font-medium uppercase tracking-[0.14em] text-slate-400">Status</th>
              <th className="px-4 py-3 font-medium uppercase tracking-[0.14em] text-slate-400">Signals</th>
              <th className="px-4 py-3 font-medium uppercase tracking-[0.14em] text-slate-400">Review</th>
              <th className="px-4 py-3 font-medium uppercase tracking-[0.14em] text-slate-400">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10 text-slate-200">
            {documents.map((document) => (
              <tr key={document.documentId} className="transition hover:bg-white/3">
                <td className="px-4 py-3">
                  <p className="font-semibold text-white">{document.filename}</p>
                  <p className="mt-1 text-xs text-slate-500">{document.documentId}</p>
                </td>
                <td className="px-4 py-3 text-slate-300">{formatTimestamp(document.createdAt)}</td>
                <td className="px-4 py-3">
                  <DocumentStatusBadge status={document.extractionStatus} />
                </td>
                <td className="px-4 py-3 text-slate-300">{document.signalCount}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    <DocumentStatusBadge status={`Needs ${document.needsReviewCount}`} kind="review" />
                    <DocumentStatusBadge status={`Approved ${document.approvedCount}`} kind="review" />
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1.5">
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
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
