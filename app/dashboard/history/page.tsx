
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Extraction = {
  id: string;
  file_name: string;
  extracted_text: string;
  language: string;
  created_at: string;
};

export default function HistoryPage() {
  const [extractions, setExtractions] = useState<Extraction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Extraction | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadHistory() {
      const supabase = createClient();

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        window.location.href = "/login";
        return;
      }

      const { data, error: historyError } = await supabase
        .from("extractions")
        .select("id, file_name, extracted_text, language, created_at")
        .order("created_at", { ascending: false });

      if (historyError) {
        console.error(historyError);
        setError("Unable to load your history. Please try again.");
      } else {
        setExtractions(data ?? []);
      }

      setLoading(false);
    }

    loadHistory();
  }, []);

 async function copyText(text: string) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
    } else {
      const textarea = document.createElement("textarea");

      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";

      document.body.appendChild(textarea);
      textarea.select();

      const copied = document.execCommand("copy");
      textarea.remove();

      if (!copied) {
        throw new Error("Copy command failed");
      }
    }

    setMessage("Text copied successfully!");
  } catch (error) {
    console.error("Copy error:", error);
    setMessage("Unable to copy text. Please try again.");
  }
}

  async function deleteExtraction(id: string) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this extraction?"
    );

    if (!confirmed) return;

    const supabase = createClient();

    const { error: deleteError } = await supabase
      .from("extractions")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error(deleteError);
      setMessage("Unable to delete this extraction.");
      return;
    }

    setExtractions((current) =>
      current.filter((item) => item.id !== id)
    );

    if (selected?.id === id) {
      setSelected(null);
    }

    setMessage("Extraction deleted successfully!");
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700">
              SNAPTEXT AI
            </span>

            <h1 className="mt-4 text-3xl font-bold text-slate-900">
              Extraction History
            </h1>

            <p className="mt-2 text-slate-500">
              View and manage your saved extractions.
            </p>
          </div>

          <Link
            href="/dashboard"
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            Back to Dashboard
          </Link>
        </div>

       {message && (
  <div
    role="status"
    aria-live="polite"
    className="mb-5 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-4 text-sm font-medium text-green-700"
  >
    <span>✓</span>
    <span>{message}</span>
  </div>
)}

        {loading ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">
            Loading your history...
          </div>
        ) : error ? (
          <div className="rounded-xl bg-red-50 p-5 text-red-700">
            {error}
          </div>
        ) : extractions.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
            <div className="text-4xl">📄</div>
            <h2 className="mt-4 text-xl font-semibold text-slate-900">
              No extractions yet
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Your saved OCR results will appear here.
            </p>
            <Link
              href="/dashboard"
              className="mt-6 inline-block rounded-lg bg-violet-600 px-5 py-3 text-sm font-semibold text-white hover:bg-violet-700"
            >
              Extract text
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            <section className="space-y-3">
              <h2 className="font-semibold text-slate-800">
                Your saved extractions ({extractions.length})
              </h2>

              {extractions.map((item) => (
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
                    onClick={() => {
                      setSelected(item);
                      setMessage("");
                    }}
                    className="w-full text-left"
                  >
                    <h3 className="break-all font-semibold text-slate-900">
                      {item.file_name}
                    </h3>

                    <p className="mt-1 text-xs text-slate-400">
                      {new Date(item.created_at).toLocaleString()}
                    </p>

                    <p className="mt-3 line-clamp-2 text-sm text-slate-500">
                      {item.extracted_text}
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => deleteExtraction(item.id)}
                    className="mt-4 text-sm font-medium text-red-600 hover:text-red-700"
                  >
                    Delete
                  </button>
                </article>
              ))}
            </section>

            <section>
              <h2 className="mb-3 font-semibold text-slate-800">
                Extraction details
              </h2>

              {selected ? (
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h3 className="break-all font-semibold text-slate-900">
                    {selected.file_name}
                  </h3>

                  <p className="mt-2 text-xs text-slate-400">
                    Language: {selected.language}
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    {new Date(selected.created_at).toLocaleString()}
                  </p>

                  <textarea
                    readOnly
                    value={selected.extracted_text}
                    rows={12}
                    className="mt-5 w-full rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-800"
                  />

                  <button
                    type="button"
                    onClick={() => copyText(selected.extracted_text)}
                    className="mt-4 rounded-lg bg-violet-600 px-5 py-3 text-sm font-semibold text-white hover:bg-violet-700"
                  >
                    Copy text
                  </button>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
                  Select an extraction to view its full text.
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
