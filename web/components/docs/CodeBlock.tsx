"use client";
import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

export default function CodeBlock({ children, label }: { children: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(children).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div className="group relative my-4 overflow-hidden rounded-xl border border-border bg-surface-2/50">
      {label && (
        <div className="border-b border-border px-4 py-1.5 font-mono text-[11px] text-subtle">{label}</div>
      )}
      <pre className="overflow-x-auto p-4 font-mono text-[12.5px] leading-relaxed text-fg">
        <code>{children}</code>
      </pre>
      <button
        onClick={copy}
        aria-label="Copy code"
        className={cn(
          "absolute right-2.5 grid h-7 w-7 place-items-center rounded-md border border-border bg-surface text-subtle opacity-0 transition-all hover:text-fg group-hover:opacity-100",
          label ? "top-9" : "top-2.5",
        )}
      >
        {copied ? <Check size={13} className="text-success" /> : <Copy size={13} />}
      </button>
    </div>
  );
}
