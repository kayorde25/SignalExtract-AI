"use client";
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileText, X, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";

const ACCEPTED_EXTS = [".pdf", ".docx", ".txt", ".eml", ".csv"];
const ACCEPTED_ATTR = ACCEPTED_EXTS.join(",");
const ACCEPTED_LABELS = ["PDF", "DOCX", "TXT", "EML", "CSV"];
const MAX_BYTES = 25 * 1024 * 1024; // 25 MB

function validateFile(file: File): string | null {
  const ext = "." + file.name.split(".").pop()?.toLowerCase();
  if (!ACCEPTED_EXTS.includes(ext)) {
    return "Use PDF, DOCX, TXT, EML, or CSV";
  }
  if (file.size > MAX_BYTES) {
    return "File exceeds 25 MB";
  }
  return null;
}

export default function UploadDropzone() {
  const router = useRouter();
  const toast = useToast();
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = useCallback((picked: File) => {
    const err = validateFile(picked);
    if (err) {
      toast.error("Unsupported file", err);
      return;
    }
    setFile(picked);
  }, [toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) handleFile(dropped);
  }, [handleFile]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) handleFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    if (!file || uploading) return;
    setUploading(true);
    try {
      const doc = await api.documents.upload(file);
      toast.success("Uploaded", file.name);
      router.push(`/workspace?doc=${doc.id}`);
    } catch (err) {
      console.error("[upload]", err);
      toast.error("Upload failed", "Please try again");
      setUploading(false);
    }
  };

  if (file) {
    return (
      <div className="card-surface flex items-center gap-3 p-4">
        <FileText size={18} className="shrink-0 text-accent-2" />
        <span className="flex-1 truncate text-sm text-fg">{file.name}</span>
        {!uploading && (
          <button
            onClick={() => setFile(null)}
            className="shrink-0 text-subtle transition-colors hover:text-danger"
          >
            <X size={15} />
          </button>
        )}
        <button
          onClick={handleUpload}
          disabled={uploading}
          className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-accent px-4 text-sm font-medium text-accent-contrast shadow-glow-sm transition-colors hover:bg-accent-2 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {uploading ? (
            <><Loader2 size={14} className="animate-spin" /> Uploading…</>
          ) : (
            "Open Workspace"
          )}
        </button>
      </div>
    );
  }

  return (
    <label
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed p-12 text-center transition-all",
        dragging
          ? "border-accent bg-accent/5 shadow-glow"
          : "border-border bg-surface/40 hover:border-accent/40 hover:bg-accent/5",
      )}
    >
      <div className={cn(
        "grid h-13 w-13 place-items-center rounded-2xl transition-colors",
        dragging ? "bg-accent/20 text-accent-2" : "bg-surface-2 text-muted",
      )}>
        <Upload size={24} />
      </div>
      <div>
        <p className="text-sm font-medium text-fg">
          {dragging ? "Release to upload" : "Drop your document here"}
        </p>
        <p className="mt-1 text-xs text-muted">or click to browse files</p>
      </div>
      <div className="flex flex-wrap justify-center gap-1.5">
        {ACCEPTED_LABELS.map(ext => (
          <span
            key={ext}
            className="rounded-md border border-border bg-surface px-2 py-0.5 font-mono text-[10px] text-subtle"
          >
            {ext}
          </span>
        ))}
      </div>
      <input type="file" accept={ACCEPTED_ATTR} onChange={handleChange} className="sr-only" />
    </label>
  );
}
