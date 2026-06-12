"use client";
import { useEffect, useState, type ReactNode } from "react";
import { ShieldCheck, GitMerge, UserCheck, Gauge } from "lucide-react";
import CodeBlock from "@/components/docs/CodeBlock";
import { cn } from "@/lib/utils";

const TOC = [
  { id: "introduction", label: "Introduction" },
  { id: "quickstart", label: "Quick start" },
  { id: "concepts", label: "Core concepts" },
  { id: "modes", label: "Extraction modes" },
  { id: "signal-types", label: "Signal types" },
  { id: "pipeline", label: "How extraction works" },
  { id: "review", label: "Review workflow" },
  { id: "api", label: "API reference" },
  { id: "config", label: "Configuration" },
  { id: "faq", label: "FAQ" },
];

export default function DocsPage() {
  const [active, setActive] = useState("introduction");

  useEffect(() => {
    const ids = TOC.map((t) => t.id);
    let raf = 0;
    const update = () => {
      const offset = 130; // sticky header + breathing room
      let current = ids[0];
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= offset) current = id;
      }
      setActive(current);
    };
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); cancelAnimationFrame(raf); };
  }, []);

  return (
    <div className="mx-auto flex max-w-6xl gap-12 px-6 py-12">
      {/* TOC */}
      <aside className="sticky top-24 hidden h-[calc(100vh-8rem)] w-52 shrink-0 lg:block">
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-subtle">On this page</p>
        <nav className="space-y-0.5">
          {TOC.map((t) => (
            <a
              key={t.id}
              href={`#${t.id}`}
              className={cn(
                "block rounded-md border-l-2 px-3 py-1.5 text-sm transition-colors",
                active === t.id
                  ? "border-accent bg-surface-2/60 font-medium text-fg"
                  : "border-transparent text-muted hover:text-fg",
              )}
            >
              {t.label}
            </a>
          ))}
        </nav>
      </aside>

      {/* Content */}
      <article className="min-w-0 flex-1 pb-24">
        <Section id="introduction" title="Introduction" first>
          <P>
            <b className="text-fg">SignalExtract AI</b> turns messy, real-world documents — PDFs, emails,
            and reports — into structured, <b className="text-fg">evidence-linked signals</b>. Unlike a
            simple parser or a single LLM call, it layers deterministic rules, language-model understanding,
            evidence grounding, and human review to stay reliable on inconsistent, ambiguous text.
          </P>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {[
              { icon: ShieldCheck, t: "Evidence-grounded", d: "Every signal links to a verbatim source span." },
              { icon: GitMerge, t: "Hybrid engine", d: "Rules + LLM, merged — never dependent on one path." },
              { icon: UserCheck, t: "Human-in-the-loop", d: "Approve, reject, or edit with calibrated confidence." },
              { icon: Gauge, t: "Structured output", d: "Typed signals with provenance, JSON or CSV." },
            ].map((f) => (
              <div key={f.t} className="card-surface flex items-start gap-3 p-4">
                <f.icon size={18} className="mt-0.5 shrink-0 text-accent-2" />
                <div>
                  <p className="text-sm font-medium text-fg">{f.t}</p>
                  <p className="mt-0.5 text-xs text-muted">{f.d}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section id="quickstart" title="Quick start">
          <P>The full flow is: upload → extract text → extract signals → review → export. Every request
          includes your API key when key protection is enabled.</P>
          <CodeBlock label="bash">{`API=http://localhost:8000/api/v1
KEY="sk_cleanextract_internal_123456"

# 1. Upload a document
DOC=$(curl -s -X POST "$API/documents/upload" -H "x-api-key: $KEY" \\
  -F "file=@report.pdf" | jq -r .id)

# 2. Extract text, then signals
curl -s -X POST "$API/documents/$DOC/extract-text"    -H "x-api-key: $KEY"
curl -s -X POST "$API/documents/$DOC/extract-signals" -H "x-api-key: $KEY"

# 3. List the extracted signals
curl -s "$API/documents/$DOC/signals" -H "x-api-key: $KEY"`}</CodeBlock>
          <P>Or just use the workspace UI — upload from the Documents page, run extraction, and review
          signals visually.</P>
        </Section>

        <Section id="concepts" title="Core concepts">
          <H3>Signal</H3>
          <P>A single structured data point extracted from a document — a typed value with the evidence
          that supports it. Example: a <Code>recommendation</Code> with the verbatim sentence it came from.</P>
          <H3>Evidence grounding</H3>
          <P>Every signal carries a <Code>evidence</Code> span lifted verbatim from the source. If a model
          proposes a signal whose evidence can&apos;t be located in the text, it&apos;s discarded — this is
          the primary guard against hallucinations.</P>
          <H3>Confidence</H3>
          <P>A <Code>0.0–1.0</Code> score per signal. Signals at or above the <Code>REVIEW_THRESHOLD</Code>
          are treated as high-confidence; the rest are surfaced for closer review.</P>
        </Section>

        <Section id="modes" title="Extraction modes">
          <P>Set globally via <Code>EXTRACTION_MODE</Code>, or rely on the default. The mode controls how
          deterministic rules and the LLM combine.</P>
          <Table
            head={["Mode", "Behavior", "LLM dependency"]}
            rows={[
              ["rule_based", "Deterministic patterns only — fully offline.", "None"],
              ["hybrid (default)", "Union of rules + LLM, de-duplicated.", "Optional — falls back to rules"],
              ["llm", "LLM-first, falls back to rules if it returns nothing.", "Preferred"],
            ]}
          />
          <P>In <Code>hybrid</Code> and <Code>llm</Code>, if the LLM is unreachable or over quota the
          rule-based pass still returns results — extraction never hard-fails on the model.</P>
        </Section>

        <Section id="signal-types" title="Signal types">
          <P>Two families of signals are supported: precise <b className="text-fg">entities</b> and
          higher-order <b className="text-fg">claim-level</b> statements.</P>
          <H3>Entities</H3>
          <div className="flex flex-wrap gap-2">
            {["date", "amount", "percentage", "email", "phone", "url", "identifier", "measurement", "person_name", "organization", "location", "medical_code"].map((t) => (
              <span key={t} className="rounded-md border border-border bg-surface-2/60 px-2 py-1 font-mono text-xs text-muted">{t}</span>
            ))}
          </div>
          <H3>Claim-level</H3>
          <div className="flex flex-wrap gap-2">
            {["finding", "recommendation", "action", "key_statement"].map((t) => (
              <span key={t} className="rounded-md border border-accent/25 bg-accent/10 px-2 py-1 font-mono text-xs text-accent-2">{t}</span>
            ))}
          </div>
        </Section>

        <Section id="pipeline" title="How extraction works">
          <P>The engine is built around one principle: <b className="text-fg">recall first, precision
          second</b>. Generate candidate signals broadly, then ground and verify strictly.</P>
          <ol className="mt-4 space-y-2.5">
            {[
              ["Ingest", "Parse PDF / email / docx to text, preserving layout and character offsets."],
              ["Extract", "Rule anchors and the LLM each propose candidate signals (high recall)."],
              ["Ground", "Each candidate's evidence must be found in the source, or it's dropped."],
              ["Merge", "Duplicates across strategies are collapsed into one signal."],
              ["Review", "Confidence routes uncertain signals to a human approve / reject queue."],
              ["Export", "Approved signals leave as JSON or CSV with full provenance."],
            ].map(([t, d], i) => (
              <li key={t} className="flex gap-3">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-accent/10 font-mono text-xs text-accent-2">{i + 1}</span>
                <span className="text-sm text-muted"><b className="text-fg">{t}.</b> {d}</span>
              </li>
            ))}
          </ol>
        </Section>

        <Section id="review" title="Review workflow">
          <P>Each signal has a <Code>review_status</Code> that moves through human-in-the-loop states:</P>
          <Table
            head={["Status", "Meaning"]}
            rows={[
              ["pending", "Awaiting review (default after extraction)."],
              ["approved", "Confirmed correct — included in approved-only exports."],
              ["rejected", "Marked incorrect — excluded from approved exports."],
              ["edited", "Value corrected by a reviewer, then accepted."],
            ]}
          />
          <CodeBlock label="bash">{`curl -X PATCH "$API/signals/$SIGNAL_ID/review" \\
  -H "x-api-key: $KEY" -H "content-type: application/json" \\
  -d '{"review_status":"approved","reviewed_by":"analyst@org"}'`}</CodeBlock>
        </Section>

        <Section id="api" title="API reference">
          <P>All routes are under <Code>/api/v1</Code>. When <Code>REQUIRE_API_KEY</Code> is enabled, send
          your key in the <Code>x-api-key</Code> header.</P>
          <Table
            head={["Method", "Endpoint", "Purpose"]}
            rows={[
              ["GET", "/health · /ready", "Liveness and DB readiness"],
              ["GET", "/stats", "Aggregate metrics"],
              ["POST", "/documents/upload", "Upload a file (multipart)"],
              ["GET", "/documents", "List documents"],
              ["GET", "/documents/{id}", "Get one document"],
              ["DELETE", "/documents/{id}", "Delete a document"],
              ["POST", "/documents/{id}/extract-text", "Extract document text"],
              ["POST", "/documents/{id}/extract-signals", "Run signal extraction"],
              ["GET", "/documents/{id}/signals", "List signals (filterable)"],
              ["GET", "/documents/{id}/export.json", "Export signals as JSON"],
              ["GET", "/documents/{id}/export.csv", "Export signals as CSV"],
              ["PATCH", "/signals/{id}/review", "Approve / reject / edit a signal"],
            ]}
            mono
          />
        </Section>

        <Section id="config" title="Configuration">
          <P>Configured through environment variables (a <Code>.env</Code> file on the backend).</P>
          <CodeBlock label=".env">{`# Extraction
EXTRACTION_MODE=hybrid          # rule_based | hybrid | llm
REVIEW_THRESHOLD=0.6

# LLM provider (Ollama or Anthropic)
LLM_PROVIDER=ollama             # ollama | anthropic
LLM_ENDPOINT=http://localhost:11434
LLM_MODEL=llama3.1
LLM_API_KEY=                    # required for cloud / Anthropic

# Storage & limits
DATABASE_URL=sqlite:///./signalextract.db
MAX_UPLOAD_MB=20
ALLOWED_EXTENSIONS=.txt,.pdf,.docx,.eml

# Security
REQUIRE_API_KEY=true
API_KEY=replace-me`}</CodeBlock>
        </Section>

        <Section id="faq" title="FAQ">
          <H3>Does it depend on the LLM?</H3>
          <P>No. In <Code>hybrid</Code> mode the rule-based extractor always runs, so a down or rate-limited
          model degrades gracefully instead of failing.</P>
          <H3>Can I use a local model?</H3>
          <P>Yes — point <Code>LLM_PROVIDER=ollama</Code> at a local Ollama server, or at Ollama Cloud /
          Anthropic by setting the endpoint and key.</P>
          <H3>How are hallucinations prevented?</H3>
          <P>Evidence grounding: any signal whose evidence can&apos;t be matched back to the source text is
          discarded before it reaches review.</P>
        </Section>
      </article>
    </div>
  );
}

function Section({ id, title, children, first }: { id: string; title: string; children: ReactNode; first?: boolean }) {
  return (
    <section id={id} className={cn("scroll-mt-24", !first && "mt-14 border-t border-border/60 pt-14")}>
      <h2 className="text-2xl font-semibold tracking-tight text-fg">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}
function H3({ children }: { children: ReactNode }) {
  return <h3 className="mb-2 mt-6 text-base font-semibold text-fg">{children}</h3>;
}
function P({ children }: { children: ReactNode }) {
  return <p className="mt-3 text-[15px] leading-relaxed text-muted">{children}</p>;
}
function Code({ children }: { children: ReactNode }) {
  return <code className="rounded border border-border bg-surface-2 px-1.5 py-0.5 font-mono text-[12.5px] text-accent-2">{children}</code>;
}
function Table({ head, rows, mono }: { head: string[]; rows: string[][]; mono?: boolean }) {
  return (
    <div className="card-surface mt-4 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-subtle">
            {head.map((h) => <th key={h} className="px-4 py-2.5 font-medium">{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-border/60 last:border-0">
              {r.map((c, j) => (
                <td key={j} className={cn("px-4 py-2.5 align-top", j === 0 ? "text-fg" : "text-muted", mono && j < 2 && "font-mono text-xs")}>{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
