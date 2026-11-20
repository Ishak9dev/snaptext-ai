
"use client";

import { useWorkspaceTranslation } from "@/lib/workspace-i18n";

import { useRef, useState } from "react";
import type { ChangeEvent, DragEvent, ReactNode } from "react";
import {
  UploadCloud,
  FileText,
  X,
  Loader2,
  Sparkles,
  Copy,
  Download,
  CheckCircle2,
  AlertCircle,
  CalendarDays,
  Wallet,
  Users,
  ShieldAlert,
  ListChecks,
  RotateCcw,
} from "lucide-react";
import { jsPDF } from "jspdf";
import { createClient } from "@/lib/supabase/client";
import { saveToolHistoryClient } from "@/lib/save-tool-history-client";

type Entity = {
  type?: string;
  value?: string;
};

type ImportantDate = {
  date?: string;
  description?: string;
};

type FinancialFigure = {
  label?: string;
  value?: string;
  currency?: string;
};

type Analysis = {
  documentType?: string;
  documentTitle?: string;
  language?: string;
  summary?: string;
  keyFindings?: string[];
  entities?: Entity[];
  importantDates?: ImportantDate[];
  financialFigures?: FinancialFigure[];
  actionItems?: string[];
  risksAndWarnings?: string[];
  questionsToClarify?: string[];
};

type AnalysisResponse = {
  success: boolean;
  analysis: Analysis;
  extractedText?: string;
  metadata?: {
    fileType?: string;
    pageCount?: number;
    extractionMode?: string;
    textTruncated?: boolean;
  };
  error?: string;
  code?: string;
};

type SectionProps = {
  title: string;
  icon: ReactNode;
  children: ReactNode;
};

const BUCKET = "document-analyzer";
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const ACCEPTED_EXTENSIONS = [
  "pdf",
  "jpg",
  "jpeg",
  "png",
  "webp",
];

const MIME_BY_EXTENSION: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

function getExtension(fileName: string) {
  return fileName.split(".").pop()?.toLowerCase() ?? "";
}

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(0)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function Section({ title, icon, children }: SectionProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
          {icon}
        </div>

        <h3 className="font-bold text-slate-900">{title}</h3>
      </div>

      {children}
    </section>
  );
}

function EmptyMessage({ children }: { children: ReactNode }) {
  return (
    <p className="text-sm text-slate-500">{children}</p>
  );
}

