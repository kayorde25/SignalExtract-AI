import { WorkspaceOverviewClient } from "@/components/workspace/WorkspaceOverviewClient";
import { getWorkspaceHistorySnapshot, WorkspaceDocument } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function WorkspacePage() {
  let documents: WorkspaceDocument[] = [];
  let errorMessage: string | null = null;

  try {
    const snapshot = await getWorkspaceHistorySnapshot();
    documents = snapshot.documents;
  } catch (error) {
    errorMessage =
      error instanceof Error ? error.message : "Unexpected server error.";
  }

  if (errorMessage) {
    return (
      <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 p-5 text-rose-200">
        <p className="text-base font-semibold">Unable to load workspace.</p>
        <p className="mt-2 text-sm">{errorMessage}</p>
      </div>
    );
  }

  return <WorkspaceOverviewClient documents={documents} />;
}
