import Link from "next/link";
import {
  Activity, ArrowRight, ShieldCheck, GitMerge, UserCheck, FileJson,
  Upload, Sparkles, Search, CheckCheck, Download, Quote, Star,
} from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";

const SIGNAL_CHIPS = [
  "Findings", "Recommendations", "Actions", "Amounts", "Dates",
  "Organizations", "Medical codes", "Identifiers",
];

const FEATURES = [
  {
    icon: ShieldCheck,
    title: "Evidence on every signal",
    body: "Each extracted signal links back to a verbatim source span with offsets. No black-box outputs — claims that can't be grounded never survive review.",
  },
  {
    icon: GitMerge,
    title: "Hybrid by design",
    body: "Deterministic rules and LLM understanding, merged. If the model is offline or over quota, rule-based extraction still delivers. Never dependent on one path.",
  },
  {
    icon: UserCheck,
    title: "Human-in-the-loop",
    body: "Calibrated confidence routes uncertain signals to a fast approve, reject, or edit queue — so reviewers spend time only where it matters.",
  },
  {
    icon: FileJson,
    title: "Structured & exportable",
    body: "Typed signals with full provenance — document, page, span, method, confidence — exportable to JSON or CSV for any downstream system.",
  },
];

const PIPELINE = [
  { icon: Upload, label: "Ingest", note: "PDF · email · docx" },
  { icon: Sparkles, label: "Extract", note: "Rules + LLM" },
  { icon: Search, label: "Ground", note: "Verify evidence" },
  { icon: CheckCheck, label: "Review", note: "Approve / reject" },
  { icon: Download, label: "Export", note: "JSON · CSV" },
];

const METRICS = [
  { value: "16+", label: "Signal types" },
  { value: "3", label: "Extraction modes" },
  { value: "100%", label: "Source-linked" },
  { value: "0", label: "LLM lock-in" },
];

