export default function SettingsPage() {
  return (
    <section className="dx-page">
      <header className="dx-page-header">
        <p className="dx-eyebrow">Settings</p>
        <h2 className="dx-title">Workspace settings</h2>
        <p className="dx-subtitle">Configuration, policy, and workflow controls can plug into the same premium dashboard shell without introducing visual drift.</p>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <article className="dx-card dx-card-hover">
          <p className="text-lg font-semibold text-white">System controls</p>
          <p className="mt-2 text-sm leading-6 text-slate-400">Connect environment, governance, and review workflows here with the same card and spacing standards used elsewhere.</p>
        </article>

        <article className="dx-card dx-card-hover">
          <p className="text-lg font-semibold text-white">Design system status</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="dx-chip dx-chip-primary">Dark modern UI</span>
            <span className="dx-chip dx-chip-accent">Consistent spacing</span>
          </div>
        </article>
      </div>
    </section>
  );
}
