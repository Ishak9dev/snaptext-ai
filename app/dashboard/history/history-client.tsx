
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useWorkspaceLanguage, useWorkspaceTranslation } from "@/lib/workspace-i18n";

type HistoryItem = {
  id: string;
  tool_type: string;
  file_name: string;
  output_file_name: string | null;
  result_text: string | null;
  language: string | null;
  storage_path: string | null;
  mime_type: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

const toolNames: Record<string, string> = {
  "image-to-text": "Image to Text",
  "image-compressor": "Image Compressor",
  "image-converter": "Image Converter",
  "image-to-pdf": "Image to PDF",
  "metadata-remover": "Metadata Remover",
  "background-remover": "Background Remover",
  "document-analyzer": "Smart Document Analyzer",
  "image-description": "AI Image Description",
  "receipt-scanner": "Receipt & Invoice Scanner",
  "form-extractor": "Form & Data Extractor",
};

export default function HistoryPage() {
  const router = useRouter();
  const language = useWorkspaceLanguage();
  const translate = useWorkspaceTranslation();
  const dashboardHref = language === "fr" ? "/fr/dashboard" : "/dashboard";
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [selected, setSelected] = useState<HistoryItem | null>(null);
  const [selectedUrl, setSelectedUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loadingFile, setLoadingFile] = useState(false);

  useEffect(() => {
    async function loadHistory() {
      const supabase = createClient();

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.replace(`/login?next=${encodeURIComponent(`${dashboardHref}/history`)}`);
        return;
      }

      const { data, error: historyError } = await supabase
        .from("tool_history")
        .select(
          "id, tool_type, file_name, output_file_name, result_text, language, storage_path, mime_type, metadata, created_at"
        )
        .order("created_at", { ascending: false });

      if (historyError) {
        console.error(historyError);
        setError(translate("Unable to load your history. Please try again."));
      } else {
        setHistory((data ?? []) as HistoryItem[]);
      }

      setLoading(false);
    }

    loadHistory();
  }, [dashboardHref, router, translate]);

  async function selectItem(item: HistoryItem) {
    setSelected(item);
    setSelectedUrl("");
    setMessage("");

    if (!item.storage_path) return;

    setLoadingFile(true);

    const supabase = createClient();

    const { data, error } = await supabase.storage
      .from("tool-history")
      .createSignedUrl(item.storage_path, 3600);

    if (error) {
      console.error(error);
      setMessage(translate("Unable to load the saved file."));
    } else {
      setSelectedUrl(data.signedUrl);
    }

    setLoadingFile(false);
  }

  async function copyText(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setMessage(translate("Text copied successfully!"));
    } catch (error) {
      console.error(error);
      setMessage(translate("Unable to copy text."));
    }
  }

  async function deleteItem(item: HistoryItem) {
    const confirmed = window.confirm(
      translate("Are you sure you want to delete this history entry?")
    );

    if (!confirmed) return;

    const supabase = createClient();

    // Delete the stored file, if one exists.
    if (item.storage_path) {
      const { error: storageError } = await supabase.storage
        .from("tool-history")
        .remove([item.storage_path]);

      if (storageError) {
        console.error(storageError);
        setMessage(translate("Unable to delete the stored file."));
        return;
      }
    }

    // Delete the shared history entry.
    const { error: deleteError } = await supabase
      .from("tool_history")
      .delete()
      .eq("id", item.id);

    if (deleteError) {
      console.error(deleteError);
        setMessage(translate("Unable to delete this history entry."));
      return;
    }

    // Keep the old OCR history table synchronized.
    if (item.tool_type === "image-to-text") {
      const { error: ocrDeleteError } = await supabase
        .from("extractions")
        .delete()
        .eq("id", item.id);

      if (ocrDeleteError) {
        console.error(ocrDeleteError);
        setMessage(translate("History deleted, but OCR cleanup was unsuccessful."));
      }
    }

    setHistory((current) =>
      current.filter((entry) => entry.id !== item.id)
    );

    if (selected?.id === item.id) {
      setSelected(null);
      setSelectedUrl("");
    }

    setMessage(translate("History entry deleted successfully!"));
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleString();
  }

  return (
    <main lang={language} className="min-h-screen bg-slate-50 px-4 py-12">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700">
              SNAPTEXT AI
            </span>

            <h1 className="mt-4 text-3xl font-bold text-slate-900">
              {translate("All Tools History")}
            </h1>

            <p className="mt-2 text-slate-500">
              {translate("View and manage your saved results from all SnapText AI tools.")}
            </p>
          </div>

        </div>

        {message && (
          <div
            role="status"
            aria-live="polite"
            className="mb-5 rounded-lg border border-violet-200 bg-violet-50 p-4 text-sm font-medium text-violet-700"
          >
            {message}
          </div>
        )}

        {loading ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">
            {translate("Loading your history...")}
          </div>
        ) : error ? (
          <div className="rounded-xl bg-red-50 p-5 text-red-700">
            {error}
          </div>
        ) : history.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
            <div className="text-4xl">📁</div>

            <h2 className="mt-4 text-xl font-semibold text-slate-900">
              {translate("No history yet")}
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              {translate("Your saved results will appear here after using a tool.")}
            </p>

            <Link
              href={dashboardHref}
              className="mt-6 inline-block rounded-lg bg-violet-600 px-5 py-3 text-sm font-semibold text-white hover:bg-violet-700"
            >
              {translate("Go to Dashboard")}
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            <section className="space-y-3">
              <h2 className="font-semibold text-slate-800">
                {translate("Your history")} ({history.length})
              </h2>

              {history.map((item) => (
                <article
                  key={item.id}
                  className={`rounded-xl border bg-white p-4 shadow-sm ${
                    selected?.id === item.id
                      ? "border-violet-400"
                      : "border-slate-200"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => selectItem(item)}
                    className="w-full text-left"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
                        {translate(toolNames[item.tool_type] ?? item.tool_type)}
                      </span>

                      <span className="text-xs text-slate-400">
                        {formatDate(item.created_at)}
                      </span>
                    </div>

                    <h3 className="mt-3 break-all font-semibold text-slate-900">
                      {item.file_name}
                    </h3>

                    {item.output_file_name && (
                      <p className="mt-1 break-all text-xs text-slate-500">
                        {translate("Output:")} {item.output_file_name}
                      </p>
                    )}

                    {item.result_text && (
                      <p className="mt-3 line-clamp-2 text-sm text-slate-500">
                        {item.result_text}
                      </p>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => deleteItem(item)}
                    className="mt-4 text-sm font-medium text-red-600 hover:text-red-700"
                  >
                    {translate("Delete")}
                  </button>
                </article>
              ))}
            </section>

            <section>
              <h2 className="mb-3 font-semibold text-slate-800">
                {translate("History details")}
              </h2>

              {selected ? (
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
                    {translate(toolNames[selected.tool_type] ?? selected.tool_type)}
                  </span>

                  <h3 className="mt-4 break-all font-semibold text-slate-900">
                    {selected.file_name}
                  </h3>

                  <p className="mt-2 text-xs text-slate-400">
                    {formatDate(selected.created_at)}
                  </p>

                  {selected.language && (
                    <p className="mt-2 text-xs text-slate-500">
                      {translate("Language:")} {selected.language}
                    </p>
                  )}

                  {selected.result_text && (
                    <>
                      <textarea
                        readOnly
                        value={selected.result_text}
                        rows={12}
                        className="mt-5 w-full rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-800"
                      />

                      <button
                        type="button"
                        onClick={() => copyText(selected.result_text!)}
                        className="mt-3 rounded-lg bg-violet-600 px-5 py-3 text-sm font-semibold text-white hover:bg-violet-700"
                      >
                        {translate("Copy text")}
                      </button>
                    </>
                  )}

                  {loadingFile && (
                    <p className="mt-5 text-sm text-slate-500">
                      {translate("Loading saved file...")}
                    </p>
                  )}

                  {selectedUrl && selected.mime_type?.startsWith("image/") && (
                    <img
                loading="lazy"
                      src={selectedUrl}
                      alt={selected.output_file_name ?? selected.file_name}
                      className="mt-5 max-h-96 w-full rounded-lg border border-slate-200 object-contain"
                    />
                  )}

                  {selectedUrl &&
                    selected.mime_type === "application/pdf" && (
                      <iframe
                        src={selectedUrl}
                        title={translate("Saved PDF")}
                        className="mt-5 h-[500px] w-full rounded-lg border border-slate-200"
                      />
                    )}

                  {selectedUrl && (
                    <a
                      href={selectedUrl}
                      download={selected.output_file_name ?? selected.file_name}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-4 inline-block rounded-lg bg-violet-600 px-5 py-3 text-sm font-semibold text-white hover:bg-violet-700"
                    >
                      {translate("Download processed file")}
                    </a>
                  )}

                  {!selected.storage_path && !selected.result_text && (
                    <p className="mt-5 text-sm text-slate-500">
                      {translate("No saved output is available for this entry.")}
                    </p>
                  )}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
                  {translate("Select a history entry to view its details.")}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
