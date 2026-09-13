import Link from "next/link";
import { Activity, ArrowRight } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import UploadDropzone from "@/components/chat/UploadDropzone";

export default function Landing() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden">
      {/* ambient glow */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-[-10rem] h-[32rem] w-[56rem] -translate-x-1/2 rounded-full bg-accent/15 blur-[120px]" />
        <div className="absolute inset-0 grid-faint opacity-[0.28] [mask-image:radial-gradient(50rem_28rem_at_50%_0%,black,transparent)]" />
      </div>

      {/* nav */}
      <header className="sticky top-0 z-20 border-b border-border/50 bg-bg/70 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-accent text-accent-contrast shadow-glow-sm">
              <Activity size={14} strokeWidth={2.4} />
            </span>
            <span className="text-sm font-semibold text-fg">SignalExtract AI</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link
              href="/docs"
              className="inline-flex h-8 items-center px-3 rounded-lg text-sm text-muted transition-colors hover:text-fg"
            >
              Docs
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-surface px-3 text-sm text-fg transition-colors hover:bg-surface-2"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </header>

      {/* hero */}
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center px-6 py-20 text-center">
        <div className="animate-fade-in">
          <h1 className="text-4xl font-semibold tracking-tight text-fg md:text-5xl">
            SignalExtract AI
          </h1>
          <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-muted md:text-lg">
            Upload documents and extract intelligence through conversation.
          </p>
        </div>

        {/* drop zone */}
        <div className="mt-10 w-full animate-slide-up">
          <UploadDropzone />
        </div>

        {/* CTAs */}
        <div
          className="mt-6 flex flex-wrap items-center justify-center gap-3 animate-slide-up"
          style={{ animationDelay: "60ms" }}
        >
          <Link
            href="/workspace"
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-accent px-5 text-sm font-medium text-accent-contrast shadow-glow transition-colors hover:bg-accent-2"
          >
            Open Workspace <ArrowRight size={14} />
          </Link>
          <Link
            href="/documents"
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-surface px-5 text-sm font-medium text-fg transition-colors hover:bg-surface-2"
          >
            Browse Documents
          </Link>
        </div>

        <p
          className="mt-8 text-xs text-subtle animate-fade-in"
          style={{ animationDelay: "120ms" }}
        >
          Accepts PDF · DOCX · TXT · EML · CSV
        </p>
      </main>

      {/* footer */}
      <footer className="shrink-0 border-t border-border/40 py-5">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 text-xs text-subtle">
          <span>SignalExtract AI</span>
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-success" />
            Hybrid engine · v1.0.0
          </div>
        </div>
      </footer>
    </div>
  );
}
