"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";

import { DocumentTable } from "@/components/workspace/DocumentTable";
import { WorkspaceFilters } from "@/components/workspace/WorkspaceFilters";
import type { WorkspaceDocument } from "@/lib/api";

const toDayString = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

type WorkspaceOverviewClientProps = {
  documents: WorkspaceDocument[];
};

export function WorkspaceOverviewClient({
  documents,
}: WorkspaceOverviewClientProps) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [needsReview, setNeedsReview] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [isPending, startTransition] = useTransition();
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const rows = useMemo(
    () =>
      documents.map((document) => {
        return {
          documentId: document.documentId,
          filename: document.filename,
          createdAt: document.createdAt,
          extractionStatus: document.extractionStatus,
          signalCount: document.signalCount,
          approvedCount: document.approvedCount,
          rejectedCount: document.rejectedCount,
          needsReviewCount: document.needsReviewCount,
        };
      }),
    [documents]
  );

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const lower = search.toLowerCase();
      const matchesSearch =
        !lower ||
        row.filename.toLowerCase().includes(lower) ||
        row.documentId.toLowerCase().includes(lower);

      const matchesStatus =
        status === "all" || row.extractionStatus.toLowerCase() === status;

      const hasReview = row.needsReviewCount > 0;
      const matchesReview =
        needsReview === "all" ||
        (needsReview === "yes" && hasReview) ||
        (needsReview === "no" && !hasReview);

      const createdDay = toDayString(row.createdAt);
      const matchesFrom = !fromDate || (createdDay && createdDay >= fromDate);
      const matchesTo = !toDate || (createdDay && createdDay <= toDate);

      return (
        matchesSearch &&
        matchesStatus &&
        matchesReview &&
        matchesFrom &&
        matchesTo
      );
    });
  }, [rows, search, status, needsReview, fromDate, toDate]);

  const handleExtract = (documentId: string) => {
    setActionMessage(null);
    startTransition(async () => {
      try {
        const response = await fetch(
          `/api/documents/${documentId}/extract-signals`,
          {
            method: "POST",
          }
        );

        if (!response.ok) {
          throw new Error("Extraction request failed.");
        }

        setActionMessage("Signal extraction requested successfully.");
      } catch {
        setActionMessage("Unable to request extraction. Please try again.");
      }
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-white">Document Workspace</h1>
          <p className="mt-1 text-sm text-slate-400">
            Manage uploaded documents, extraction status, evidence, and exports.
          </p>
        </div>

        <Link href="/dashboard/documents" className="dx-button-primary">
          Upload new document
        </Link>
      </div>

      <WorkspaceFilters
        search={search}
        onSearchChange={setSearch}
        status={status}
        onStatusChange={setStatus}
        needsReview={needsReview}
        onNeedsReviewChange={setNeedsReview}
        fromDate={fromDate}
        onFromDateChange={setFromDate}
        toDate={toDate}
        onToDateChange={setToDate}
      />

      {actionMessage ? (
        <div className="rounded-xl border border-blue-400/25 bg-blue-500/10 px-4 py-2 text-sm text-blue-200">
          {actionMessage}
        </div>
      ) : null}

      {isPending ? (
        <div className="text-sm text-slate-400">Submitting extraction request...</div>
      ) : null}

      <DocumentTable documents={filteredRows} onExtract={handleExtract} />
    </div>
  );
}
