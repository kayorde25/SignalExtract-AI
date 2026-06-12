import Link from "next/link";
import { Activity, ArrowRight, BookOpen } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-border/60 bg-bg/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2.5">
            <Link href="/" className="flex items-center gap-2.5">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent text-accent-contrast shadow-glow-sm">
                <Activity size={17} strokeWidth={2.4} />
              </span>
              <span className="text-sm font-semibold tracking-tight text-fg">SignalExtract</span>
            </Link>
            <span className="ml-1 inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-2 px-2 py-0.5 text-[11px] text-muted">
              <BookOpen size={11} /> Docs
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <Link href="/" className="hidden text-sm text-muted transition-colors hover:text-fg sm:block">Home</Link>
            <ThemeToggle />
            <Link
              href="/dashboard"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-accent px-3.5 text-sm font-medium text-accent-contrast shadow-glow-sm transition-colors hover:bg-accent-2"
            >
              Open app <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
