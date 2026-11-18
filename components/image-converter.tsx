
"use client";

import { useWorkspaceTranslation } from "@/lib/workspace-i18n";

import { useEffect, useRef, useState } from "react";
import { consumeLocalToolUsage, completeLocalToolUsage, releaseLocalToolUsage } from "@/lib/usage-client";
import {
  UploadCloud,
  Download,
  Image as ImageIcon,
  RefreshCw,
  X,
  CheckCircle2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type ImageFormat = "image/png" | "image/jpeg" | "image/webp";

const formats: { label: string; value: ImageFormat }[] = [
  { label: "PNG", value: "image/png" },
  { label: "JPG", value: "image/jpeg" },
  { label: "WEBP", value: "image/webp" },
];

function getOutputFileName(fileName: string, format: ImageFormat) {
  const extension =
    format === "image/jpeg" ? "jpg" : format.split("/")[1];

  const baseName = fileName.replace(/\.[^/.]+$/, "");

  return `${baseName}-converted.${extension}`;
}

export default function ImageConverter() {
  const translate = useWorkspaceTranslation();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const previewUrlRef = useRef("");
  const [convertedUrl, setConvertedUrl] = useState("");
  const [outputFormat, setOutputFormat] =
    useState<ImageFormat>("image/webp");
  const [quality, setQuality] = useState(85);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function updateFile(nextFile: File | null) {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = nextFile ? URL.createObjectURL(nextFile) : "";
    setPreview(previewUrlRef.current);
    setFile(nextFile);
  }

  useEffect(() => () => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
  }, []);

  useEffect(() => {
    return () => {
      if (convertedUrl) {
        URL.revokeObjectURL(convertedUrl);
      }
    };
  }, [convertedUrl]);

  function handleFileChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const selectedFile = event.target.files?.[0];

    setError("");
    setSuccess("");
    setConvertedUrl("");

    if (!selectedFile) return;

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(selectedFile.type)) {
      setError(translate("Please select a JPG, PNG or WEBP image."));
      event.target.value = "";
      return;
    }

    if (
      selectedFile.size === 0 ||
      selectedFile.size > 10 * 1024 * 1024
    ) {
      setError("Image size must be greater than 0 and less than 10 MB.");
      event.target.value = "";
      return;
    }

    updateFile(selectedFile);
  }

  function removeImage() {
    if (loading) return;

    updateFile(null);
    setConvertedUrl("");
    setError("");
    setSuccess("");
  }

  async function convertImage() {
    if (!file || loading) return;

    setLoading(true);
    setError("");
    setSuccess("");
    setConvertedUrl("");

    const supabase = createClient();

    let uploadedPath: string | null = null;
    let historyId: string | null = null;
    let pendingReservationId: string | null = null;

    try {
      const usageReservation = await consumeLocalToolUsage("image-converter");
      pendingReservationId = usageReservation;
      const image = new Image();
      const sourceUrl = URL.createObjectURL(file);

      let blob: Blob | null = null;

      try {
        await new Promise<void>((resolve, reject) => {
          image.onload = () => resolve();
          image.onerror = () =>
            reject(new Error(translate("Unable to load this image.")));
          image.src = sourceUrl;
        });

        const canvas = document.createElement("canvas");
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;

        const context = canvas.getContext("2d");

        if (!context) {
          throw new Error(
            translate("Your browser could not process this image.")
          );
        }

        // JPEG does not support transparency.
        if (outputFormat === "image/jpeg") {
          context.fillStyle = "#ffffff";
          context.fillRect(0, 0, canvas.width, canvas.height);
        }

        context.drawImage(image, 0, 0);

        blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob(
            (result) => {
              if (result) {
                resolve(result);
              } else {
                reject(new Error(translate("Image conversion failed.")));
              }
            },
            outputFormat,
            quality / 100
          );
        });

        if (blob.type !== outputFormat) {
          throw new Error(
            translate("Your browser does not support this output format.")
          );
        }
      } finally {
        URL.revokeObjectURL(sourceUrl);
      }

      if (!blob) {
        throw new Error(translate("Image conversion failed."));
      }

      // Authenticate the user.
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error(translate("Please log in again to save your result."));
      }

      const outputFileName = getOutputFileName(
        file.name,
        outputFormat
      );

      const extension =
        outputFormat === "image/jpeg"
          ? "jpg"
          : outputFormat.split("/")[1];

      const storagePath =
        `${user.id}/${crypto.randomUUID()}-converted.${extension}`;

      // Upload the converted image to private Supabase Storage.
      const { error: uploadError } = await supabase.storage
        .from("tool-history")
        .upload(storagePath, blob, {
          contentType: outputFormat,
          upsert: false,
        });

      if (uploadError) throw uploadError;

      uploadedPath = storagePath;

      // Create the history entry.
      const { data: historyRecord, error: historyError } =
        await supabase
          .from("tool_history")
          .insert({
            user_id: user.id,
            tool_type: "image-converter",
            file_name: file.name,
            output_file_name: outputFileName,
            storage_path: storagePath,
            mime_type: outputFormat,
            metadata: {
              original_size: file.size,
              converted_size: blob.size,
              output_format: outputFormat,
              quality,
              width: image.naturalWidth,
              height: image.naturalHeight,
            },
          })
          .select("id")
          .single();

      if (historyError) throw historyError;

      historyId = historyRecord.id;
      await completeLocalToolUsage(usageReservation);
      pendingReservationId = null;

      // Make the result available for download.
      const resultUrl = URL.createObjectURL(blob);

      setConvertedUrl(resultUrl);
      setSuccess(
        translate("Your image has been converted and saved to history successfully!")
      );
    } catch (err) {
      console.error("Image conversion error:", err);

      // Clean up the uploaded file and history if a later step fails.
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
          : "Something went wrong during conversion."
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

  function downloadImage() {
    if (!convertedUrl || !file) return;

    const link = document.createElement("a");
    link.href = convertedUrl;
    link.download = getOutputFileName(file.name, outputFormat);

    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <div className="flex items-start gap-4 text-left">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-violet-600">
          <RefreshCw size={28} />
        </div>

        <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">
          
          {translate("Image Format Converter")}
        </h2>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          
          {translate("Convert your images between PNG, JPG and WEBP. Your results are saved to your private history.")}
        </p>
        </div>
      </div>

      {!file ? (
        <label className="flex min-h-64 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-violet-300 bg-violet-50/50 px-6 py-10 text-center transition hover:border-violet-500 hover:bg-violet-50">
          <UploadCloud size={42} className="text-violet-600" />

          <span className="mt-4 font-semibold text-slate-800">
            
            {translate("Click to upload an image")}
          </span>

          <span className="mt-2 text-sm text-slate-500">
            
            {translate("JPG, PNG or WEBP — Maximum 10 MB")}
          </span>

          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleFileChange}
          />
        </label>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
                <ImageIcon size={22} />
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-800">
                  {file.name}
                </p>

                <p className="text-xs text-slate-500">
                  {(file.size / 1024 / 1024).toFixed(2)}  {translate("MB")}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={removeImage}
              disabled={loading}
              className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
              aria-label={translate("Remove image")}
            >
              <X size={20} />
            </button>
          </div>

          {preview && (
            <div className="mt-5 flex justify-center rounded-xl bg-slate-50 p-4">
              <img
                loading="lazy"
                src={preview}
                alt={translate("Original image preview")}
                className="max-h-72 max-w-full rounded-lg object-contain"
              />
            </div>
          )}

          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <div>
              <label
                htmlFor="output-format"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                
                {translate("Output format")}
              </label>

              <select
                id="output-format"
                value={outputFormat}
                disabled={loading}
                onChange={(event) => {
                  setOutputFormat(
                    event.target.value as ImageFormat
                  );
                  setConvertedUrl("");
                  setSuccess("");
                  setError("");
                }}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100 disabled:opacity-60"
              >
                {formats.map((format) => (
                  <option key={format.value} value={format.value}>
                    {format.label}
                  </option>
                ))}
              </select>
            </div>

            {outputFormat !== "image/png" && (
              <div>
                <div className="mb-2 flex justify-between">
                  <label
                    htmlFor="image-quality"
                    className="text-sm font-semibold text-slate-700"
                  >
                    
                    {translate("Image quality")}
                  </label>

                  <span className="text-sm font-bold text-violet-600">
                    {quality}%
                  </span>
                </div>

                <input
                  id="image-quality"
                  type="range"
                  min="10"
                  max="100"
                  value={quality}
                  disabled={loading}
                  onChange={(event) =>
                    setQuality(Number(event.target.value))
                  }
                  className="w-full accent-violet-600"
                />

                <p className="mt-1 text-xs text-slate-400">
                  
                  {translate("Higher quality usually means a larger file.")}
                </p>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={convertImage}
            disabled={loading}
            className="mt-7 flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3.5 font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <>
                <RefreshCw size={18} className="animate-spin" />
                
                {translate("Converting...")}
              </>
            ) : (
              <>
                <RefreshCw size={18} />
                
                {translate("Convert image")}
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
            onClick={downloadImage}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 px-5 py-3 font-semibold text-white transition hover:bg-green-700"
          >
            <Download size={18} />
            
            {translate("Download converted image")}
          </button>
        </div>
      )}
    </div>
  );
}
