"use client";

import Link from "next/link";
import { FormEvent, useMemo, useRef, useState } from "react";

type UploadResponse = {
  documentId?: string;
  filename?: string;
  error?: string;
};

type ExtractTextResult = {
  documentId: string;
  textPreview: string;
  chunkCount: number;
  error?: string;
};

type ExtractSignalsResult = {
  documentId: string;
  signalCount: number;
  error?: string;
};

type StepIndex = 1 | 2 | 3;

const steps: Array<{ id: StepIndex; title: string; subtitle: string }> = [
  { id: 1, title: "Upload", subtitle: "Drop or select your source file" },
  { id: 2, title: "Processing", subtitle: "Extracting text and signal structure" },
  { id: 3, title: "Extraction complete", subtitle: "Preview output and review signals" },
];

export default function DocumentsPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [message, setMessage] = useState<string>("Select a document to begin.");
  const [isError, setIsError] = useState(false);
  const [currentStep, setCurrentStep] = useState<StepIndex>(1);
  const [uploadedDocumentId, setUploadedDocumentId] = useState<string | null>(null);
  const [uploadedFilename, setUploadedFilename] = useState<string | null>(null);
  const [textPreview, setTextPreview] = useState<string>("");
  const [chunkCount, setChunkCount] = useState<number>(0);
  const [signalCount, setSignalCount] = useState<number | null>(null);

  const inputRef = useRef<HTMLInputElement | null>(null);

  const statusClassName = useMemo(
    () => (isError ? "dx-status-error" : "dx-status-success"),
    [isError]
  );

  const resetWorkflow = () => {
    setFile(null);
    setIsDragging(false);
    setIsUploading(false);
    setIsProcessing(false);
    setUploadProgress(0);
    setCurrentStep(1);
    setUploadedDocumentId(null);
    setUploadedFilename(null);
    setTextPreview("");
    setChunkCount(0);
    setSignalCount(null);
    setMessage("Select a document to begin.");
    setIsError(false);

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const uploadWithProgress = (selectedFile: File) =>
    new Promise<UploadResponse>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/documents/upload");

      xhr.upload.onprogress = (event) => {
        if (!event.lengthComputable) return;
        const next = Math.round((event.loaded / event.total) * 100);
        setUploadProgress(next);
      };

      xhr.onerror = () => reject(new Error("Network error during upload."));

      xhr.onload = () => {
        try {
          const payload = JSON.parse(xhr.responseText) as UploadResponse;
          if (xhr.status < 200 || xhr.status >= 300) {
            reject(new Error(payload.error ?? "Upload failed."));
            return;
          }

          resolve(payload);
        } catch {
          reject(new Error("Invalid upload response."));
        }
      };

      const formData = new FormData();
      formData.append("file", selectedFile);
      xhr.send(formData);
    });

  const runExtraction = async (documentId: string) => {
    setCurrentStep(2);
    setIsProcessing(true);
    setIsError(false);

    setMessage("Processing document: extracting text...");
    const extractTextResponse = await fetch(
      `/api/documents/${documentId}/extract-text`,
      { method: "POST" }
    );

    const textPayload = (await extractTextResponse.json()) as ExtractTextResult;
    if (!extractTextResponse.ok) {
      throw new Error(textPayload.error ?? "Text extraction failed.");
    }

    setTextPreview(textPayload.textPreview || "No text preview generated.");
    setChunkCount(textPayload.chunkCount ?? 0);

    setMessage("Processing document: extracting signals...");
    const extractSignalsResponse = await fetch(
      `/api/documents/${documentId}/extract-signals`,
      { method: "POST" }
    );

    const signalPayload = (await extractSignalsResponse.json()) as ExtractSignalsResult;
    if (!extractSignalsResponse.ok) {
      throw new Error(signalPayload.error ?? "Signal extraction failed.");
    }

    setSignalCount(signalPayload.signalCount ?? 0);
    setCurrentStep(3);
    setMessage("Extraction complete. Review generated signals.");
  };

  const startUploadFlow = async (selectedFile: File) => {
    setIsUploading(true);
    setIsProcessing(false);
    setIsError(false);
    setCurrentStep(1);
    setUploadProgress(0);
    setMessage("Uploading document...");

    try {
      const payload = await uploadWithProgress(selectedFile);

      if (!payload.documentId) {
        throw new Error("Upload succeeded but no document id was returned.");
      }

      setUploadedDocumentId(payload.documentId);
      setUploadedFilename(payload.filename ?? selectedFile.name);
      setUploadProgress(100);
      setMessage(`Uploaded ${payload.filename ?? selectedFile.name}. Starting processing...`);

      await runExtraction(payload.documentId);
    } catch (error) {
      setIsError(true);
      setCurrentStep(1);
      setMessage(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setIsUploading(false);
      setIsProcessing(false);
    }
  };

  const onFileDrop: React.DragEventHandler<HTMLLabelElement> = (event) => {
    event.preventDefault();
    setIsDragging(false);

    const dropped = event.dataTransfer.files?.[0] ?? null;
    if (!dropped) return;

    setFile(dropped);
    setMessage(`Ready to upload ${dropped.name}`);
    setIsError(false);
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!file) {
      setIsError(true);
      setMessage("Please select or drop a file before uploading.");
      return;
    }

    await startUploadFlow(file);
  };

  return (
    <section className="dx-page">
      <header className="dx-page-header">
        <p className="dx-eyebrow">Documents</p>
        <h2 className="dx-title">Upload source documents</h2>
        <p className="dx-subtitle">Use a guided workflow to upload, process, preview extraction, and continue to signal review.</p>
      </header>

      <div className="grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
        <form onSubmit={onSubmit} className="dx-card space-y-5 animate-[dx-fade-in_320ms_ease-out]">
          <div className="space-y-2">
            <p className="text-lg font-semibold text-white">Guided upload workflow</p>
            <p className="text-sm leading-6 text-slate-400">Move from upload to processing to extraction complete with clear status and progress feedback.</p>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {steps.map((step) => {
              const isCompleted = currentStep > step.id;
              const isCurrent = currentStep === step.id;

              return (
                <div
                  key={step.id}
                  className={`rounded-2xl border px-4 py-3 transition ${
                    isCurrent
                      ? "border-blue-400/50 bg-blue-500/10"
                      : isCompleted
                        ? "border-emerald-400/40 bg-emerald-500/10"
                        : "border-white/10 bg-white/[0.02]"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                        isCurrent
                          ? "bg-blue-500 text-white"
                          : isCompleted
                            ? "bg-emerald-500 text-white"
                            : "bg-slate-700 text-slate-200"
                      }`}
                    >
                      {step.id}
                    </span>
                    <p className="text-sm font-medium text-white">{step.title}</p>
                  </div>
                  <p className="mt-2 text-xs text-slate-400">{step.subtitle}</p>
                </div>
              );
            })}
          </div>

          <div className="space-y-2">
            <label
              htmlFor="document"
              onDragOver={(event) => {
                event.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={onFileDrop}
              className={`group block cursor-pointer rounded-2xl border-2 border-dashed px-6 py-10 text-center transition ${
                isDragging
                  ? "border-blue-400 bg-blue-500/10"
                  : "border-white/15 bg-white/[0.02] hover:border-blue-400/40 hover:bg-white/[0.04]"
              }`}
            >
              <input
                ref={inputRef}
                id="document"
                type="file"
                onChange={(event) => {
                  const selected = event.target.files?.[0] ?? null;
                  setFile(selected);
                  if (selected) {
                    setMessage(`Ready to upload ${selected.name}`);
                    setIsError(false);
                  }
                }}
                className="hidden"
                required
              />
              <p className="text-sm font-semibold text-white">
                {file ? `Selected: ${file.name}` : "Drag and drop a document here"}
              </p>
              <p className="mt-2 text-sm text-slate-400">
                or <span className="text-blue-300">browse files</span>
              </p>
            </label>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Upload progress</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
              <div
                className={`h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-400 transition-all duration-300 ${
                  isProcessing ? "animate-pulse" : ""
                }`}
                style={{ width: `${Math.min(uploadProgress, 100)}%` }}
              />
            </div>
            {isProcessing ? (
              <div className="space-y-2 pt-2">
                <div className="dx-skeleton h-4 w-2/3" />
                <div className="dx-skeleton h-4 w-full" />
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={isUploading || isProcessing || !file}
              className="dx-button-primary"
            >
              {isUploading ? "Uploading..." : isProcessing ? "Processing..." : "Start workflow"}
            </button>
            <button
              type="button"
              disabled={isUploading || isProcessing}
              className="dx-button-secondary"
              onClick={resetWorkflow}
            >
              Reset
            </button>
            {uploadedDocumentId && signalCount !== null ? (
              <Link href="/dashboard/review" className="dx-button-secondary">
                Review Signals
              </Link>
            ) : null}
          </div>

          <p className={statusClassName}>{message}</p>

          {currentStep === 3 && !isError ? (
            <div className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr] animate-[dx-fade-in_260ms_ease-out]">
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                <p className="text-sm font-semibold text-white">Extracted text preview</p>
                <p className="mt-2 max-h-56 overflow-y-auto whitespace-pre-wrap text-sm leading-6 text-slate-300">
                  {textPreview || "No extractable text available."}
                </p>
              </div>

              <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                <p className="text-sm font-semibold text-white">Extraction summary</p>
                <div className="rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2">
                  <p className="text-xs uppercase tracking-[0.15em] text-slate-500">Document</p>
                  <p className="mt-1 text-sm text-slate-200">{uploadedFilename}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2">
                  <p className="text-xs uppercase tracking-[0.15em] text-slate-500">Text chunks</p>
                  <p className="mt-1 text-2xl font-semibold text-white">{chunkCount}</p>
                </div>
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2">
                  <p className="text-xs uppercase tracking-[0.15em] text-emerald-200">Signals found</p>
                  <p className="mt-1 text-2xl font-semibold text-emerald-300">{signalCount ?? 0}</p>
                </div>
              </div>
            </div>
          ) : null}
        </form>

        <aside className="dx-card space-y-4 animate-[dx-fade-in_320ms_ease-out]">
          <p className="text-lg font-semibold text-white">Workflow status</p>
          <div className="space-y-3 text-sm text-slate-300">
            <div className="rounded-xl border border-white/5 bg-white/5 p-4">
              <p className="font-medium text-white">Step 1: Upload</p>
              <p className="mt-1 text-slate-400">Drag/drop or browse your file, then start the workflow.</p>
            </div>
            <div className="rounded-xl border border-white/5 bg-white/5 p-4">
              <p className="font-medium text-white">Step 2: Processing</p>
              <p className="mt-1 text-slate-400">The system extracts text and analyzes signals automatically.</p>
            </div>
            <div className="rounded-xl border border-white/5 bg-white/5 p-4">
              <p className="font-medium text-white">Step 3: Complete</p>
              <p className="mt-1 text-slate-400">Inspect preview output and continue to signal review.</p>
            </div>
          </div>

          {uploadedDocumentId ? (
            <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-4 text-sm text-blue-100">
              <p className="font-semibold">Current document</p>
              <p className="mt-1 break-all text-blue-200">{uploadedDocumentId}</p>
            </div>
          ) : null}
        </aside>
      </div>
    </section>
  );
}