function StringList({
  items,
  bullet = false,
}: {
  items?: string[];
  bullet?: boolean;
}) {
  const translate = useWorkspaceTranslation();
  if (!Array.isArray(items) || items.length === 0) {
    return <EmptyMessage>{translate("No information identified.")}</EmptyMessage>;
  }

  return (
    <ul className="space-y-3">
      {items.map((item, index) => (
        <li
          key={`${index}-${item}`}
          className="flex items-start gap-3 text-sm leading-7 text-slate-600"
        >
          {bullet ? (
            <span className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-500" />
          ) : (
            <CheckCircle2
              size={17}
              className="mt-1 shrink-0 text-violet-600"
            />
          )}

          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export default function DocumentAnalyzerWorkspace() {
  const translate = useWorkspaceTranslation();
  const inputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [stage, setStage] = useState("");

  function validateFile(selectedFile: File): boolean {
    const extension = getExtension(selectedFile.name);

    if (!ACCEPTED_EXTENSIONS.includes(extension)) {
      setError(translate("Unsupported format. Please upload a PDF, JPG, PNG or WEBP file."));
      return false;
    }

    if (selectedFile.size === 0) {
      setError(translate("The selected file is empty."));
      return false;
    }

    if (selectedFile.size > MAX_FILE_SIZE) {
      setError(translate("The maximum allowed file size is 10 MB."));
      return false;
    }

    const expectedMime = MIME_BY_EXTENSION[extension];

    if (
      selectedFile.type &&
      selectedFile.type !== expectedMime &&
      !(extension === "jpg" && selectedFile.type === "image/jpeg")
    ) {
      setError(translate("The file extension and file format do not match."));
      return false;
    }

    setFile(selectedFile);
    setAnalysis(null);
    setError("");
    setCopied(false);

    return true;
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0];

    if (selectedFile) {
      validateFile(selectedFile);
    }

    event.target.value = "";
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(true);
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);

    const droppedFile = event.dataTransfer.files?.[0];

    if (droppedFile) {
      validateFile(droppedFile);
    }
  }

  function resetWorkspace() {
    if (loading) return;

    setFile(null);
    setAnalysis(null);
    setError("");
    setCopied(false);
    setStage("");

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  async function analyzeDocument() {
    if (!file || loading) return;

    setLoading(true);
    setError("");
    setAnalysis(null);
    setStage(translate("Preparing your document..."));

    let storagePath: string | null = null;
    // Client Components are server-rendered for the initial HTML. Create the
    // browser Supabase client only after a user action, never during render.
    const supabase = createClient();

    try {
      // 1. Verify authentication.
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error(translate("Please sign in before analyzing a document."));
      }

      // 2. Prepare a private Storage path.
      const extension = getExtension(file.name);

      if (!ACCEPTED_EXTENSIONS.includes(extension)) {
        throw new Error(translate("Unsupported document format."));
      }

      storagePath = `${user.id}/${crypto.randomUUID()}.${extension}`;

      // 3. Upload directly to Supabase Storage.
      setStage(translate("Uploading your document..."));

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(storagePath, file, {
          contentType: MIME_BY_EXTENSION[extension],
          upsert: false,
        });

      if (uploadError) {
        console.error("Document upload error:", uploadError);

        throw new Error(
          translate("Unable to upload your document. Please try again.")
        );
      }

      // 4. Request analysis from the existing API.
      setStage(translate("Extracting text and analyzing your document..."));

      const response = await fetch("/api/document-analyzer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          storagePath,
        }),
      });

      const result = (await response.json()) as AnalysisResponse;

      if (!response.ok || !result.success || !result.analysis) {
        if (result.code === "PRO_REQUIRED") {
          throw new Error(
            translate("Smart Document Analyzer is available to Pro subscribers only.")
          );
        }

        if (result.code === "DOCUMENT_RATE_LIMIT_REACHED") {
          throw new Error(
            translate("You have reached your hourly analysis limit. Please try again later.")
          );
        }

        if (result.code === "PDF_PAGE_LIMIT") {
          throw new Error(
            translate("Your PDF must contain between 1 and 20 pages.")
          );
        }

        if (result.code === "NO_TEXT_DETECTED") {
          throw new Error(
            translate("No readable text was detected. Please try a clearer document.")
          );
        }

        throw new Error(
          result.error || translate("Document analysis failed. Please try again.")
        );
      }

      // 5. Display results and save them automatically to shared history.
      setAnalysis(result);
      try {
        await saveToolHistoryClient({
          toolType: "document-analyzer",
          fileName: file.name,
          result: result.analysis,
          metadata: {
            file_type: result.metadata?.fileType ?? file.type,
            page_count: result.metadata?.pageCount ?? null,
            extraction_mode: result.metadata?.extractionMode ?? null,
            extracted_text: result.extractedText ?? "",
          },
        });
      } catch (historyError) {
        console.error("Document analyzer history save failed:", historyError);
        setError(translate("Analysis completed, but the result could not be saved to history. Please try again later."));
      }
      setStage("");
    } catch (err) {
      console.error("Document analyzer frontend error:", err);

      setError(
        err instanceof Error
          ? err.message
          : translate("An unexpected error occurred.")
      );

      setStage("");
    } finally {
      // 6. Delete the temporary uploaded document.
      if (storagePath) {
        try {
          const { error: deleteError } = await supabase.storage
            .from(BUCKET)
            .remove([storagePath]);

          if (deleteError) {
            console.error(
              "Temporary document cleanup failed:",
              deleteError
            );
          }
        } catch (cleanupError) {
          console.error("Document cleanup error:", cleanupError);
        }
      }

      setLoading(false);
      setStage("");
    }
  }

  async function copyResults() {
    if (!analysis) return;

    try {
      await navigator.clipboard.writeText(
        JSON.stringify(analysis.analysis, null, 2)
      );

      setCopied(true);
    } catch {
      setError(
        translate("Unable to copy results. Please check your browser permissions.")
      );
    }
  }

  function exportPDF() {
    if (!analysis) return;

    const result = analysis.analysis;
    const doc = new jsPDF();

    const margin = 15;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const contentWidth = pageWidth - margin * 2;

    let y = 20;

    function ensureSpace(requiredHeight: number) {
      if (y + requiredHeight > pageHeight - margin) {
        doc.addPage();
        y = 20;
      }
    }

    function addHeading(title: string) {
      ensureSpace(16);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text(title, margin, y);

      y += 8;
    }

    function addParagraph(value?: string) {
      if (!value?.trim()) return;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);

      const lines = doc.splitTextToSize(value, contentWidth);

      for (const line of lines) {
        ensureSpace(7);
        doc.text(line, margin, y);
        y += 5;
      }

      y += 4;
    }

    function addList(title: string, items?: string[]) {
      if (!Array.isArray(items) || items.length === 0) return;

      addHeading(title);

      items.forEach((item) => {
        addParagraph(`- ${item}`);
      });

      y += 2;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(19);
    doc.text(translate("Smart Document Analysis"), margin, y);

    y += 13;

    addHeading(translate("Document information"));
    addParagraph(`Title: ${result.documentTitle || translate("Not identified")}`);
    addParagraph(`Type: ${result.documentType || translate("Not identified")}`);
    addParagraph(`Language: ${result.language || translate("Not identified")}`);

    addHeading(translate("Summary"));
    addParagraph(result.summary);

    addList(translate("Key findings"), result.keyFindings);

    addList(
      translate("Entities"),
      result.entities?.map(
        (item) => `${item.type || translate("Entity")}: ${item.value || ""}`
      )
    );

    addList(
      translate("Important dates"),
      result.importantDates?.map(
        (item) =>
          `${item.date || ""} - ${item.description || ""}`
      )
    );

    addList(
      translate("Financial figures"),
      result.financialFigures?.map(
        (item) =>
          `${item.label || ""}: ${item.value || ""} ${item.currency || ""}`
      )
    );

    addList(translate("Action items"), result.actionItems);
    addList(translate("Risks and warnings"), result.risksAndWarnings);
    addList(translate("Questions to clarify"), result.questionsToClarify);

    doc.save("smart-document-analysis.pdf");
  }

  const result = analysis?.analysis;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-5xl">

        {/* Header */}
        <header className="mb-8">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-violet-100 px-3 py-1.5 text-xs font-semibold text-violet-700">
            <Sparkles size={14} />
            
            {translate("AI-powered document intelligence")}
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            
            {translate("Smart Document Analyzer")}
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-500 sm:text-base">
            
            {translate("Upload a document and let AI extract important information, identify key findings, and generate a structured summary.")}
          </p>
        </header>

        {/* Upload area */}
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">

          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleFileChange}
          />

          {!file ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`flex min-h-64 flex-col items-center justify-center rounded-2xl border-2 border-dashed px-5 py-10 text-center transition ${
                dragging
                  ? "border-violet-500 bg-violet-50"
                  : "border-slate-300 bg-slate-50 hover:border-violet-400"
              }`}
            >
              <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-100 text-violet-600">
                <UploadCloud size={30} />
              </div>

              <h2 className="text-lg font-bold text-slate-900">
                
                {translate("Drop your document here")}
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                
                {translate("Or browse your computer to select a file")}
              </p>

              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-violet-700"
              >
                <UploadCloud size={17} />
                
                {translate("Choose document")}
              </button>

              <p className="mt-5 text-xs leading-6 text-slate-500">
                
                {translate("PDF, JPG, JPEG, PNG or WEBP")}
                <br />
                
                {translate("Maximum 10 MB · PDF maximum 20 pages")}
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
                  <FileText size={24} />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-slate-900">
                    {file.name}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    {formatFileSize(file.size)} ·{" "}
                    {MIME_BY_EXTENSION[getExtension(file.name)]}
                  </p>
                </div>

                <button
                  type="button"
                  disabled={loading}
                  onClick={resetWorkspace}
                  aria-label={translate("Remove document")}
                  className="rounded-lg p-2 text-slate-500 transition hover:bg-white hover:text-red-500 disabled:opacity-50"
                >
                  <X size={20} />
                </button>
              </div>

              <button
                type="button"
                disabled={loading}
                onClick={analyzeDocument}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3.5 font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 size={19} className="animate-spin" />
                    
                    {translate("Analyzing document...")}
                  </>
                ) : (
                  <>
                    <Sparkles size={19} />
                    
                    {translate("Analyze document")}
                  </>
                )}
              </button>

              {!loading && (
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="mt-3 w-full text-sm font-medium text-violet-600 hover:text-violet-800"
                >
                  
                  {translate("Choose a different document")}
                </button>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <div
              role="alert"
              className="mt-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
            >
              <AlertCircle size={19} className="mt-0.5 shrink-0" />
              <p>{error}</p>
            </div>
          )}
        </div>

        {/* Loading state */}
        {loading && (
          <div className="mt-6 rounded-2xl border border-violet-100 bg-violet-50 p-7 text-center">
            <Loader2
              size={34}
              className="mx-auto animate-spin text-violet-600"
            />

            <h3 className="mt-4 font-bold text-slate-900">
              
              {translate("AI is analyzing your document")}
            </h3>

            <p className="mt-2 text-sm text-slate-500">
              {stage || translate("Please wait while we process your document.")}
            </p>

            <p className="mt-2 text-xs text-slate-500">
              
              {translate("Large or scanned documents may take longer.")}
            </p>
          </div>
        )}

        {/* Results */}
        {result && analysis && (
          <div className="mt-10 space-y-5">

            {/* Results header */}
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
                  <CheckCircle2 size={18} />
                  
                  {translate("Analysis completed")}
                </div>

                <h2 className="mt-2 text-2xl font-extrabold text-slate-900">
                  
                  {translate("Analysis results")}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  
                  {translate("Your document has been processed successfully.")}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={copyResults}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  <Copy size={16} />
                  {copied ? translate("Copied!") : translate("Copy JSON")}
                </button>

                <button
                  type="button"
                  onClick={exportPDF}
                  className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700"
                >
                  <Download size={16} />
                  
                  {translate("Export PDF")}
                </button>
              </div>
            </div>

            {/* Metadata */}
            {analysis.metadata && (
              <div className="flex flex-wrap gap-2 text-xs text-slate-600">
                {analysis.metadata.pageCount !== undefined && (
                  <span className="rounded-full bg-white px-3 py-2 border border-slate-200">
                    {analysis.metadata.pageCount}  {translate("page(s)")}
                  </span>
                )}

                {analysis.metadata.extractionMode && (
                  <span className="rounded-full bg-white px-3 py-2 border border-slate-200">
                    {analysis.metadata.extractionMode.replaceAll("_", " ")}
                  </span>
                )}

                {analysis.metadata.textTruncated && (
                  <span className="rounded-full bg-amber-50 px-3 py-2 text-amber-700">
                    
                    {translate("Text shortened for analysis")}
                  </span>
                )}
              </div>
            )}

            {/* Overview */}
            <Section
              title={translate("Document overview")}
              icon={<FileText size={19} />}
            >
              <h4 className="text-lg font-bold text-slate-900">
                {result.documentTitle ||
                  result.documentType ||
                  translate("Document analysis")}
              </h4>

              <div className="mt-3 flex flex-wrap gap-2">
                {result.documentType && (
                  <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700">
                    {result.documentType}
                  </span>
                )}

                {result.language && (
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
                    {result.language}
                  </span>
                )}
              </div>

              <p className="mt-5 whitespace-pre-wrap text-sm leading-7 text-slate-600">
                {result.summary || translate("No summary was generated.")}
              </p>
            </Section>

            {/* Key findings */}
            <Section
              title={translate("Key findings")}
              icon={<Sparkles size={19} />}
            >
              <StringList items={result.keyFindings} />
            </Section>

            {/* Entities */}
            <Section
              title={translate("People and entities")}
              icon={<Users size={19} />}
            >
              {result.entities?.length ? (
                <div className="divide-y divide-slate-100">
                  {result.entities.map((item, index) => (
                    <div
                      key={index}
                      className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                    >
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {item.type || translate("Entity")}
                      </span>

                      <span className="text-sm font-medium text-slate-800">
                        {item.value || translate("Not specified")}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyMessage>{translate("No entities identified.")}</EmptyMessage>
              )}
            </Section>

            {/* Dates */}
            <Section
              title={translate("Important dates")}
              icon={<CalendarDays size={19} />}
            >
              {result.importantDates?.length ? (
                <div className="space-y-3">
                  {result.importantDates.map((item, index) => (
                    <div
                      key={index}
                      className="rounded-xl bg-slate-50 p-4"
                    >
                      <p className="font-semibold text-slate-900">
                        {item.date || translate("Date not specified")}
                      </p>

                      <p className="mt-1 text-sm leading-6 text-slate-600">
                        {item.description || ""}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyMessage>{translate("No important dates identified.")}</EmptyMessage>
              )}
            </Section>

            {/* Financial figures */}
            <Section
              title={translate("Financial figures")}
              icon={<Wallet size={19} />}
            >
              {result.financialFigures?.length ? (
                <div className="space-y-3">
                  {result.financialFigures.map((item, index) => (
                    <div
                      key={index}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 p-4"
                    >
                      <span className="text-sm text-slate-600">
                        {item.label || translate("Amount")}
                      </span>

                      <span className="font-bold text-slate-900">
                        {item.value || ""}
                        {item.currency ? ` ${item.currency}` : ""}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyMessage>{translate("No financial figures identified.")}</EmptyMessage>
              )}
            </Section>

            {/* Actions */}
            <Section
              title={translate("Action items")}
              icon={<ListChecks size={19} />}
            >
              <StringList items={result.actionItems} bullet />
            </Section>

            {/* Risks */}
            <Section
              title={translate("Risks and warnings")}
              icon={<ShieldAlert size={19} />}
            >
              {result.risksAndWarnings?.length ? (
                <div className="space-y-3">
                  {result.risksAndWarnings.map((item, index) => (
                    <div
                      key={index}
                      className="rounded-xl border border-amber-100 bg-amber-50 p-4 text-sm leading-6 text-amber-900"
                    >
                      {item}
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyMessage>{translate("No risks or warnings identified.")}</EmptyMessage>
              )}
            </Section>

            {/* Questions */}
            <Section
              title={translate("Questions to clarify")}
              icon={<AlertCircle size={19} />}
            >
              <StringList
                items={result.questionsToClarify}
                bullet
              />
            </Section>

            {/* Extracted text */}
            <details className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <summary className="cursor-pointer font-bold text-slate-900">
                
                {translate("View extracted document text")}
              </summary>

              <pre className="mt-5 max-h-[500px] overflow-auto whitespace-pre-wrap break-words rounded-xl bg-slate-50 p-4 text-xs leading-6 text-slate-600">
                {analysis.extractedText || translate("No extracted text available.")}
              </pre>
            </details>

            {/* Start again */}
            <button
              type="button"
              onClick={resetWorkspace}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <RotateCcw size={17} />
              
              {translate("Analyze another document")}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
