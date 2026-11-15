"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import { createWorker } from "tesseract.js";
import { createClient } from "@/lib/supabase/client";
const MAX_FILE_SIZE = 10 * 1024 * 1024;

type OcrLanguage = "eng" | "fra" | "both";
type UiLanguage = "en" | "fr";

const translations = {
  en: {
    badge: "IMAGE TO TEXT",
    title: "Convert your image into text",
    subtitle: "Upload an image and extract its text automatically.",
    upload: "Click to upload your image",
    formats: "JPG, PNG or WebP · Maximum 10 MB",
    select: "Select an image",
    selected: "Image selected successfully!",
    remove: "Remove image",
    recognition: "Recognition language",
    both: "English + French",
    english: "English",
    french: "French",
    extract: "Extract text",
    extracting: "Extracting text...",
    processing: "Processing...",
    initializing: "Initializing OCR engine...",
    recognizing: "Recognizing text...",
    completed: "Text extraction completed!",
    noText: "No text was detected. Try uploading a clearer image.",
    extractionError:
      "Text extraction failed. Check your internet connection and try again.",
    invalidType: "Please upload a JPG, PNG or WebP image.",
    tooLarge: "Your image must be smaller than 10 MB.",
    extracted: "Extracted text",
    words: "words",
    placeholder: "Your extracted text will appear here...",
    copy: "Copy text",
    copied: "Text copied successfully!",
    copiedNotice: "Text copied to clipboard!",
    copyError: "Unable to copy text. Please copy it manually.",
    download: "Download TXT",
    privacy: "Images are processed locally in your browser.",
    languageLabel: "Interface language",
    save: "Save to history",
saving: "Saving...",
saved: "Extraction saved successfully!",
saveError: "Unable to save extraction. Please try again.",
loginRequired: "Please log in to save your extraction.",
  },
  fr: {
    badge: "IMAGE EN TEXTE",
    title: "Convertissez votre image en texte",
    subtitle: "Importez une image et extrayez automatiquement son texte.",
    upload: "Cliquez pour importer votre image",
    formats: "JPG, PNG ou WebP · Maximum 10 Mo",
    select: "Choisir une image",
    selected: "Image importée avec succès !",
    remove: "Supprimer l'image",
    recognition: "Langue de reconnaissance",
    both: "Anglais + Français",
    english: "Anglais",
    french: "Français",
    extract: "Extraire le texte",
    extracting: "Extraction en cours...",
    processing: "Traitement en cours...",
    initializing: "Initialisation du moteur OCR...",
    recognizing: "Reconnaissance du texte...",
    completed: "Extraction du texte terminée !",
    noText: "Aucun texte détecté. Essayez avec une image plus nette.",
    extractionError:
      "Échec de l'extraction. Vérifiez votre connexion Internet et réessayez.",
    invalidType: "Veuillez importer une image JPG, PNG ou WebP.",
    tooLarge: "Votre image doit faire moins de 10 Mo.",
    extracted: "Texte extrait",
    words: "mots",
    placeholder: "Votre texte extrait apparaîtra ici...",
    copy: "Copier le texte",
    copied: "Texte copié avec succès !",
    copiedNotice: "Texte copié dans le presse-papiers !",
    copyError:
      "Impossible de copier le texte. Veuillez le copier manuellement.",
    download: "Télécharger TXT",
    privacy: "Les images sont traitées localement dans votre navigateur.",
    languageLabel: "Langue de l'interface",
    save: "Enregistrer dans l'historique",
saving: "Enregistrement...",
saved: "Extraction enregistrée avec succès !",
saveError: "Impossible d'enregistrer l'extraction. Réessayez.",
loginRequired: "Veuillez vous connecter pour enregistrer votre extraction.",
  },
};

export default function OcrWorkspace() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [error, setError] = useState("");
  const [language, setLanguage] = useState<OcrLanguage>("both");
  const [uiLanguage, setUiLanguage] = useState<UiLanguage>("en");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");

  const t = translations[uiLanguage];
