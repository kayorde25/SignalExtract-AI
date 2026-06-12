"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, FileText, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/documents", label: "My files", icon: FileText, exact: false },
];

export default function Sidebar() {
  const path = usePathname();
  return (
    <aside className="fixed inset-y-0 left-0 z-20 flex w-60 flex-col border-r border-border bg-surface/60 backdrop-blur-xl">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent text-accent-contrast shadow-glow-sm">
          <Activity size={18} strokeWidth={2.4} />
        </span>
        <div className="leading-tight">
          <div className="text-sm font-semibold tracking-tight text-fg">SignalExtract</div>
          <div className="text-[11px] text-subtle">AI extraction</div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-3">
        <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-widest text-subtle">Menu</p>
        {NAV.map((item) => {
          const active = item.exact ? path === item.href : path.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                active ? "bg-surface-2 text-fg" : "text-muted hover:bg-surface-2/60 hover:text-fg",
              )}
            >
              {active && (
                <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-accent" />
              )}
              <Icon size={17} className={cn("transition-colors", active ? "text-accent-2" : "text-subtle group-hover:text-fg")} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-5 py-4 text-[11px] text-subtle">
        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-success" />
          v1.0.0 · Hybrid engine
        </div>
      </div>
    </aside>
  );
}
