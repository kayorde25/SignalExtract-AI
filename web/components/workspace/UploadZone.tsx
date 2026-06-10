"use client";
import { useCallback, useState } from "react";
import { api } from "@/lib/api";
import Spinner from "@/components/ui/Spinner";

interface Props {
  onUploaded: () => void;
}

export default function UploadZone({ onUploaded }: Props) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(
    async (files: FileList | null) => {
      if (!files?.length) return;
      setError(null);
      setUploading(true);
      try {
        for (const file of Array.from(files)) {
          await api.documents.upload(file);
        }
        onUploaded();
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Upload failed");
      } finally {
        setUploading(false);
      }
    },
    [onUploaded],
  );

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => { e.preventDefault(); setDragging(false); upload(e.dataTransfer.files); }}
      className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
        dragging ? "border-blue-500 bg-blue-50" : "border-slate-300 hover:border-slate-400"
      }`}
    >
      <input
        type="file"
        multiple
        accept=".txt,.pdf,.docx,.eml"
        className="absolute inset-0 opacity-0 cursor-pointer"
        onChange={(e) => upload(e.target.files)}
      />
      {uploading ? (
        <div className="flex flex-col items-center gap-2">
          <Spinner size={32} />
          <p className="text-sm text-slate-500">Uploading…</p>
        </div>
      ) : (
        <>
          <div className="text-3xl mb-2">📄</div>
          <p className="text-sm font-medium text-slate-700">Drop files here or click to browse</p>
          <p className="text-xs text-slate-400 mt-1">.txt, .pdf, .docx, .eml — up to 25 MB each</p>
        </>
      )}
      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
    </div>
  );
}
