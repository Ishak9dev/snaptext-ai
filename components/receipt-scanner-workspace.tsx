"use client";

import { useWorkspaceTranslation } from "@/lib/workspace-i18n";

import { useRef, useState } from "react";
import type { ChangeEvent, DragEvent } from "react";
import {
  UploadCloud,
  FileText,
  Image as ImageIcon,
  X,
  Loader2,
  ScanLine,
  Copy,
  Download,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  LockKeyhole,
  ReceiptText,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { saveToolHistoryClient } from "@/lib/save-tool-history-client";

type LineItem = {
  description?: string;
  quantity?: string | number | null;
  unitPrice?: string | null;
  taxRate?: string | null;
  total?: string | null;
};

type ReceiptExtraction = {
  documentType?: string;
  merchant?: {
    name?: string | null;
    address?: string | null;
    taxId?: string | null;
    email?: string | null;
    phone?: string | null;
  };
  customer?: {
    name?: string | null;
    address?: string | null;
    taxId?: string | null;
  };
  documentNumber?: string | null;
  issueDate?: string | null;
  dueDate?: string | null;
  currency?: string | null;
  lineItems?: LineItem[];
  subtotal?: string | null;
  discount?: string | null;
  taxAmount?: string | null;
  total?: string | null;
  amountPaid?: string | null;
  amountDue?: string | null;
  paymentMethod?: string | null;
  notes?: string[];
  confidenceNotes?: string[];
};

type ApiResponse = {
  success?: boolean;
  extraction?: ReceiptExtraction;
  extractedText?: string;
  error?: string;
  code?: string;
  warning?: string;
  metadata?: {
    fileType?: string;
    pageCount?: number;
    extractionMode?: string;
    textTruncated?: boolean;
  };
};

const BUCKET = "document-analyzer";
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const MIME_BY_EXTENSION: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

function getExtension(name: string): string {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

function validateFile(file: File, translate: (value: string) => string): string | null {
  const extension = getExtension(file.name);
  if (!MIME_BY_EXTENSION[extension]) {
    return translate("Please select a PDF, JPG, PNG, or WEBP file.");
  }
  if (file.size === 0) return translate("The selected file is empty.");
  if (file.size > MAX_FILE_SIZE) return translate("The file must be smaller than 10 MB.");
  if (file.type && file.type !== MIME_BY_EXTENSION[extension]) {
    return translate("The file extension and file type do not match.");
  }
  return null;
}

function formatSize(bytes: number): string {
  return bytes < 1024 * 1024
    ? `${(bytes / 1024).toFixed(0)} KB`
    : `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function display(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}

function Detail({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="min-w-0 rounded-lg bg-gray-50 p-3 dark:bg-gray-800/70">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-semibold text-gray-900 dark:text-white">
        {display(value)}
      </p>
    </div>
  );
}

export default function ReceiptScannerWorkspace() {
  const translate = useWorkspaceTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [extraction, setExtraction] = useState<ReceiptExtraction | null>(null);
  const [extractedText, setExtractedText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [copied, setCopied] = useState(false);
  const [dragging, setDragging] = useState(false);

  function chooseFile(nextFile?: File) {
    if (!nextFile) return;
    const validationError = validateFile(nextFile, translate);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError("");
    setWarning("");
    setExtraction(null);
    setExtractedText("");
    setCopied(false);
    setFile(nextFile);

    const isImage = nextFile.type.startsWith("image/");
    const nextUrl = isImage ? URL.createObjectURL(nextFile) : "";
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return nextUrl;
    });
  }

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    chooseFile(event.target.files?.[0]);
    event.target.value = "";
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    chooseFile(event.dataTransfer.files?.[0]);
  }

  function reset() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl("");
    setExtraction(null);
    setExtractedText("");
    setError("");
    setWarning("");
    setCopied(false);
    setLoading(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function scanReceipt() {
    if (!file || loading) return;

    setLoading(true);
    setError("");
    setWarning("");
    setExtraction(null);
    setExtractedText("");

    let storagePath: string | null = null;

    try {
      const supabase = createClient();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error(translate("Please sign in to use Receipt & Invoice Scanner."));
      }

      const extension = getExtension(file.name);
      storagePath = `${user.id}/${crypto.randomUUID()}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(storagePath, file, {
          contentType: MIME_BY_EXTENSION[extension],
          upsert: false,
        });

      if (uploadError) {
        console.error(translate("Receipt upload failed:"), uploadError);
        throw new Error(translate("Unable to upload the file. Please try again."));
      }

      const response = await fetch("/api/receipt-scanner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storagePath }),
      });

      const result = (await response.json()) as ApiResponse;

      if (!response.ok || !result.success || !result.extraction) {
        if (result.code === "PRO_REQUIRED") {
          throw new Error(
            translate("Receipt & Invoice Scanner is available to Pro subscribers only. Please upgrade your plan.")
          );
        }
        if (result.code === "PDF_PAGE_LIMIT") {
          throw new Error(translate("PDF files must contain no more than 20 pages."));
        }
        if (result.code === "NO_TEXT_DETECTED") {
          throw new Error(translate("No readable receipt or invoice content was detected."));
        }
        if (result.code === "RECEIPT_RATE_LIMIT_REACHED") {
          throw new Error(translate("You have reached the hourly scanning limit. Please try again later."));
        }
        throw new Error(result.error || translate("Receipt scanning failed. Please try again."));
      }

      setExtraction(result.extraction);
      setExtractedText(result.extractedText || "");
      setWarning(result.warning || "");
      try {
        await saveToolHistoryClient({
          toolType: "receipt-scanner",
          fileName: file.name,
          result: result.extraction,
          metadata: {
            file_type: result.metadata?.fileType ?? file.type,
            page_count: result.metadata?.pageCount ?? null,
            extraction_mode: result.metadata?.extractionMode ?? null,
            extracted_text: result.extractedText ?? "",
            warning: result.warning ?? "",
          },
        });
      } catch (historyError) {
        console.error("Receipt scanner history save failed:", historyError);
        setError(translate("Scanning completed, but the result could not be saved to history. Please try again later."));
      }
    } catch (caught) {
      console.error(translate("Receipt scanner frontend error:"), caught);
      setError(
        caught instanceof Error
          ? caught.message
          : translate("An unexpected error occurred. Please try again.")
      );
    } finally {
      if (storagePath) {
        const supabase = createClient();
        const { error: cleanupError } = await supabase.storage
          .from(BUCKET)
          .remove([storagePath]);
        if (cleanupError) {
          console.error("Temporary receipt file cleanup failed:", cleanupError);
        }
      }
      setLoading(false);
    }
  }

  async function copyResult() {
    if (!extraction) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(extraction, null, 2));
      setCopied(true);
    } catch {
      setError(translate("Unable to copy the extracted data. Please try again."));
    }
  }

  function downloadResult() {
    if (!extraction) return;
    const blob = new Blob([JSON.stringify(extraction, null, 2)], {
      type: "application/json;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "receipt-invoice-data.json";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  const isPdf = file?.type === "application/pdf" || getExtension(file?.name || "") === "pdf";

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700 dark:border-violet-900 dark:bg-violet-950/40 dark:text-violet-300">
          <LockKeyhole className="h-3.5 w-3.5" />
          
          {translate("PRO FEATURE")}
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
          
          {translate("Receipt &amp; Invoice Scanner")}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-600 dark:text-gray-400 sm:text-base">
          
          {translate("Extract merchant details, dates, line items, taxes, totals, and payment information from receipts and invoices.")}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <h2 className="font-semibold text-gray-900 dark:text-white">{translate("Upload document")}</h2>
            {file && (
              <button
                type="button"
                onClick={reset}
                disabled={loading}
                className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-600 disabled:opacity-50"
              >
                <X className="h-4 w-4" />  {translate("Remove")}
              </button>
            )}
          </div>

          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,image/jpeg,image/png,image/webp,.pdf,.jpg,.jpeg,.png,.webp"
            onChange={onFileChange}
            className="hidden"
          />

          {!file ? (
            <div
              onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              className={`flex min-h-64 flex-col items-center justify-center rounded-xl border-2 border-dashed px-5 py-9 text-center transition ${
                dragging
                  ? "border-violet-500 bg-violet-50 dark:bg-violet-950/30"
                  : "border-gray-300 bg-gray-50 dark:border-gray-700 dark:bg-gray-950/40"
              }`}
            >
              <div className="mb-4 rounded-2xl bg-violet-100 p-4 text-violet-700 dark:bg-violet-950 dark:text-violet-300">
                <UploadCloud className="h-8 w-8" />
              </div>
              <p className="font-semibold text-gray-900 dark:text-white">
                
                {translate("Drop your receipt or invoice here")}
              </p>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                
                {translate("PDF, JPG, PNG, or WEBP · Maximum 10 MB")}
              </p>
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="mt-5 rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-700"
              >
                
                {translate("Choose file")}
              </button>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
              <div className="flex min-h-52 items-center justify-center bg-gray-50 p-3 dark:bg-gray-950/50">
                {previewUrl ? (
                  <img
                loading="lazy"
                    src={previewUrl}
                    alt={translate("Selected receipt or invoice preview")}
                    className="max-h-72 max-w-full rounded-lg object-contain"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-3 text-gray-500">
                    <FileText className="h-12 w-12" />
                    <span className="text-sm font-medium">{translate("PDF document selected")}</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3 border-t border-gray-200 p-3 dark:border-gray-700">
                <div className="rounded-lg bg-violet-100 p-2 text-violet-700 dark:bg-violet-950 dark:text-violet-300">
                  {isPdf ? <FileText className="h-5 w-5" /> : <ImageIcon className="h-5 w-5" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900 dark:text-white">{file.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{formatSize(file.size)}</p>
                </div>
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
            </div>
          )}

          {error && (
            <div className="mt-5 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <button
            type="button"
            onClick={scanReceipt}
            disabled={!file || loading}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                
                {translate("Extracting receipt data...")}
              </>
            ) : (
              <>
                <ScanLine className="h-4 w-4" />
                
                {translate("Scan receipt or invoice")}
              </>
            )}
          </button>
          <p className="mt-3 text-center text-xs text-gray-500 dark:text-gray-400">
            
            {translate("Supports PDF documents up to 20 pages.")}
          </p>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-semibold text-gray-900 dark:text-white">{translate("Extracted information")}</h2>
            {extraction && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={copyResult}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  <Copy className="h-3.5 w-3.5" /> {copied ? translate("Copied") : translate("Copy JSON")}
                </button>
                <button
                  type="button"
                  onClick={downloadResult}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  <Download className="h-3.5 w-3.5" />  {translate("Download")}
                </button>
              </div>
            )}
          </div>

          {!extraction ? (
            <div className="flex min-h-72 flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 px-6 text-center dark:border-gray-700 dark:bg-gray-950/40">
              <div className="mb-4 rounded-2xl bg-gray-100 p-4 text-gray-500 dark:bg-gray-800">
                <ReceiptText className="h-8 w-8" />
              </div>
              <p className="font-semibold text-gray-800 dark:text-gray-200">{translate("Your extracted data will appear here")}</p>
              <p className="mt-2 max-w-sm text-sm leading-6 text-gray-500 dark:text-gray-400">
                
                {translate("Upload a receipt or invoice to extract its key information automatically.")}
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {warning && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
                  {warning}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold capitalize text-violet-700 dark:bg-violet-950 dark:text-violet-300">
                  {display(extraction.documentType).replaceAll("_", " ")}
                </span>
                {extraction.documentNumber && (
                  <span className="text-xs text-gray-500">{translate("No.")} {extraction.documentNumber}</span>
                )}
              </div>

              <div>
                <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">{translate("Merchant / supplier")}</h3>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Detail label={translate("Name")} value={extraction.merchant?.name} />
                  <Detail label={translate("Tax ID")} value={extraction.merchant?.taxId} />
                  <Detail label={translate("Address")} value={extraction.merchant?.address} />
                  <Detail label={translate("Email")} value={extraction.merchant?.email} />
                  <Detail label={translate("Phone")} value={extraction.merchant?.phone} />
                </div>
              </div>

              <div>
                <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">{translate("Document details")}</h3>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Detail label={translate("Document number")} value={extraction.documentNumber} />
                  <Detail label={translate("Currency")} value={extraction.currency} />
                  <Detail label={translate("Issue date")} value={extraction.issueDate} />
                  <Detail label={translate("Due date")} value={extraction.dueDate} />
                  <Detail label={translate("Payment method")} value={extraction.paymentMethod} />
                </div>
              </div>

              <div>
                <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">{translate("Totals")}</h3>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Detail label={translate("Subtotal")} value={extraction.subtotal} />
                  <Detail label={translate("Discount")} value={extraction.discount} />
                  <Detail label={translate("Tax / VAT")} value={extraction.taxAmount} />
                  <Detail label={translate("Total")} value={extraction.total} />
                  <Detail label={translate("Amount paid")} value={extraction.amountPaid} />
                  <Detail label={translate("Amount due")} value={extraction.amountDue} />
                </div>
              </div>

              {!!extraction.lineItems?.length && (
                <div>
                  <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">{translate("Line items")}</h3>
                  <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
                    <table className="w-full min-w-[520px] text-left text-xs">
                      <thead className="bg-gray-50 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                        <tr>
                          <th className="px-3 py-2.5 font-semibold">{translate("Description")}</th>
                          <th className="px-3 py-2.5 font-semibold">{translate("Qty")}</th>
                          <th className="px-3 py-2.5 font-semibold">{translate("Unit price")}</th>
                          <th className="px-3 py-2.5 font-semibold">{translate("Tax")}</th>
                          <th className="px-3 py-2.5 font-semibold">{translate("Total")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {extraction.lineItems.map((item, index) => (
                          <tr key={`${index}-${item.description || "item"}`} className="border-t border-gray-100 dark:border-gray-800">
                            <td className="px-3 py-2.5 text-gray-800 dark:text-gray-200">{display(item.description)}</td>
                            <td className="px-3 py-2.5 text-gray-600 dark:text-gray-400">{display(item.quantity)}</td>
                            <td className="px-3 py-2.5 text-gray-600 dark:text-gray-400">{display(item.unitPrice)}</td>
                            <td className="px-3 py-2.5 text-gray-600 dark:text-gray-400">{display(item.taxRate)}</td>
                            <td className="px-3 py-2.5 font-medium text-gray-900 dark:text-white">{display(item.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {!!extraction.confidenceNotes?.length && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
                  <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-300">{translate("Review these details")}</h3>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-800 dark:text-amber-200">
                    {extraction.confidenceNotes.map((note, index) => <li key={index}>{note}</li>)}
                  </ul>
                </div>
              )}

              {!!extraction.notes?.length && (
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-gray-900 dark:text-white">{translate("Notes")}</h3>
                  <ul className="list-disc space-y-1 pl-5 text-sm text-gray-600 dark:text-gray-400">
                    {extraction.notes.map((note, index) => <li key={index}>{note}</li>)}
                  </ul>
                </div>
              )}

              <button
                type="button"
                onClick={reset}
                className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-violet-700 dark:hover:text-violet-300"
              >
                <RotateCcw className="h-4 w-4" />  {translate("Scan another document")}
              </button>
            </div>
          )}
        </section>
      </div>

      <p className="mt-6 text-center text-xs leading-5 text-gray-500 dark:text-gray-500">
        
        {translate("AI extraction can contain mistakes. Verify amounts, taxes, and payment details against the original document.")}
      </p>
    </main>
  );
}