export default function Landing() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* ambient background */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-[-12rem] h-[34rem] w-[60rem] -translate-x-1/2 rounded-full bg-accent/20 blur-[120px] dark:bg-accent/15" />
        <div className="absolute inset-0 grid-faint opacity-[0.4] [mask-image:radial-gradient(60rem_40rem_at_50%_0%,black,transparent)]" />
      </div>

      {/* nav */}
      <header className="sticky top-0 z-20 border-b border-border/60 bg-bg/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent text-accent-contrast shadow-glow-sm">
              <Activity size={17} strokeWidth={2.4} />
            </span>
            <span className="text-sm font-semibold tracking-tight text-fg">SignalExtract</span>
          </div>
          <nav className="hidden items-center gap-7 text-sm text-muted md:flex">
            <a href="#features" className="transition-colors hover:text-fg">Features</a>
            <a href="#pipeline" className="transition-colors hover:text-fg">Pipeline</a>
            <Link href="/docs" className="transition-colors hover:text-fg">Docs</Link>
          </nav>
          <div className="flex items-center gap-2.5">
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

      {/* hero */}
      <section className="mx-auto max-w-6xl px-6 pb-20 pt-20 text-center md:pt-28">
        <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-border bg-surface/70 px-3 py-1 text-xs text-muted backdrop-blur">
          <span className="h-1.5 w-1.5 rounded-full bg-accent-2" />
          Evidence-grounded document intelligence
        </div>

        <h1 className="mx-auto mt-6 max-w-3xl text-balance text-4xl font-semibold leading-[1.07] tracking-tight text-fg md:text-6xl">
          Extract <span className="text-accent-2">meaning</span> from documents, not just text.
        </h1>

        <p className="mx-auto mt-5 max-w-2xl text-balance text-base leading-relaxed text-muted md:text-lg">
          SignalExtract turns inconsistent PDFs, emails, and reports into structured,
          evidence-linked signals — findings, recommendations, amounts, and more — with a
          hybrid engine and human review you can actually trust.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/dashboard"
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-accent px-5 text-sm font-medium text-accent-contrast shadow-glow transition-colors hover:bg-accent-2"
          >
            Launch the app <ArrowRight size={16} />
          </Link>
          <a
            href="#pipeline"
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-border bg-surface px-5 text-sm font-medium text-fg transition-colors hover:border-border-strong hover:bg-surface-2"
          >
            See the pipeline
          </a>
        </div>

        {/* extraction preview */}
        <div className="mx-auto mt-16 max-w-3xl text-left">
          <ExtractionPreview />
        </div>

        {/* chips */}
        <div className="mt-12">
          <p className="text-xs uppercase tracking-widest text-subtle">Extracts signals like</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {SIGNAL_CHIPS.map((c) => (
              <span key={c} className="rounded-full border border-border bg-surface/60 px-3 py-1 text-xs text-muted">
                {c}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* metrics band */}
      <section className="border-y border-border/60 bg-surface/30">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-px px-6 md:grid-cols-4">
          {METRICS.map((m) => (
            <div key={m.label} className="px-4 py-8 text-center">
              <div className="font-mono text-3xl font-semibold tracking-tight text-fg">{m.value}</div>
              <div className="mt-1 text-sm text-muted">{m.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* features */}
      <section id="features" className="mx-auto max-w-6xl px-6 py-24">
        <SectionHeading
          eyebrow="Built for messy, real-world text"
          title="Reliability that single-pass LLMs can't match"
          subtitle="Inconsistent formatting, ambiguous language, implied recommendations — handled by layering deterministic rules, LLM understanding, grounding, and review."
        />
        <div className="mt-12 grid gap-4 sm:grid-cols-2">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.title} className="card-surface group p-6 transition-colors hover:border-border-strong">
                <span className="grid h-11 w-11 place-items-center rounded-xl border border-border bg-surface-2 text-accent-2 transition-transform group-hover:scale-105">
                  <Icon size={20} />
                </span>
                <h3 className="mt-4 text-base font-semibold text-fg">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{f.body}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* pipeline */}
      <section id="pipeline" className="border-t border-border/60 bg-surface/30">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <SectionHeading
            eyebrow="How it works"
            title="Recall first, precision second"
            subtitle="Generate candidates broadly, then ground and verify strictly — the arc that turns inconsistent extraction into something you can ship."
          />
          <div className="mt-14 flex flex-col items-stretch gap-3 md:flex-row md:items-center">
            {PIPELINE.map((step, i) => {
              const Icon = step.icon;
              return (
                <div key={step.label} className="flex flex-1 items-center gap-3 md:flex-col md:gap-0">
                  <div className="card-surface flex w-full flex-col items-center gap-2 px-4 py-6 text-center">
                    <span className="grid h-11 w-11 place-items-center rounded-xl bg-accent/10 text-accent-2">
                      <Icon size={20} />
                    </span>
                    <div className="mt-1 text-sm font-semibold text-fg">{step.label}</div>
                    <div className="font-mono text-xs text-subtle">{step.note}</div>
                  </div>
                  {i < PIPELINE.length - 1 && (
                    <ArrowRight size={18} className="shrink-0 rotate-90 text-border-strong md:rotate-0" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* why / quote */}
      <section id="why" className="mx-auto max-w-6xl px-6 py-24">
        <div className="card-surface relative overflow-hidden p-10 md:p-14">
          <Quote size={48} className="absolute right-8 top-8 text-accent/15" />
          <div className="flex items-center gap-1 text-accent-2">
            {Array.from({ length: 5 }).map((_, i) => <Star key={i} size={15} fill="currentColor" />)}
          </div>
          <p className="mt-5 max-w-3xl text-xl font-medium leading-relaxed tracking-tight text-fg md:text-2xl">
            &ldquo;Rule-based was too brittle. Strict pipelines failed on variability. Basic LLM
            extraction was inconsistent. SignalExtract is the approach that works in
            practice — broad recall, grounded evidence, and review where it counts.&rdquo;
          </p>
          <p className="mt-6 text-sm text-muted">The problem this was built to solve.</p>
        </div>
      </section>

      {/* final CTA */}
      <section className="mx-auto max-w-6xl px-6 pb-28">
        <div className="card-surface relative overflow-hidden p-12 text-center md:p-16">
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-accent/10 blur-3xl" />
          <h2 className="relative text-3xl font-semibold tracking-tight text-fg md:text-4xl">
            Start extracting signals you can trust
          </h2>
          <p className="relative mx-auto mt-4 max-w-xl text-muted">
            Upload a document, run hybrid extraction, and review evidence-linked signals — in a
            workspace that looks as good as it works.
          </p>
          <Link
            href="/dashboard"
            className="relative mt-8 inline-flex h-12 items-center gap-2 rounded-xl bg-accent px-6 text-sm font-medium text-accent-contrast shadow-glow transition-colors hover:bg-accent-2"
          >
            Open the workspace <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* footer */}
      <footer className="border-t border-border/60">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 text-sm text-subtle sm:flex-row">
          <div className="flex items-center gap-2">
            <span className="grid h-6 w-6 place-items-center rounded-md bg-accent text-accent-contrast">
              <Activity size={13} strokeWidth={2.4} />
            </span>
            <span className="text-muted">SignalExtract AI</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-success" />
            Hybrid engine · v1.0.0
          </div>
        </div>
      </footer>
    </div>
  );
}

function SectionHeading({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="text-xs font-semibold uppercase tracking-widest text-accent-2">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight text-fg md:text-4xl">{title}</h2>
      <p className="mt-4 text-balance leading-relaxed text-muted">{subtitle}</p>
    </div>
  );
}

function ExtractionPreview() {
  return (
    <div className="card-surface overflow-hidden shadow-glow">
      <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-danger/60" />
        <span className="h-2.5 w-2.5 rounded-full bg-warning/60" />
        <span className="h-2.5 w-2.5 rounded-full bg-success/60" />
        <span className="ml-2 font-mono text-xs text-subtle">discharge_summary.pdf</span>
        <span className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-[11px] text-accent-2">
          <Sparkles size={11} /> Hybrid
        </span>
      </div>
      <div className="grid gap-0 md:grid-cols-2">
        {/* source */}
        <div className="border-b border-border p-5 text-sm leading-relaxed text-muted md:border-b-0 md:border-r">
          <p>
            Patient seen on{" "}
            <mark className="rounded bg-accent/20 px-0.5 text-accent-2">March 14, 2026</mark>.
            BP remains elevated;{" "}
            <mark className="rounded bg-accent/20 px-0.5 text-accent-2">recommend adjusting antihypertensive therapy</mark>.
            Follow-up with{" "}
            <mark className="rounded bg-accent/20 px-0.5 text-accent-2">Dr. Amaka Okafor</mark>{" "}
            in two weeks. Dx{" "}
            <mark className="rounded bg-accent/20 px-0.5 text-accent-2">E11.9</mark>.
          </p>
        </div>
        {/* signals */}
        <div className="space-y-2 p-5">
          <PreviewSignal type="Date" value="March 14, 2026" conf="0.92" />
          <PreviewSignal type="Recommendation" value="Adjust antihypertensive therapy" conf="0.88" />
          <PreviewSignal type="Person" value="Dr. Amaka Okafor" conf="0.99" />
          <PreviewSignal type="Medical code" value="E11.9" conf="0.99" />
        </div>
      </div>
    </div>
  );
}

function PreviewSignal({ type, value, conf }: { type: string; value: string; conf: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-surface-2/50 px-3 py-2">
      <span className="rounded-md border border-accent/25 bg-accent/10 px-1.5 py-0.5 text-[10px] font-medium text-accent-2">{type}</span>
      <span className="truncate font-mono text-xs text-fg">{value}</span>
      <span className="ml-auto flex items-center gap-1.5">
        <span className="h-1 w-8 overflow-hidden rounded-full bg-surface-2">
          <span className="block h-full rounded-full bg-success" style={{ width: `${parseFloat(conf) * 100}%` }} />
        </span>
        <span className="font-mono text-[10px] text-success">{conf}</span>
      </span>
    </div>
  );
}
