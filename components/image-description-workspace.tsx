"use client";

import { useWorkspaceTranslation } from "@/lib/workspace-i18n";

import { useRef, useState } from "react";
import type { ChangeEvent, DragEvent } from "react";
import {
  UploadCloud,
  Image as ImageIcon,
  X,
  Loader2,
  Sparkles,
  Copy,
  Download,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  LockKeyhole,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { saveToolHistoryClient } from "@/lib/save-tool-history-client";
import { trackAnalyticsEvent } from "@/lib/analytics";

type DescriptionMode = "short" | "detailed";

type ApiResponse = {
  success?: boolean;
  description?: string;
  error?: string;
  code?: string;
  metadata?: {
    imageType?: string;
    mode?: DescriptionMode;
    model?: string;
  };
};

const BUCKET = "document-analyzer";
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const ACCEPTED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function validateImage(file: File, translate: (value: string) => string): string | null {
  if (!ACCEPTED_TYPES[file.type]) {
    return translate("Please select a JPG, PNG, or WEBP image.");
  }

  if (file.size === 0) {
    return translate("The selected image is empty.");
  }

  if (file.size > MAX_FILE_SIZE) {
    return translate("The image must be smaller than 10 MB.");
  }

  return null;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(0)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function ImageDescriptionWorkspace() {
  const translate = useWorkspaceTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [mode, setMode] = useState<DescriptionMode>("detailed");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [dragging, setDragging] = useState(false);

  function clearResult() {
    setDescription("");
    setCopied(false);
  }

  function selectFile(nextFile?: File) {
    if (!nextFile) return;

    const validationError = validateImage(nextFile, translate);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError("");
    clearResult();
    setFile(nextFile);

    const nextPreview = URL.createObjectURL(nextFile);
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return nextPreview;
    });
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    selectFile(event.target.files?.[0]);
    event.target.value = "";
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    selectFile(event.dataTransfer.files?.[0]);
  }

  function reset() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl("");
    setDescription("");
    setError("");
    setCopied(false);
    setLoading(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function analyzeImage() {
    if (!file || loading) return;

    setLoading(true);
    setError("");
    clearResult();

    let uploadedPath: string | null = null;

    try {
      const supabase = createClient();

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error(translate("Please sign in to use AI Image Description."));
      }

      const extension = ACCEPTED_TYPES[file.type];
      uploadedPath = `${user.id}/${crypto.randomUUID()}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(uploadedPath, file, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        console.error("Image upload failed:", uploadError);
        throw new Error(translate("Unable to upload the image. Please try again."));
      }

      const response = await fetch("/api/image-description", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          storagePath: uploadedPath,
          mode,
        }),
      });

      const result = (await response.json()) as ApiResponse;

      if (!response.ok || !result.success || !result.description) {
        if (result.code === "PRO_REQUIRED") {
          throw new Error(
            translate("AI Image Description is available to Pro subscribers only. Please upgrade your plan.")
          );
        }

        if (response.status === 401) {
          throw new Error("Your session has expired. Please sign in again.");
        }

        throw new Error(
          result.error || translate("Image description failed. Please try again.")
        );
      }

      setDescription(result.description);
      trackAnalyticsEvent({ event: "generate_image_description" });
      try {
        await saveToolHistoryClient({
          toolType: "image-description",
          fileName: file.name,
          result: result.description,
          metadata: {
            mode,
            image_type: result.metadata?.imageType ?? file.type,
            model: result.metadata?.model ?? null,
          },
        });
      } catch (historyError) {
        console.error("Image description history save failed:", historyError);
        setError(translate("Description completed, but it could not be saved to history. Please try again later."));
      }
    } catch (caught) {
      console.error("Image description frontend error:", caught);
      setError(
        caught instanceof Error
          ? caught.message
          : translate("An unexpected error occurred. Please try again.")
      );
    } finally {
      if (uploadedPath) {
        const supabase = createClient();
        const { error: cleanupError } = await supabase.storage
          .from(BUCKET)
          .remove([uploadedPath]);

        if (cleanupError) {
          console.error("Temporary image cleanup failed:", cleanupError);
        }
      }

      setLoading(false);
    }
  }

  async function copyDescription() {
    if (!description) return;

    try {
      await navigator.clipboard.writeText(description);
      setCopied(true);
    } catch {
      setError(translate("Unable to copy the description. Please select and copy it manually."));
    }
  }

  function downloadDescription() {
    if (!description) return;

    const blob = new Blob([description], {
      type: "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "ai-image-description.txt";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700 dark:border-violet-900 dark:bg-violet-950/40 dark:text-violet-300">
          <LockKeyhole className="h-3.5 w-3.5" />
          
          {translate("PRO FEATURE")}
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
          
          {translate("AI Image Description")}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-600 dark:text-gray-400 sm:text-base">
          
          {translate("Upload an image and let AI describe its subjects, objects, setting, activities, and visible text.")}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <h2 className="font-semibold text-gray-900 dark:text-white">
              
              {translate("Upload image")}
            </h2>
            {file && (
              <button
                type="button"
                onClick={reset}
                disabled={loading}
                className="inline-flex items-center gap-1.5 text-sm text-gray-500 transition hover:text-red-600 disabled:opacity-50"
              >
                <X className="h-4 w-4" />
                
                {translate("Remove")}
              </button>
            )}
          </div>

          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            className="hidden"
          />

          {!file ? (
            <div
              onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              className={`flex min-h-72 flex-col items-center justify-center rounded-xl border-2 border-dashed px-5 py-10 text-center transition ${
                dragging
                  ? "border-violet-500 bg-violet-50 dark:bg-violet-950/30"
                  : "border-gray-300 bg-gray-50 dark:border-gray-700 dark:bg-gray-950/40"
              }`}
            >
              <div className="mb-4 rounded-2xl bg-violet-100 p-4 text-violet-700 dark:bg-violet-950 dark:text-violet-300">
                <UploadCloud className="h-8 w-8" />
              </div>
              <p className="font-semibold text-gray-900 dark:text-white">
                
                {translate("Drag and drop your image here")}
              </p>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                
                {translate("JPG, PNG, or WEBP · Maximum 10 MB")}
              </p>
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="mt-5 rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700"
              >
                
                {translate("Choose image")}
              </button>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
              <div className="flex min-h-64 items-center justify-center bg-gray-50 p-3 dark:bg-gray-950/50">
                {previewUrl && (
                  // The URL is created locally from the selected file.
                  <img
                loading="lazy"
                    src={previewUrl}
                    alt={translate("Selected image preview")}
                    className="max-h-80 max-w-full rounded-lg object-contain"
                  />
                )}
              </div>
              <div className="flex items-center gap-3 border-t border-gray-200 p-3 dark:border-gray-700">
                <div className="rounded-lg bg-violet-100 p-2 text-violet-700 dark:bg-violet-950 dark:text-violet-300">
                  <ImageIcon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                    {file.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {formatFileSize(file.size)}
                  </p>
                </div>
                <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" />
              </div>
            </div>
          )}

          <div className="mt-6">
            <p className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
              
              {translate("Description detail")}
            </p>
            <div className="grid grid-cols-2 gap-2 rounded-xl bg-gray-100 p-1 dark:bg-gray-800">
              <button
                type="button"
                onClick={() => setMode("short")}
                disabled={loading}
                className={`rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  mode === "short"
                    ? "bg-white text-violet-700 shadow-sm dark:bg-gray-700 dark:text-violet-300"
                    : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                }`}
              >
                
                {translate("Short")}
              </button>
              <button
                type="button"
                onClick={() => setMode("detailed")}
                disabled={loading}
                className={`rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  mode === "detailed"
                    ? "bg-white text-violet-700 shadow-sm dark:bg-gray-700 dark:text-violet-300"
                    : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                }`}
              >
                
                {translate("Detailed")}
              </button>
            </div>
          </div>

          {error && (
            <div className="mt-5 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <button
            type="button"
            onClick={analyzeImage}
            disabled={!file || loading}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                
                {translate("Generating description...")}
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                
                {translate("Generate description")}
              </>
            )}
          </button>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <h2 className="font-semibold text-gray-900 dark:text-white">
              
              {translate("AI description")}
            </h2>
            {description && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={copyDescription}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  <Copy className="h-3.5 w-3.5" />
                  {copied ? translate("Copied") : translate("Copy")}
                </button>
                <button
                  type="button"
                  onClick={downloadDescription}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  <Download className="h-3.5 w-3.5" />
                  
                  {translate("Download")}
                </button>
              </div>
            )}
          </div>

          {description ? (
            <div className="min-h-72 whitespace-pre-wrap rounded-xl bg-gray-50 p-5 text-sm leading-7 text-gray-700 dark:bg-gray-950/50 dark:text-gray-300">
              {description}
            </div>
          ) : (
            <div className="flex min-h-72 flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 px-6 text-center dark:border-gray-700 dark:bg-gray-950/40">
              <div className="mb-4 rounded-2xl bg-gray-100 p-4 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                <Sparkles className="h-8 w-8" />
              </div>
              <p className="font-semibold text-gray-800 dark:text-gray-200">
                
                {translate("Your description will appear here")}
              </p>
              <p className="mt-2 max-w-xs text-sm leading-6 text-gray-500 dark:text-gray-400">
                
                {translate("Choose an image and generate a short or detailed description.")}
              </p>
            </div>
          )}

          {description && (
            <button
              type="button"
              onClick={reset}
              className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-gray-500 transition hover:text-violet-700 dark:hover:text-violet-300"
            >
              <RotateCcw className="h-4 w-4" />
              
              {translate("Describe another image")}
            </button>
          )}
        </section>
      </div>

      <p className="mt-6 text-center text-xs leading-5 text-gray-500 dark:text-gray-500">
        
        {translate("AI-generated descriptions may occasionally miss details. Review important information before relying on it.")}
      </p>
    </main>
  );
}
