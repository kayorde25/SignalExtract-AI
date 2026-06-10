"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Overview", icon: "◈" },
  { href: "/dashboard/documents", label: "Documents", icon: "⊟" },
];

export default function Sidebar() {
  const path = usePathname();
  return (
    <aside className="fixed inset-y-0 left-0 w-56 bg-slate-900 text-slate-100 flex flex-col z-20">
      <div className="px-5 py-5 border-b border-slate-700">
        <div className="text-lg font-bold tracking-tight text-white">SignalExtract</div>
        <div className="text-xs text-slate-400 mt-0.5">AI-powered extraction</div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
              path === item.href || (item.href !== "/dashboard" && path.startsWith(item.href))
                ? "bg-blue-600 text-white"
                : "text-slate-400 hover:bg-slate-800 hover:text-slate-100",
            )}
          >
            <span className="text-base">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="px-5 py-4 border-t border-slate-700 text-xs text-slate-500">
        v1.0.0 · SignalExtract AI
      </div>
    </aside>
  );
}
