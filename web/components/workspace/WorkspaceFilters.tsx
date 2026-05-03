"use client";

type WorkspaceFiltersProps = {
  search: string;
  onSearchChange: (value: string) => void;
  status: string;
  onStatusChange: (value: string) => void;
  needsReview: string;
  onNeedsReviewChange: (value: string) => void;
  fromDate: string;
  onFromDateChange: (value: string) => void;
  toDate: string;
  onToDateChange: (value: string) => void;
};

export function WorkspaceFilters({
  search,
  onSearchChange,
  status,
  onStatusChange,
  needsReview,
  onNeedsReviewChange,
  fromDate,
  onFromDateChange,
  toDate,
  onToDateChange,
}: WorkspaceFiltersProps) {
  return (
    <section className="rounded-2xl border border-white/10 bg-slate-900/45 p-4 shadow-[0_14px_30px_rgba(2,6,23,0.28)]">
      <div className="grid gap-3 lg:grid-cols-[2fr_1fr_1fr_1fr_1fr]">
        <input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search document name or ID"
          className="dx-input"
        />

        <select
          value={status}
          onChange={(event) => onStatusChange(event.target.value)}
          aria-label="Filter by extraction status"
          title="Filter by extraction status"
          className="dx-input"
        >
          <option value="all">All statuses</option>
          <option value="completed">Completed</option>
          <option value="running">Running</option>
          <option value="failed">Failed</option>
          <option value="not_started">Not started</option>
        </select>

        <select
          value={needsReview}
          onChange={(event) => onNeedsReviewChange(event.target.value)}
          aria-label="Filter by review requirement"
          title="Filter by review requirement"
          className="dx-input"
        >
          <option value="all">All review states</option>
          <option value="yes">Needs review</option>
          <option value="no">No review needed</option>
        </select>

        <input
          type="date"
          value={fromDate}
          onChange={(event) => onFromDateChange(event.target.value)}
          aria-label="Filter from date"
          title="Filter from date"
          className="dx-input"
        />

        <input
          type="date"
          value={toDate}
          onChange={(event) => onToDateChange(event.target.value)}
          aria-label="Filter to date"
          title="Filter to date"
          className="dx-input"
        />
      </div>
    </section>
  );
}
