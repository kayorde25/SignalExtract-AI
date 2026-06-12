"use client";
import { useCallback, useState } from "react";
import { UploadCloud, Loader2, AlertCircle } from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";

interface Props {
  onUploaded: () => void;
}

export default function UploadZone({ onUploaded }: Props) {
  const toast = useToast();
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(
    async (files: FileList | null) => {
      if (!files?.length) return;
      setError(null);
      setUploading(true);
      const count = files.length;
      try {
        for (const file of Array.from(files)) await api.documents.upload(file);
        onUploaded();
        toast.success(`Uploaded ${count} file${count !== 1 ? "s" : ""}`, "Run extraction to find signals");
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Upload failed";
        setError(msg);
        toast.error("Upload failed", msg);
      } finally {
        setUploading(false);
      }
    },
    [onUploaded, toast],
  );

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => { e.preventDefault(); setDragging(false); upload(e.dataTransfer.files); }}
      className={cn(
        "relative grid place-items-center rounded-2xl border border-dashed p-10 text-center transition-all",
        dragging
          ? "border-accent bg-accent/[0.06] glow-accent"
          : "border-border bg-surface/40 hover:border-border-strong hover:bg-surface-2/40",
      )}
    >
      <input
        type="file"
        multiple
        accept=".txt,.pdf,.docx,.eml"
        className="absolute inset-0 cursor-pointer opacity-0"
        onChange={(e) => upload(e.target.files)}
        disabled={uploading}
      />
      {uploading ? (
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={26} className="animate-spin text-accent" />
          <p className="text-sm text-muted">Uploading…</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <span className={cn(
            "grid h-12 w-12 place-items-center rounded-xl border border-border bg-surface text-accent-2 transition-transform",
            dragging && "scale-110",
          )}>
            <UploadCloud size={22} />
          </span>
          <div>
            <p className="text-sm font-medium text-fg">
              Drop files here or <span className="text-accent-2">click to browse</span>
            </p>
            <p className="mt-1 text-xs text-subtle">.txt, .pdf, .docx, .eml — up to 25 MB each</p>
          </div>
        </div>
      )}
      {error && (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-danger">
          <AlertCircle size={13} /> {error}
        </p>
      )}
    </div>
  );
}
