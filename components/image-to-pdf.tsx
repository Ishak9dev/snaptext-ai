
"use client";

import { useWorkspaceTranslation } from "@/lib/workspace-i18n";

import { useEffect, useRef, useState } from "react";
import { consumeLocalToolUsage, completeLocalToolUsage, releaseLocalToolUsage } from "@/lib/usage-client";
import { jsPDF } from "jspdf";
import {
  UploadCloud,
  FileText,
  Download,
  X,
  RefreshCw,
  CheckCircle2,
  FilePlus2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type PageSize = "a4" | "letter";
type Orientation = "portrait" | "landscape";

type ImageItem = {
  id: string;
  file: File;
  preview: string;
};

export default function ImageToPdf() {
  const translate = useWorkspaceTranslation();
  const [images, setImages] = useState<ImageItem[]>([]);
  const [pageSize, setPageSize] = useState<PageSize>("a4");
  const [orientation, setOrientation] =
    useState<Orientation>("portrait");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [pdfUrl, setPdfUrl] = useState("");

  const previewUrls = useRef(new Set<string>());

  useEffect(() => {
    return () => {
      previewUrls.current.forEach((url) =>
        URL.revokeObjectURL(url)
      );
      previewUrls.current.clear();
    };
  }, []);

  useEffect(() => {
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [pdfUrl]);

  function handleFiles(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const selectedFiles = Array.from(event.target.files ?? []);

    setError("");
    setSuccess("");
    setPdfUrl("");

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    const validFiles: File[] = [];
    const errors: string[] = [];

    for (const file of selectedFiles) {
      if (!allowedTypes.includes(file.type)) {
        errors.push(`${file.name}: unsupported image format.`);
        continue;
      }

      if (file.size === 0 || file.size > 10 * 1024 * 1024) {
        errors.push(`${file.name}: image must be smaller than 10 MB.`);
        continue;
      }

      validFiles.push(file);
    }

    const remaining = Math.max(0, 20 - images.length);
    const accepted = validFiles.slice(0, remaining);

    if (validFiles.length > remaining) {
      errors.push(translate("You can add a maximum of 20 images."));
    }

    const newItems = accepted.map((file) => {
      const preview = URL.createObjectURL(file);
      previewUrls.current.add(preview);

      return {
        id: crypto.randomUUID(),
        file,
        preview,
      };
    });

    setImages((previous) => [...previous, ...newItems]);

    if (errors.length > 0) {
      setError(errors.join(" "));
    }

    event.target.value = "";
  }

  function removeImage(id: string) {
    if (loading) return;

    const item = images.find((image) => image.id === id);

    if (item) {
      URL.revokeObjectURL(item.preview);
      previewUrls.current.delete(item.preview);
    }

    setImages((previous) =>
      previous.filter((image) => image.id !== id)
    );

    setPdfUrl("");
    setSuccess("");
    setError("");
  }

  function clearImages() {
    if (loading) return;

    images.forEach((item) => {
      URL.revokeObjectURL(item.preview);
      previewUrls.current.delete(item.preview);
    });

    setImages([]);
    setPdfUrl("");
    setSuccess("");
    setError("");
  }

  async function imageToPng(
    file: File
  ): Promise<{ data: string; width: number; height: number }> {
    const sourceUrl = URL.createObjectURL(file);

    try {
      const image = new Image();

      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () =>
          reject(new Error(`Could not load ${file.name}.`));
        image.src = sourceUrl;
      });

      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;

      const context = canvas.getContext("2d");

      if (!context) {
        throw new Error(translate("Could not process an image."));
      }

      context.drawImage(image, 0, 0);

      return {
        data: canvas.toDataURL("image/png"),
        width: canvas.width,
        height: canvas.height,
      };
    } finally {
      URL.revokeObjectURL(sourceUrl);
    }
  }

  async function generatePdf() {
    if (images.length === 0 || loading) return;

    setLoading(true);
    setError("");
    setSuccess("");
    setPdfUrl("");

    const supabase = createClient();

    let uploadedPath: string | null = null;
    let historyId: string | null = null;
    let pendingReservationId: string | null = null;

    try {
      const usageReservation = await consumeLocalToolUsage("image-to-pdf");
      pendingReservationId = usageReservation;
      const pdf = new jsPDF({
        orientation,
        unit: "mm",
        format: pageSize,
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      const margin = 10;
      const availableWidth = pageWidth - margin * 2;
      const availableHeight = pageHeight - margin * 2;

      for (let index = 0; index < images.length; index++) {
        const item = images[index];
        const converted = await imageToPng(item.file);

        if (index > 0) {
          pdf.addPage(pageSize, orientation);
        }

        const ratio = Math.min(
          availableWidth / converted.width,
          availableHeight / converted.height
        );

        const width = converted.width * ratio;
        const height = converted.height * ratio;

        const x = (pageWidth - width) / 2;
        const y = (pageHeight - height) / 2;

        pdf.addImage(
          converted.data,
          translate("PNG"),
          x,
          y,
          width,
          height
        );
      }

      const blob = pdf.output("blob");

      if (!blob || blob.size === 0) {
        throw new Error(translate("Could not create the PDF file."));
      }

      // Authenticate the user.
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error(translate("Please log in again to save your PDF."));
      }

      const outputFileName = "snaptext-images.pdf";
      const storagePath =
        `${user.id}/${crypto.randomUUID()}-images.pdf`;

      // Upload the PDF to private Supabase Storage.
      const { error: uploadError } = await supabase.storage
        .from("tool-history")
        .upload(storagePath, blob, {
          contentType: "application/pdf",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      uploadedPath = storagePath;

      // Record the PDF in shared history.
      const { data: historyRecord, error: historyError } =
        await supabase
          .from("tool_history")
          .insert({
            user_id: user.id,
            tool_type: "image-to-pdf",
            file_name: images.map((item) => item.file.name).join(", "),
            output_file_name: outputFileName,
            storage_path: storagePath,
            mime_type: "application/pdf",
            metadata: {
              image_count: images.length,
              page_size: pageSize,
              orientation,
              original_files: images.map((item) => ({
                name: item.file.name,
                size: item.file.size,
                type: item.file.type,
              })),
              pdf_size: blob.size,
            },
          })
          .select("id")
          .single();

      if (historyError) throw historyError;

      historyId = historyRecord.id;
      await completeLocalToolUsage(usageReservation);
      pendingReservationId = null;

      // Publish the download only after successful authorization.
      const url = URL.createObjectURL(blob);

      setPdfUrl(url);
      setSuccess(
        `Your PDF was created and saved to history with ${images.length} page(s).`
      );
    } catch (err) {
      console.error(translate("PDF generation error:"), err);

      // Clean up partially saved history if an operation fails.
      if (historyId) {
        await supabase
          .from("tool_history")
          .delete()
          .eq("id", historyId);
      }

      if (uploadedPath) {
        await supabase.storage
          .from("tool-history")
          .remove([uploadedPath]);
      }

      setError(
        err instanceof Error
          ? err.message
          : translate("Could not generate the PDF.")
      );
    } finally {
      if (pendingReservationId) {
        try {
          await releaseLocalToolUsage(pendingReservationId);
        } catch (releaseError) {
          console.error(translate("Could not release failed usage reservation"), releaseError);
        }
      }
      setLoading(false);
    }
  }

  function downloadPdf() {
    if (!pdfUrl) return;

    const link = document.createElement("a");
    link.href = pdfUrl;
    link.download = "snaptext-images.pdf";

    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <div className="flex items-start gap-4 text-left">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-violet-600">
          <FileText size={28} />
        </div>

        <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">
          
          {translate("Image to PDF Converter")}
        </h2>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          
          {translate("Convert multiple images into one PDF document. Your generated PDF is saved to your private history.")}
        </p>
        </div>
      </div>

      <label className="flex min-h-64 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-violet-300 bg-violet-50/50 px-6 py-10 text-center transition hover:border-violet-500 hover:bg-violet-50">
        <UploadCloud size={40} className="text-violet-600" />

        <span className="mt-4 font-semibold text-slate-800">
          
          {translate("Select images to convert")}
        </span>

        <span className="mt-2 text-sm text-slate-500">
          
          {translate("JPG, PNG or WEBP · Maximum 10 MB per image · Up to 20 images")}
        </span>

        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="hidden"
          onChange={handleFiles}
          disabled={loading || images.length >= 20}
        />
      </label>

      {images.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-slate-900">
                
                {translate("Selected images")}
              </h3>

              <p className="mt-1 text-xs text-slate-500">
                {images.length}  {translate("of 20 images · Each image becomes one PDF page")}
              </p>
            </div>

            <button
              type="button"
              onClick={clearImages}
              disabled={loading}
              className="text-sm font-semibold text-red-500 hover:text-red-700 disabled:opacity-50"
            >
              
              {translate("Remove all")}
            </button>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {images.map((item, index) => (
              <div
                key={item.id}
                className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-50"
              >
                <img
                loading="lazy"
                  src={item.preview}
                  alt={item.file.name}
                  className="h-32 w-full object-contain p-2"
                />

                <div className="flex items-center justify-between gap-2 border-t border-slate-200 bg-white px-2 py-2">
                  <span className="truncate text-xs text-slate-600">
                    {index + 1}. {item.file.name}
                  </span>

                  <button
                    type="button"
                    onClick={() => removeImage(item.id)}
                    disabled={loading}
                    aria-label={`Remove ${item.file.name}`}
                    className="shrink-0 rounded-md p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-7 grid gap-5 sm:grid-cols-2">
            <div>
              <label
                htmlFor="pdf-page-size"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                
                {translate("PDF page size")}
              </label>

              <select
                id="pdf-page-size"
                value={pageSize}
                disabled={loading}
                onChange={(event) =>
                  setPageSize(event.target.value as PageSize)
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100 disabled:opacity-60"
              >
                <option value="a4">{translate("A4")}</option>
                <option value="letter">{translate("Letter")}</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="pdf-orientation"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                
                {translate("Orientation")}
              </label>

              <select
                id="pdf-orientation"
                value={orientation}
                disabled={loading}
                onChange={(event) =>
                  setOrientation(event.target.value as Orientation)
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100 disabled:opacity-60"
              >
                <option value="portrait">{translate("Portrait")}</option>
                <option value="landscape">{translate("Landscape")}</option>
              </select>
            </div>
          </div>

          <button
            type="button"
            onClick={generatePdf}
            disabled={loading || images.length === 0}
            className="mt-7 flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3.5 font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <>
                <RefreshCw size={18} className="animate-spin" />
                
                {translate("Creating PDF...")}
              </>
            ) : (
              <>
                <FilePlus2 size={18} />
                
                {translate("Create PDF")}
              </>
            )}
          </button>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-green-700">
            <CheckCircle2 size={18} />
            {success}
          </div>

          <button
            type="button"
            onClick={downloadPdf}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 px-5 py-3 font-semibold text-white transition hover:bg-green-700"
          >
            <Download size={18} />
            
            {translate("Download PDF")}
          </button>
        </div>
      )}
    </div>
  );
}
