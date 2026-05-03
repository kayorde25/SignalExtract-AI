export default function DashboardLoading() {
  return (
    <section className="dx-page">
      <div className="dx-skeleton h-10 w-64" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <div className="dx-skeleton h-40" />
        <div className="dx-skeleton h-40" />
        <div className="dx-skeleton h-40" />
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.25fr_0.95fr]">
        <div className="dx-skeleton h-72" />
        <div className="dx-skeleton h-72" />
      </div>
    </section>
  );
}