const [saving, setSaving] = useState(false);
const [saveMessage, setSaveMessage] = useState("");
  useEffect(() => {
    if (!file) {
      setPreviewUrl("");
      return;
    }

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    return () => URL.revokeObjectURL(url);
  }, [file]);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0];

    setError("");
    setResult("");
    setStatus("");
    setProgress(0);

    if (!selectedFile) return;

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(selectedFile.type)) {
      setError(t.invalidType);
      event.target.value = "";
      return;
    }

    if (selectedFile.size > MAX_FILE_SIZE) {
      setError(t.tooLarge);
      event.target.value = "";
      return;
    }

    setFile(selectedFile);
  }

  function removeImage() {
    setFile(null);
    setResult("");
    setError("");
    setStatus("");
    setProgress(0);

    const input = document.getElementById(
      "ocr-image"
    ) as HTMLInputElement | null;

    if (input) {
      input.value = "";
    }
  }

  function translateOcrStatus(message: string) {
    if (uiLanguage === "en") return message;

    const normalized = message.toLowerCase();

    if (normalized.includes("loading tesseract core")) {
      return "Chargement du moteur OCR...";
    }
    if (normalized.includes("initializing tesseract")) {
      return "Initialisation de Tesseract...";
    }
    if (normalized.includes("loading language")) {
      return "Chargement des langues...";
    }
    if (normalized.includes("initializing api")) {
      return "Préparation de la reconnaissance...";
    }
    if (normalized.includes("recognizing text")) {
      return t.recognizing;
    }

    return t.processing;
  }

  async function extractText() {
    if (!file) return;

    setLoading(true);
    setError("");
    setResult("");
    setProgress(0);
    setStatus(t.initializing);

    let worker: Awaited<ReturnType<typeof createWorker>> | null = null;

    try {
      const languages =
        language === "both"
          ? ["eng", "fra"]
          : [language];

      worker = await createWorker(languages, 1, {
        logger: (message) => {
          setStatus(translateOcrStatus(message.status));
          setProgress(
            Math.round((message.progress ?? 0) * 100)
          );
        },
      });

      setStatus(t.recognizing);

      const { data } = await worker.recognize(file);
      const extractedText = data.text.trim();

      if (!extractedText) {
        setError(t.noText);
      } else {
        setResult(extractedText);
        setStatus(t.completed);
        setProgress(100);
      }
    } catch (err) {
      console.error("OCR error:", err);

      setError(t.extractionError);
      setStatus("");
    } finally {
      if (worker) {
        await worker.terminate();
      }

      setLoading(false);
    }
  }
