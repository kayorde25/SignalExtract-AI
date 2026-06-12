"use client";
import { createContext, useCallback, useContext, useRef, useState } from "react";
import { CheckCircle2, AlertCircle, Info, X, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastType = "success" | "error" | "info";

interface Toast {
  id: number;
  type: ToastType;
  title: string;
  description?: string;
  exiting?: boolean;
}

interface ToastApi {
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}

const ICON: Record<ToastType, LucideIcon> = { success: CheckCircle2, error: AlertCircle, info: Info };
const ACCENT: Record<ToastType, string> = {
  success: "text-success",
  error: "text-danger",
  info: "text-accent-2",
};

export default function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seq = useRef(0);

  const remove = useCallback((id: number) => {
    setToasts((ts) => ts.map((t) => (t.id === id ? { ...t, exiting: true } : t)));
    setTimeout(() => setToasts((ts) => ts.filter((t) => t.id !== id)), 200);
  }, []);

  const push = useCallback((type: ToastType, title: string, description?: string) => {
    const id = ++seq.current;
    setToasts((ts) => [...ts, { id, type, title, description }]);
    setTimeout(() => remove(id), type === "error" ? 6000 : 4000);
  }, [remove]);

  const api: ToastApi = {
    success: (t, d) => push("success", t, d),
    error: (t, d) => push("error", t, d),
    info: (t, d) => push("info", t, d),
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed bottom-5 right-5 z-[60] flex w-full max-w-sm flex-col gap-2.5">
        {toasts.map((t) => {
          const Icon = ICON[t.type];
          return (
            <div
              key={t.id}
              role="status"
              className={cn(
                "card-surface pointer-events-auto flex items-start gap-3 p-3.5 pr-10 shadow-glow",
                t.exiting ? "animate-toast-out" : "animate-toast-in",
              )}
            >
              <Icon size={18} className={cn("mt-0.5 shrink-0", ACCENT[t.type])} />
              <div className="min-w-0">
                <p className="text-sm font-medium text-fg">{t.title}</p>
                {t.description && <p className="mt-0.5 text-xs text-muted">{t.description}</p>}
              </div>
              <button
                onClick={() => remove(t.id)}
                aria-label="Dismiss"
                className="absolute right-2.5 top-2.5 grid h-6 w-6 place-items-center rounded-md text-subtle transition-colors hover:bg-surface-2 hover:text-fg"
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
