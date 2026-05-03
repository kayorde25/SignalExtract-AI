import Link from "next/link";

import { WorkspaceDocumentDetailClient } from "@/components/workspace/WorkspaceDocumentDetailClient";
import type { WorkspaceSignal } from "@/components/workspace/SignalTable";
import { getSignalsByDocument, getWorkspaceHistorySnapshot } from "@/lib/api";

type DetailPageProps = {
  params: Promise<{ documentId: string }>;
};

export const dynamic = "force-dynamic";

export default async function WorkspaceDocumentPage({ params }: DetailPageProps) {
  const { documentId } = await params;

  let filename = "Untitled document";
  let createdAt = new Date(0).toISOString();
  let extractionStatus = "not_started";
  let signalCount = 0;
  let needsReviewCount = 0;
  let approvedCount = 0;
  let rejectedCount = 0;
  let signals: WorkspaceSignal[] = [];
  let runs: Awaited<ReturnType<typeof getWorkspaceHistorySnapshot>>["runs"] = [];
  let isMissing = false;
  let errorMessage: string | null = null;

  try {
    const [historySnapshot, signalRecords] = await Promise.all([
      getWorkspaceHistorySnapshot(),
      getSignalsByDocument(documentId),
    ]);

    const document = historySnapshot.documents.find(
      (item) => item.documentId === documentId
    );
    if (!document) {
      isMissing = true;
    } else {
      filename = document.filename;
      createdAt = document.createdAt;
      extractionStatus = document.extractionStatus;
      signalCount = document.signalCount;
      needsReviewCount = document.needsReviewCount;
      approvedCount = document.approvedCount;
      rejectedCount = document.rejectedCount;
    }

    signals = signalRecords.map((signal, index) => ({
      signalId: `${documentId}-${index + 1}`,
      signalType: signal.signalType || "unknown",
      signalText: signal.signalText || "",
      evidenceText: signal.evidenceText || "",
      confidence: signal.confidence,
      paragraphId: signal.paragraphId,
      sourcePage: signal.sourcePage,
      sourceSection: signal.sourceSection,
      explicitness: signal.explicitness,
      validationStatus: signal.validationStatus,
      reviewStatus: signal.reviewStatus,
      needsReview: signal.needsReview,
    }));

    runs = historySnapshot.runs;
  } catch (error) {
    errorMessage =
      error instanceof Error ? error.message : "Unexpected server error.";
  }

  if (errorMessage) {
    return (
      <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 p-5 text-rose-200">
        <p className="text-base font-semibold">Unable to load document workspace.</p>
        <p className="mt-2 text-sm">{errorMessage}</p>
      </div>
    );
  }

  if (isMissing) {
    return (
      <div className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-5 text-amber-100">
        <p className="text-base font-semibold">Document not found in workspace history.</p>
        <Link
          href="/dashboard/workspace"
          className="mt-3 inline-flex text-sm text-amber-200 underline-offset-4 hover:underline"
        >
          Return to workspace
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Link
        href="/dashboard/workspace"
        className="inline-flex text-sm text-slate-400 transition hover:text-slate-100"
      >
        Back to workspace
      </Link>

      <WorkspaceDocumentDetailClient
        documentId={documentId}
        filename={filename}
        createdAt={createdAt}
        extractionStatus={extractionStatus}
        signalCount={signalCount}
        needsReviewCount={needsReviewCount}
        approvedCount={approvedCount}
        rejectedCount={rejectedCount}
        signals={signals}
        runs={runs}
      />
    </div>
  );
}
