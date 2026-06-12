"use client";
import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import ThemeToggle from "@/components/ThemeToggle";

export default function Topbar() {
  const [ok, setOk] = useState<boolean | null>(null);

  useEffect(() => {
    let alive = true;
    const ping = () => api.health().then(() => alive && setOk(true)).catch(() => alive && setOk(false));
    ping();
    const t = setInterval(ping, 15000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  const label = ok === null ? "Connecting" : ok ? "API connected" : "API offline";
  const tone = ok === null ? "bg-warning" : ok ? "bg-success" : "bg-danger";

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-border bg-bg/70 px-8 backdrop-blur-xl">
      <button
        onClick={() => window.dispatchEvent(new Event("open-command-palette"))}
        className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-subtle transition-colors hover:border-border-strong hover:text-muted"
      >
        <Search size={14} />
        <span className="hidden sm:inline">Search…</span>
        <kbd className="rounded border border-border bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] text-muted">⌘K</kbd>
      </button>
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-xs text-muted">
          <span className={cn("h-1.5 w-1.5 rounded-full", tone, ok === null && "animate-pulse")} />
          {label}
        </span>
        <ThemeToggle />
      </div>
    </header>
  );
}
