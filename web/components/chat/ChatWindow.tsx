"use client";
import { useState, useRef, useEffect } from "react";
import { Send, Paperclip, User, Sparkles, FileText, BookOpen } from "lucide-react";
import { api, type Doc } from "@/lib/api";
import type { CitationResult } from "@/lib/types";
import { fmtBytes, relTime } from "@/lib/utils";
import { cn } from "@/lib/utils";
import PromptSuggestions from "./PromptSuggestions";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: CitationResult[];
}

interface Props {
  selectedDoc: Doc | null;
}

export default function ChatWindow({ selectedDoc }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Reset chat when document changes
  useEffect(() => {
    setMessages([]);
    setInput("");
  }, [selectedDoc?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function handleSend(text?: string) {
    const content = (text ?? input).trim();
    if (!content) return;

    setMessages(prev => [...prev, { id: `u-${Date.now()}`, role: "user", content }]);
    setInput("");
    setLoading(true);

    if (!selectedDoc) {
      setMessages(prev => [...prev, {
        id: `a-${Date.now()}`,
        role: "assistant",
        content: "Upload a document first, then I can help you analyse it.",
      }]);
      setLoading(false);
      return;
    }

    try {
      const result = await api.documents.query(selectedDoc.id, content);
      setMessages(prev => [...prev, {
        id: `a-${Date.now()}`,
        role: "assistant",
        content: result.answer,
        citations: result.citations,
      }]);
    } catch {
      setMessages(prev => [...prev, {
        id: `a-${Date.now()}`,
        role: "assistant",
        content: "Retrieval failed — please try again.",
      }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* message area */}
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <Welcome doc={selectedDoc} onSelect={handleSend} />
        ) : (
          <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 animate-fade-in">
            {messages.map(msg => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
            {loading && <ThinkingBubble />}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* input bar */}
      <div className="shrink-0 border-t border-border bg-bg px-4 py-4">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-end gap-2 rounded-2xl border border-border bg-surface px-4 py-3 transition-colors focus-within:border-accent/50">
            <button className="mb-0.5 shrink-0 text-subtle transition-colors hover:text-fg">
              <Paperclip size={17} />
            </button>
            <textarea
              rows={1}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={
                selectedDoc
                  ? `Ask anything about ${selectedDoc.original_filename}…`
                  : "Ask about your document, or upload one to get started…"
              }
              className="max-h-40 flex-1 resize-none bg-transparent text-sm text-fg placeholder:text-subtle outline-none"
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim()}
              className="mb-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-accent text-accent-contrast shadow-glow-sm transition-all hover:bg-accent-2 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Send size={14} />
            </button>
          </div>
          <p className="mt-2 text-center text-[11px] text-subtle">
            SignalExtract uses hybrid extraction — rules + AI. No signals are fabricated.
          </p>
        </div>
      </div>
    </div>
  );
}

function Welcome({ doc, onSelect }: { doc: Doc | null; onSelect: (p: string) => void }) {
  if (doc) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-6 py-12 text-center animate-fade-in">
        {/* doc icon */}
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-accent/10 text-accent-2 mb-5">
          <FileText size={26} />
        </div>

        {/* filename */}
        <h2 className="max-w-sm truncate text-xl font-semibold text-fg">
          {doc.original_filename}
        </h2>

        {/* metadata row */}
        <div className="mt-2 flex flex-wrap items-center justify-center gap-2 text-sm text-muted">
          {doc.page_count != null ? (
            <span>{doc.page_count} {doc.page_count === 1 ? "page" : "pages"}</span>
          ) : (
            <span>— pages</span>
          )}
          <span className="text-border-strong">·</span>
          <span>{doc.signal_count ?? 0} {doc.signal_count === 1 ? "signal" : "signals"}</span>
          <span className="text-border-strong">·</span>
          <span>{fmtBytes(doc.file_size)}</span>
          <span className="text-border-strong">·</span>
          <span>Uploaded {relTime(doc.uploaded_at)}</span>
        </div>

        <p className="mt-5 text-base text-muted">Ask anything about this document.</p>

        <div className="mt-8 w-full max-w-xl">
          <PromptSuggestions onSelect={onSelect} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col items-center justify-center px-6 py-16 text-center animate-fade-in">
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-accent/10 text-accent-2 mb-5">
        <Sparkles size={26} />
      </div>
      <h2 className="text-xl font-semibold text-fg">Upload documents and ask anything.</h2>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">
        Drop in a PDF, email, or report — then ask questions, extract signals, and export structured intelligence.
      </p>
      <div className="mt-8 w-full max-w-xl">
        <PromptSuggestions onSelect={onSelect} />
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  return (
    <div className={cn("flex items-start gap-3", isUser && "flex-row-reverse")}>
      <div className={cn(
        "grid h-8 w-8 shrink-0 place-items-center rounded-xl",
        isUser ? "bg-surface-2 text-muted" : "bg-accent/10 text-accent-2",
      )}>
        {isUser ? <User size={15} /> : <Sparkles size={15} />}
      </div>
      {isUser ? (
        <div className="max-w-[82%] rounded-2xl rounded-tr-sm bg-accent px-4 py-3 text-sm leading-relaxed text-accent-contrast whitespace-pre-wrap">
          {message.content}
        </div>
      ) : (
        <div className="card-surface max-w-[82%] rounded-2xl rounded-tl-sm px-4 py-3 text-sm leading-relaxed text-fg">
          <p className="whitespace-pre-wrap">{message.content}</p>
          {message.citations && message.citations.length > 0 && (
            <CitationSection citations={message.citations} />
          )}
        </div>
      )}
    </div>
  );
}

function CitationSection({ citations }: { citations: CitationResult[] }) {
  return (
    <div className="mt-3 border-t border-border pt-3">
      <div className="mb-2 flex items-center gap-1.5">
        <BookOpen size={11} className="text-subtle" />
        <span className="text-[10px] font-semibold uppercase tracking-widest text-subtle">
          Sources
        </span>
      </div>
      <div className="space-y-1.5">
        {citations.map((c, i) => (
          <div key={c.chunk_id} className="rounded-lg bg-surface-2 px-3 py-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-medium text-muted">[{i + 1}] Page {c.page_number ?? "?"}</span>
              <span className="text-border-strong">·</span>
              <span className="text-subtle">score {c.score.toFixed(2)}</span>
            </div>
            <p className="mt-1 line-clamp-2 text-subtle">{c.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ThinkingBubble() {
  return (
    <div className="flex items-start gap-3">
      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-accent/10 text-accent-2">
        <Sparkles size={15} />
      </div>
      <div className="card-surface rounded-tl-sm px-4 py-3.5">
        <div className="flex items-center gap-1.5">
          {[0, 150, 300].map(delay => (
            <span
              key={delay}
              className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted"
              style={{ animationDelay: `${delay}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
