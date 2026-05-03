type DocumentStatusBadgeProps = {
  status: string;
  kind?: "extraction" | "review";
};

const statusTheme = (status: string) => {
  const normalized = status.toLowerCase();

  if (["completed", "approved", "healthy", "ok"].includes(normalized)) {
    return "border-emerald-400/30 bg-emerald-500/10 text-emerald-200";
  }

  if (["failed", "rejected", "error"].includes(normalized)) {
    return "border-rose-400/30 bg-rose-500/10 text-rose-200";
  }

  if (["running", "pending", "needs_review", "needs review", "processing"].includes(normalized)) {
    return "border-amber-400/30 bg-amber-500/10 text-amber-200";
  }

  return "border-blue-400/30 bg-blue-500/10 text-blue-200";
};

const normalizeLabel = (status: string) =>
  status
    .replace(/_/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());

export function DocumentStatusBadge({
  status,
  kind = "extraction",
}: DocumentStatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${statusTheme(
        status
      )}`}
    >
      {kind === "review" ? `Review: ${normalizeLabel(status)}` : normalizeLabel(status)}
    </span>
  );
}