async function saveExtraction() {
  if (!file || !result.trim()) return;

  setSaving(true);
  setError("");
  setSaveMessage("");

  try {
    const supabase = createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) throw userError;

    if (!user) {
      setError(t.loginRequired);
      return;
    }

    const { error: insertError } = await supabase
      .from("extractions")
      .insert({
        user_id: user.id,
        file_name: file.name,
        extracted_text: result,
        language: language,
      });

    if (insertError) throw insertError;

    setSaveMessage(t.saved);
  } catch (err) {
    console.error("Save extraction error:", err);
    setError(t.saveError);
  } finally {
    setSaving(false);
  }
}
  async function copyText() {
    try {
      await navigator.clipboard.writeText(result);
      setStatus(t.copied);
    } catch {
      setError(t.copyError);
    }
  }

  function downloadText() {
    const blob = new Blob([result], {
      type: "text/plain;charset=utf-8",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "snaptext-extracted-text.txt";
    document.body.appendChild(link);
    link.click();
    link.remove();

    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <section className="mt-10 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-end gap-3">
        <label
          htmlFor="ui-language"
          className="text-sm font-medium text-slate-600"
        >
          {t.languageLabel}
        </label>

        <select
          id="ui-language"
          value={uiLanguage}
          onChange={(e) =>
            setUiLanguage(e.target.value as UiLanguage)
          }
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
        >
          <option value="en">English</option>
          <option value="fr">Français</option>
        </select>
      </div>

      <div className="text-center">
        <span className="inline-flex rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700">
          {t.badge}
        </span>

        <h2 className="mt-4 text-2xl font-bold text-slate-900">
          {t.title}
        </h2>

        <p className="mt-2 text-sm text-slate-500">
          {t.subtitle}
        </p>
      </div>

      {!file ? (
        <label
          htmlFor="ocr-image"
          className="mt-8 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-violet-300 bg-violet-50/50 px-6 py-14 text-center transition hover:border-violet-500 hover:bg-violet-50"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-violet-100 text-3xl">
            📄
          </div>

          <p className="mt-5 font-semibold text-slate-800">
            {t.upload}
          </p>

          <p className="mt-2 text-sm text-slate-500">
            {t.formats}
          </p>

          <span className="mt-6 rounded-lg bg-violet-600 px-6 py-3 text-sm font-semibold text-white">
            {t.select}
          </span>

          <input
            id="ocr-image"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            className="hidden"
          />
        </label>
      ) : (
        <div className="mt-8 rounded-xl border border-slate-200 p-5">
          <div className="flex flex-col gap-5 sm:flex-row">
            {previewUrl && (
              <img
                src={previewUrl}
                alt="Selected image preview"
                className="max-h-72 w-full rounded-lg border border-slate-200 object-contain sm:w-1/2"
              />
            )}

            <div className="flex flex-1 flex-col justify-center">
              <p className="font-semibold text-slate-900">
                {t.selected}
              </p>

              <p className="mt-2 break-all text-sm text-slate-500">
                {file.name}
              </p>

              <p className="mt-1 text-xs text-slate-400">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>

              <button
                type="button"
                disabled={loading}
                onClick={removeImage}
                className="mt-5 w-fit rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                {t.remove}
              </button>
            </div>
          </div>
        </div>
      )}

      {file && (
        <div className="mt-8 space-y-5">
          <div>
            <label
              htmlFor="ocr-language"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              {t.recognition}
            </label>

            <select
              id="ocr-language"
              value={language}
              disabled={loading}
              onChange={(e) =>
                setLanguage(e.target.value as OcrLanguage)
              }
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
            >
              <option value="both">{t.both}</option>
              <option value="eng">{t.english}</option>
              <option value="fra">{t.french}</option>
            </select>
          </div>

          <button
            type="button"
            onClick={extractText}
            disabled={loading}
            className="w-full rounded-lg bg-violet-600 px-5 py-3 font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? t.extracting : t.extract}
          </button>
        </div>
      )}

      {loading && (
        <div className="mt-6 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">
              {status || t.processing}
            </span>

            <span className="font-semibold text-violet-700">
              {progress}%
            </span>
          </div>

          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-violet-600 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {error && (
        <p
          role="alert"
          className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </p>
      )}

      {result && (
        <div className="mt-8">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-semibold text-slate-900">
              {t.extracted}
            </h3>

            <span className="text-xs text-slate-400">
              {result.trim().split(/\s+/).filter(Boolean).length}{" "}
              {t.words}
            </span>
          </div>

          <textarea
            value={result}
            onChange={(e) => setResult(e.target.value)}
            rows={10}
            className="w-full rounded-xl border border-slate-300 p-4 text-sm leading-6 text-slate-800 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
            placeholder={t.placeholder}
          />

          <div className="mt-4 flex flex-wrap gap-3">
         <button
  type="button"
  onClick={saveExtraction}
  disabled={saving}
  className="rounded-lg border border-violet-300 bg-violet-50 px-5 py-3 text-sm font-semibold text-violet-700 transition hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-60"
>
  {saving ? t.saving : t.save}
</button>

            <button
              type="button"
              onClick={downloadText}
              className="rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              {t.download}
            </button>
          </div>
{saveMessage && (
  <p className="mt-3 text-sm text-green-700">
    {saveMessage}
  </p>
)}
          {status === t.copied && (
            <p className="mt-3 text-sm text-green-700">
              {t.copiedNotice}
            </p>
          )}
        </div>
        
      )}

      <p className="mt-6 text-center text-xs text-slate-400">
        {t.privacy}
      </p>
    </section>
  );
}