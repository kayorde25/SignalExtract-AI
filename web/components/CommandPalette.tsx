"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search, LayoutDashboard, FileText, Upload, Home, Sun, Moon,
  CornerDownLeft, FileSearch, BookOpen, type LucideIcon,
} from "lucide-react";
import { api, type Doc } from "@/lib/api";
import { cn, friendlyStatus } from "@/lib/utils";

interface Command {
  id: string;
  group: string;
  label: string;
  sub?: string;
  icon: LucideIcon;
  keywords?: string;
  run: () => void;
}

const GROUP_ORDER = ["Go to", "Actions", "Files"];

export default function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [docs, setDocs] = useState<Doc[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => { setOpen(false); setQuery(""); setActive(0); }, []);

  const toggleTheme = useCallback(() => {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    try { localStorage.setItem("theme", next ? "dark" : "light"); } catch {}
  }, []);

  // Global open shortcut + custom event from the topbar button
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("open-command-palette", onOpen as EventListener);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("open-command-palette", onOpen as EventListener);
    };
  }, []);

  // On open: focus input + load documents
  useEffect(() => {
    if (!open) return;
    setActive(0);
    const t = setTimeout(() => inputRef.current?.focus(), 20);
    api.documents.list(0, 50).then((r) => setDocs(r.items)).catch(() => {});
    return () => clearTimeout(t);
  }, [open]);

  const commands: Command[] = useMemo(() => {
    const go = (href: string) => () => { close(); router.push(href); };
    const base: Command[] = [
      { id: "nav-overview", group: "Go to", label: "Home", sub: "Your files at a glance", icon: LayoutDashboard, run: go("/dashboard") },
      { id: "nav-documents", group: "Go to", label: "My files", sub: "Add, scan, and check", icon: FileText, run: go("/dashboard/documents") },
      { id: "nav-docs", group: "Go to", label: "Help", sub: "How it works", icon: BookOpen, keywords: "docs help api guide", run: go("/docs") },
      { id: "nav-landing", group: "Go to", label: "Welcome page", sub: "The front page", icon: Home, run: go("/") },
      { id: "act-upload", group: "Actions", label: "Add a file", icon: Upload, keywords: "new add upload document", run: go("/dashboard/documents") },
      {
        id: "act-theme", group: "Actions", label: "Toggle theme",
        sub: "Switch light / dark", icon: typeof document !== "undefined" && document.documentElement.classList.contains("dark") ? Sun : Moon,
        keywords: "dark light mode appearance", run: () => { toggleTheme(); close(); },
      },
    ];
    const docCmds: Command[] = docs.map((d) => ({
      id: `doc-${d.id}`,
      group: "Files",
      label: d.original_filename,
      sub: `${d.signal_count} found · ${friendlyStatus(d.status)}`,
      icon: FileSearch,
      keywords: d.status,
      run: go(d.status === "done" ? `/dashboard/workspace/${d.id}` : "/dashboard/documents"),
    }));
    return [...base, ...docCmds];
  }, [docs, close, router, toggleTheme]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matched = q
      ? commands.filter((c) => `${c.label} ${c.sub ?? ""} ${c.keywords ?? ""} ${c.group}`.toLowerCase().includes(q))
      : commands;
    return matched.sort((a, b) => GROUP_ORDER.indexOf(a.group) - GROUP_ORDER.indexOf(b.group));
  }, [commands, query]);

  // Keep active index in range
  useEffect(() => { if (active >= filtered.length) setActive(Math.max(0, filtered.length - 1)); }, [filtered, active]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") { e.preventDefault(); close(); }
    else if (e.key === "ArrowDown") { e.preventDefault(); setActive((i) => Math.min(i + 1, filtered.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); filtered[active]?.run(); }
  };

  // Scroll active item into view
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-idx="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  if (!open) return null;

  let lastGroup = "";
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[12vh]" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-bg/60 backdrop-blur-sm animate-fade-in" onClick={close} />
      <div
        className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-border-strong bg-surface shadow-glow animate-slide-up"
        onKeyDown={onKeyDown}
      >
        <div className="flex items-center gap-3 border-b border-border px-4">
          <Search size={17} className="text-subtle" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setActive(0); }}
            placeholder="Search commands, pages, documents…"
            className="h-12 flex-1 bg-transparent text-sm text-fg outline-none placeholder:text-subtle"
          />
          <kbd className="rounded border border-border bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] text-subtle">ESC</kbd>
        </div>

        <div ref={listRef} className="max-h-[52vh] overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <div className="px-3 py-10 text-center text-sm text-subtle">No results for “{query}”</div>
          ) : (
            filtered.map((c, i) => {
              const header = c.group !== lastGroup ? c.group : null;
              lastGroup = c.group;
              const Icon = c.icon;
              const isActive = i === active;
              return (
                <div key={c.id}>
                  {header && (
                    <p className="px-3 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-widest text-subtle">{header}</p>
                  )}
                  <button
                    data-idx={i}
                    onMouseMove={() => setActive(i)}
                    onClick={() => c.run()}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
                      isActive ? "bg-surface-2 text-fg" : "text-muted hover:bg-surface-2/50",
                    )}
                  >
                    <span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-border bg-surface-2",
                      isActive ? "text-accent-2" : "text-subtle")}>
                      <Icon size={15} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-fg">{c.label}</span>
                      {c.sub && <span className="block truncate text-xs text-subtle">{c.sub}</span>}
                    </span>
                    {isActive && <CornerDownLeft size={14} className="shrink-0 text-subtle" />}
                  </button>
                </div>
              );
            })
          )}
        </div>

        <div className="flex items-center gap-4 border-t border-border px-4 py-2.5 text-[11px] text-subtle">
          <span className="flex items-center gap-1"><Kbd>↑</Kbd><Kbd>↓</Kbd> navigate</span>
          <span className="flex items-center gap-1"><Kbd>↵</Kbd> select</span>
          <span className="ml-auto flex items-center gap-1"><Kbd>⌘</Kbd><Kbd>K</Kbd> toggle</span>
        </div>
      </div>
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd className="rounded border border-border bg-surface-2 px-1 py-0.5 font-mono text-[10px] text-muted">{children}</kbd>;
}
