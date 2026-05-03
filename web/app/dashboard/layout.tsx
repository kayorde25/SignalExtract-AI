import Link from "next/link";
import { ReactNode } from "react";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard/workspace", label: "Workspace" },
  { href: "/dashboard/documents", label: "Documents" },
  { href: "/dashboard/review", label: "Review" },
  { href: "/dashboard/settings", label: "Settings" },
];

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden text-slate-100">
      <div className="dx-ambient-orb pointer-events-none absolute left-[-4rem] top-16 h-40 w-40 rounded-full bg-blue-500/10 blur-3xl" />
      <div className="dx-ambient-orb pointer-events-none absolute right-[-2rem] top-52 h-52 w-52 rounded-full bg-emerald-500/10 blur-3xl" />

      <div className="mx-auto grid min-h-screen w-full max-w-[1440px] grid-cols-1 md:grid-cols-[280px_1fr]">
        <aside className="border-b border-white/5 bg-[rgba(17,24,39,0.82)] px-6 py-7 backdrop-blur-xl md:border-b-0 md:border-r">
          <div className="space-y-3">
            <span className="dx-chip dx-chip-primary">Premium Workspace</span>
            <div>
              <p className="dx-eyebrow">DocExtract</p>
              <h1 className="mt-2 text-2xl font-bold text-white">Evidence-linked extraction</h1>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Review documents, audit signals, and operate the platform from one consistent command surface.
              </p>
            </div>
          </div>

          <nav className="mt-8 space-y-2">
            {links.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="dx-nav-link"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="dx-card mt-10 space-y-4 p-5">
            <div>
              <p className="text-sm font-semibold text-white">Operational health</p>
              <p className="mt-1 text-sm leading-6 text-slate-400">Keep ingestion and review moving with a clean workflow and visible priorities.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="dx-chip dx-chip-primary">Secure API proxy</span>
              <span className="dx-chip dx-chip-accent">Public dashboard</span>
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-col">
          <header className="dx-topbar">
            <div>
              <p className="text-sm font-medium text-white">Investor-grade control center</p>
              <p className="mt-1 text-sm text-slate-400">Dark, minimal SaaS interface tuned for document operations and signal review.</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="dx-chip">Live workspace</span>
              <Link href="/dashboard/documents" className="dx-button-primary">
                Upload document
              </Link>
            </div>
          </header>

          <main className="px-6 py-8 md:px-8 md:py-10">{children}</main>
        </div>
      </div>
    </div>
  );
}
