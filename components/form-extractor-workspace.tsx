
"use client";

import { useWorkspaceTranslation } from "@/lib/workspace-i18n";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  UploadCloud,
  FileText,
  Image as ImageIcon,
  X,
  Loader2,
  CheckCircle2,
  Copy,
  Download,
  FileJson,
  Table2,
  ClipboardList,
  AlertCircle,
  RefreshCw,
} from "lucide-react";

type ExtractedField = {
  label: string;
  value: string;
  type?: string;
  confidence?: number;
};

type ExtractedTable = {
  title: string;
  headers: string[];
  rows: string[][];
};

type ExtractedCheckbox = {
  label: string;
  checked: boolean;
};

type ExtractionResult = {
  documentType: string;
  summary: string;
  fields: ExtractedField[];
  tables: ExtractedTable[];
  checkboxes: ExtractedCheckbox[];
  notes: string[];
};

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
];

export default function FormExtractorWorkspace() {
  const translate = useWorkspaceTranslation();
  const inputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [result, setResult] = useState<ExtractionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [dragging, setDragging] = useState(false);

  function clearMessages() {
    setError("");
    setSuccess("");
  }

  function selectFile(selected: File | undefined) {
    if (!selected) return;

    clearMessages();
    setResult(null);

    if (!ALLOWED_TYPES.includes(selected.type)) {
      setError(translate("Please upload a PDF, JPG, PNG, or WEBP file."));
      return;
    }

    if (selected.size > MAX_FILE_SIZE) {
      setError(translate("File size must not exceed 10 MB."));
      return;
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl);

    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
  }

  function removeFile() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);

    setFile(null);
    setPreviewUrl(null);
    setResult(null);
    clearMessages();

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  async function extractData() {
    if (!file || loading) return;

    setLoading(true);
    clearMessages();
    setResult(null);

    let storagePath: string | null = null;
    let supabase: ReturnType<typeof createClient> | null = null;

    try {
      // Avoid starting Supabase Auth session initialization during the server
      // prerender of this Client Component.
      supabase = createClient();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error(translate("Please sign in to use this tool."));
      }

      const extension = file.name.split(".").pop()?.toLowerCase();

      if (!extension) {
        throw new Error(translate("Invalid file extension."));
      }

      storagePath = `${user.id}/${crypto.randomUUID()}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("document-analyzer")
        .upload(storagePath, file, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        throw new Error(translate("Unable to upload your document. Please try again."));
      }

      const response = await fetch("/api/form-extractor", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ storagePath }),
      });

      const payload = await response.json();

      if (!response.ok) {
        if (response.status === 429 && payload.retryAfter) {
          const minutes = Math.ceil(payload.retryAfter / 60);
          throw new Error(
            `${payload.error} Try again in approximately ${minutes} minute(s).`
          );
        }

        throw new Error(payload.error || translate("Document extraction failed."));
      }

   if (!payload.success || !payload.result) {
  throw new Error(translate("The AI returned an invalid result."));
}

// Save extraction to the shared user history
const { error: historyError } = await supabase
  .from("tool_history")
  .insert({
    user_id: user.id,
    tool_type: "form-extractor",
    file_name: file.name,
    result_text: JSON.stringify(payload.result),
    metadata: {
      file_type: payload.metadata?.fileType ?? file.type,
      model: payload.metadata?.model ?? null,
      characters_processed:
        payload.metadata?.charactersProcessed ?? 0,
    },
  });

setResult(payload.result);

if (historyError) {
  console.error("Form extractor history error:", historyError);
  setSuccess(translate("Extraction completed, but saving to history failed."));
} else {
  setSuccess(translate("Extraction completed and saved to your history."));
}
    } catch (err: unknown) {
      console.error("Form extraction error:", err);
      setError(
        err instanceof Error
          ? err.message
          : translate("Something went wrong.")
      );
    } finally {
      if (storagePath && supabase) {
        await supabase.storage
          .from("document-analyzer")
          .remove([storagePath]);
      }

      setLoading(false);
    }
  }

  async function copyJson() {
    if (!result) return;

    try {
      await navigator.clipboard.writeText(
        JSON.stringify(result, null, 2)
      );
      setSuccess(translate("JSON copied to clipboard."));
      setError("");
    } catch {
      setError(translate("Unable to copy JSON."));
    }
  }

  function downloadJson() {
    if (!result) return;

    const blob = new Blob(
      [JSON.stringify(result, null, 2)],
      { type: "application/json" }
    );

    downloadBlob(blob, "form-extraction.json");
  }

  function downloadCsv() {
    if (!result) return;

    const rows = [
      [translate("Field"), translate("Value"), translate("Type"), translate("Confidence")],
      ...result.fields.map((field) => [
        field.label,
        field.value,
        field.type || "",
        field.confidence !== undefined
          ? `${Math.round(field.confidence * 100)}%`
          : "",
      ]),
    ];

    const csv = rows
      .map((row) =>
        row
          .map((value) => `"${String(value).replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\r\n");

    const blob = new Blob(["\uFEFF", csv], {
      type: "text/csv;charset=utf-8;",
    });

    downloadBlob(blob, "form-extraction.csv");
  }

  function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = filename;
    link.click();

    URL.revokeObjectURL(url);
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-purple-200 bg-purple-50 px-3 py-1 text-sm font-medium text-purple-700 dark:border-purple-900 dark:bg-purple-950/40 dark:text-purple-300">
          <ClipboardList className="h-4 w-4" />
          
          {translate("Pro AI Tool")}
        </div>

        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
          
          {translate("Form & Data Extractor")}
        </h1>

        <p className="mt-3 max-w-2xl text-gray-600 dark:text-gray-400">
          
          {translate("Extract form fields, tables, checkboxes, and important information from your documents with AI.")}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              
              {translate("Upload document")}
            </h2>

            <span className="text-xs text-gray-500 dark:text-gray-400">
              
              {translate("Maximum 10 MB")}
            </span>
          </div>

          {!file ? (
            <div
              onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDragging(false);
                selectFile(event.dataTransfer.files?.[0]);
              }}
              onClick={() => inputRef.current?.click()}
              className={`flex min-h-72 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition ${
                dragging
                  ? "border-purple-500 bg-purple-50 dark:bg-purple-950/30"
                  : "border-gray-300 hover:border-purple-400 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
              }`}
            >
              <div className="mb-4 rounded-full bg-purple-100 p-4 dark:bg-purple-950">
                <UploadCloud className="h-8 w-8 text-purple-600 dark:text-purple-400" />
              </div>

              <p className="font-semibold text-gray-900 dark:text-white">
                
                {translate("Drag and drop your document")}
              </p>

              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                
                {translate("or click to browse your files")}
              </p>

              <p className="mt-5 text-xs text-gray-400">
                
                {translate("PDF, JPG, JPEG, PNG, WEBP")}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-xl border border-gray-200 p-4 dark:border-gray-700">
                <div className="rounded-lg bg-purple-100 p-3 dark:bg-purple-950">
                  {file.type === "application/pdf" ? (
                    <FileText className="h-6 w-6 text-purple-600" />
                  ) : (
                    <ImageIcon className="h-6 w-6 text-purple-600" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-gray-900 dark:text-white">
                    {file.name}
                  </p>

                  <p className="text-xs text-gray-500">
                    {(file.size / 1024 / 1024).toFixed(2)}  {translate("MB")}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={removeFile}
                  disabled={loading}
                  className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-red-500 disabled:opacity-50 dark:hover:bg-gray-800"
                  aria-label={translate("Remove file")}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {previewUrl && file.type.startsWith("image/") && (
                <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
                  <img
                loading="lazy"
                    src={previewUrl}
                    alt={translate("Document preview")}
                    className="max-h-80 w-full bg-gray-50 object-contain dark:bg-gray-800"
                  />
                </div>
              )}

              {file.type === "application/pdf" && (
                <div className="flex min-h-48 flex-col items-center justify-center rounded-xl bg-gray-50 p-6 text-center dark:bg-gray-800">
                  <FileText className="mb-3 h-12 w-12 text-purple-500" />
                  <p className="font-medium text-gray-800 dark:text-gray-200">
                    
                    {translate("PDF document selected")}
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    
                    {translate("The document will be processed after you click Extract.")}
                  </p>
                </div>
              )}
            </div>
          )}

          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(event) => selectFile(event.target.files?.[0])}
          />

          {error && (
            <div className="mt-5 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mt-5 flex items-start gap-2 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700 dark:border-green-900 dark:bg-green-950/30 dark:text-green-300">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          <button
            type="button"
            onClick={extractData}
            disabled={!file || loading}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-purple-600 px-5 py-3 font-semibold text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                
                {translate("Extracting document...")}
              </>
            ) : (
              <>
                <ClipboardList className="h-5 w-5" />
                
                {translate("Extract form data")}
              </>
            )}
          </button>

          <p className="mt-3 text-center text-xs text-gray-500">
            
            {translate("Your uploaded temporary file is deleted after processing.")}
          </p>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              
              {translate("Extraction results")}
            </h2>

            {result && (
              <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700 dark:bg-green-950 dark:text-green-300">
                
                {translate("Completed")}
              </span>
            )}
          </div>

          {!result ? (
            <div className="flex min-h-72 flex-col items-center justify-center rounded-xl bg-gray-50 px-6 text-center dark:bg-gray-800">
              <div className="mb-4 rounded-full bg-gray-200 p-4 dark:bg-gray-700">
                <Table2 className="h-8 w-8 text-gray-500" />
              </div>

              <p className="font-medium text-gray-800 dark:text-gray-200">
                
                {translate("No extraction results yet")}
              </p>

              <p className="mt-2 max-w-xs text-sm text-gray-500">
                
                {translate("Upload a document and click Extract form data to see structured information here.")}
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="rounded-xl bg-purple-50 p-4 dark:bg-purple-950/30">
                <p className="text-xs font-semibold uppercase tracking-wide text-purple-700 dark:text-purple-300">
                  
                  {translate("Document type")}
                </p>

                <p className="mt-1 font-semibold text-gray-900 dark:text-white">
                  {result.documentType}
                </p>

                {result.summary && (
                  <p className="mt-3 text-sm leading-6 text-gray-700 dark:text-gray-300">
                    {result.summary}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={copyJson}
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                >
                  <Copy className="h-4 w-4" />
                  
                  {translate("Copy JSON")}
                </button>

                <button
                  type="button"
                  onClick={downloadJson}
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                >
                  <FileJson className="h-4 w-4" />
                  
                  {translate("JSON")}
                </button>

                <button
                  type="button"
                  onClick={downloadCsv}
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                >
                  <Download className="h-4 w-4" />
                  
                  {translate("CSV")}
                </button>
              </div>

              <div>
                <h3 className="mb-3 font-semibold text-gray-900 dark:text-white">
                  
                  {translate("Extracted fields (")}{result.fields.length})
                </h3>

                {result.fields.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    
                    {translate("No individual fields were detected.")}
                  </p>
                ) : (
                  <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                    {result.fields.map((field, index) => (
                      <div
                        key={`${field.label}-${index}`}
                        className="rounded-lg border border-gray-200 p-3 dark:border-gray-700"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {field.label}
                          </p>

                          {field.type && (
                            <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-500 dark:bg-gray-800">
                              {field.type}
                            </span>
                          )}
                        </div>

                        <p className="mt-1 break-words text-sm text-gray-900 dark:text-white">
                          {field.value || "—"}
                        </p>

                        {field.confidence !== undefined && (
                          <p className="mt-1 text-xs text-gray-400">
                            
                            {translate("Confidence:")}{" "}
                            {Math.round(field.confidence * 100)}%
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h3 className="mb-3 font-semibold text-gray-900 dark:text-white">
                  
                  {translate("Checkboxes (")}{result.checkboxes.length})
                </h3>

                {result.checkboxes.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    
                    {translate("No checkboxes were detected.")}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {result.checkboxes.map((item, index) => (
                      <div
                        key={`${item.label}-${index}`}
                        className="flex items-center gap-3 rounded-lg border border-gray-200 p-3 dark:border-gray-700"
                      >
                        <span
                          className={`flex h-5 w-5 items-center justify-center rounded border text-xs ${
                            item.checked
                              ? "border-green-500 bg-green-500 text-white"
                              : "border-gray-400 text-transparent"
                          }`}
                        >
                          ✓
                        </span>

                        <span className="text-sm text-gray-800 dark:text-gray-200">
                          {item.label}
                        </span>

                        <span className="ml-auto text-xs text-gray-500">
                          {item.checked ? translate("Checked") : translate("Unchecked")}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h3 className="mb-3 font-semibold text-gray-900 dark:text-white">
                  
                  {translate("Tables (")}{result.tables.length})
                </h3>

                {result.tables.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    
                    {translate("No tables were detected.")}
                  </p>
                ) : (
                  <div className="space-y-4">
                    {result.tables.map((table, index) => (
                      <div
                        key={`${table.title}-${index}`}
                        className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700"
                      >
                        <div className="border-b border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium dark:border-gray-700 dark:bg-gray-800">
                          {table.title}
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            {table.headers.length > 0 && (
                              <thead className="bg-gray-50 dark:bg-gray-800">
                                <tr>
                                  {table.headers.map((header, headerIndex) => (
                                    <th
                                      key={headerIndex}
                                      className="whitespace-nowrap px-3 py-2 font-semibold text-gray-700 dark:text-gray-300"
                                    >
                                      {header}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                            )}

                            <tbody>
                              {table.rows.map((row, rowIndex) => (
                                <tr
                                  key={rowIndex}
                                  className="border-t border-gray-100 dark:border-gray-800"
                                >
                                  {row.map((cell, cellIndex) => (
                                    <td
                                      key={cellIndex}
                                      className="px-3 py-2 text-gray-700 dark:text-gray-300"
                                    >
                                      {cell}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {result.notes.length > 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/20">
                  <h3 className="mb-2 font-semibold text-amber-800 dark:text-amber-300">
                    
                    {translate("Notes")}
                  </h3>

                  <ul className="list-disc space-y-1 pl-5 text-sm text-amber-800 dark:text-amber-200">
                    {result.notes.map((note, index) => (
                      <li key={index}>{note}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </section>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-white">
            
            {translate("Need to analyze another document?")}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            
            {translate("Remove the current file and upload another one.")}
          </p>
        </div>

        <button
          type="button"
          onClick={removeFile}
          disabled={!file || loading}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
        >
          <RefreshCw className="h-4 w-4" />
          
          {translate("Start again")}
        </button>
      </div>
    </div>
  );
}
