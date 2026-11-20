
"use client";

import { useWorkspaceTranslation } from "@/lib/workspace-i18n";

import { useEffect, useRef, useState } from "react";
import { consumeLocalToolUsage, completeLocalToolUsage, releaseLocalToolUsage } from "@/lib/usage-client";
import {
  UploadCloud,
  Download,
  Image as ImageIcon,
  Minimize2,
  X,
  RefreshCw,
  CheckCircle2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type OutputFormat = "image/jpeg" | "image/png" | "image/webp";

function getOutputFileName(fileName: string, format: OutputFormat) {
  const extension =
    format === "image/jpeg" ? "jpg" : format.split("/")[1];

  const baseName = fileName.replace(/\.[^/.]+$/, "");

  return `${baseName}-compressed.${extension}`;
}

export default function ImageCompressor() {
  const translate = useWorkspaceTranslation();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const previewUrlRef = useRef("");
  const [compressedUrl, setCompressedUrl] = useState("");
  const [compressedSize, setCompressedSize] = useState(0);
  const [quality, setQuality] = useState(75);
  const [maxWidth, setMaxWidth] = useState(1920);
  const [outputFormat, setOutputFormat] =
    useState<OutputFormat>("image/webp");
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
      if (compressedUrl) {
        URL.revokeObjectURL(compressedUrl);
      }
    };
  }, [compressedUrl]);

  function handleFileChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const selectedFile = event.target.files?.[0];

    setError("");
    setSuccess("");
    setCompressedUrl("");
    setCompressedSize(0);

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

    if (selectedFile.size > 10 * 1024 * 1024) {
      setError(translate("Image size must be less than 10 MB."));
      event.target.value = "";
      return;
    }

    updateFile(selectedFile);
    setOutputFormat(selectedFile.type as OutputFormat);

    event.target.value = "";
  }

  function removeImage() {
    updateFile(null);
    setCompressedUrl("");
    setCompressedSize(0);
    setError("");
    setSuccess("");
  }

  async function compressImage() {
    if (!file || loading) return;

    setLoading(true);
    setError("");
    setSuccess("");
    setCompressedUrl("");
    setCompressedSize(0);

    const supabase = createClient();

    let uploadedPath: string | null = null;
    let historyId: string | null = null;
    let pendingReservationId: string | null = null;

    try {
      const usageReservation = await consumeLocalToolUsage("image-compressor");
      pendingReservationId = usageReservation;
      const sourceUrl = URL.createObjectURL(file);

      let blob: Blob;

      try {
        const image = new Image();

        await new Promise<void>((resolve, reject) => {
          image.onload = () => resolve();
          image.onerror = () =>
            reject(new Error(translate("Unable to load this image.")));
          image.src = sourceUrl;
        });

        const scale = Math.min(
          1,
          maxWidth / image.naturalWidth
        );

        const width = Math.max(
          1,
          Math.round(image.naturalWidth * scale)
        );

        const height = Math.max(
          1,
          Math.round(image.naturalHeight * scale)
        );

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const context = canvas.getContext("2d");

        if (!context) {
          throw new Error(
            translate("Your browser could not process this image.")
          );
        }

        if (outputFormat === "image/jpeg") {
          context.fillStyle = "#ffffff";
          context.fillRect(0, 0, width, height);
        }

        context.drawImage(image, 0, 0, width, height);

        blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob(
            (result) => {
              if (result) {
                resolve(result);
              } else {
                reject(new Error(translate("Image compression failed.")));
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
        `${user.id}/${crypto.randomUUID()}-compressed.${extension}`;

      // Upload the compressed image to private Supabase Storage.
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
            tool_type: "image-compressor",
            file_name: file.name,
            output_file_name: outputFileName,
            storage_path: storagePath,
            mime_type: outputFormat,
            metadata: {
              original_size: file.size,
              compressed_size: blob.size,
              quality,
              max_width: maxWidth,
              output_format: outputFormat,
            },
          })
          .select("id")
          .single();

      if (historyError) throw historyError;

      historyId = historyRecord.id;
      await completeLocalToolUsage(usageReservation);
      pendingReservationId = null;

      // Make the result available for download.
      const url = URL.createObjectURL(blob);

      setCompressedUrl(url);
      setCompressedSize(blob.size);

      const saved = file.size - blob.size;

      const percentage = Math.max(
        0,
        Math.round((saved / file.size) * 100)
      );

      setSuccess(
        saved > 0
          ? `Image compressed and saved to history successfully. You saved ${percentage}% of the original file size.`
          : "Image processed and saved to history successfully. The output file is not smaller than the original."
      );
    } catch (err) {
      console.error("Compression error:", err);

      // Clean up uploaded data if a later step failed.
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
          : translate("Something went wrong during compression.")
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
    if (!compressedUrl || !file) return;

    const link = document.createElement("a");
    link.href = compressedUrl;
    link.download = getOutputFileName(file.name, outputFormat);

    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  const savedBytes = file
    ? file.size - compressedSize
    : 0;

  const savedPercentage =
    file && compressedSize > 0
      ? Math.max(
          0,
          Math.round((savedBytes / file.size) * 100)
        )
      : 0;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <div className="flex items-start gap-4 text-left">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-violet-600">
          <Minimize2 size={28} />
        </div>

        <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">
          
          {translate("Image Compressor")}
        </h2>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          
          {translate("Reduce image file sizes and optimize your images. Your files stay on your device until you save the result to history.")}
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
                  
                  {translate("Original size:")} {(file.size / 1024 / 1024).toFixed(2)}  {translate("MB")}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={removeImage}
              aria-label={translate("Remove image")}
              className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600"
            >
              <X size={20} />
            </button>
          </div>

          {preview && (
            <div className="mt-5 flex justify-center rounded-xl bg-slate-50 p-4">
              <img
                loading="lazy"
                src={preview}
                alt={translate("Original image")}
                className="max-h-72 max-w-full rounded-lg object-contain"
              />
            </div>
          )}

          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <div>
              <label
                htmlFor="compress-format"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                
                {translate("Output format")}
              </label>

              <select
                id="compress-format"
                value={outputFormat}
                onChange={(event) => {
                  setOutputFormat(
                    event.target.value as OutputFormat
                  );
                  setCompressedUrl("");
                  setCompressedSize(0);
                  setSuccess("");
                }}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
              >
                <option value="image/webp">{translate("WEBP")}</option>
                <option value="image/jpeg">{translate("JPG")}</option>
                <option value="image/png">{translate("PNG")}</option>
              </select>
            </div>

            <div>
              <div className="mb-2 flex justify-between">
                <label
                  htmlFor="compress-quality"
                  className="text-sm font-semibold text-slate-700"
                >
                  
                  {translate("Quality")}
                </label>

                <span className="text-sm font-bold text-violet-600">
                  {quality}%
                </span>
              </div>

              <input
                id="compress-quality"
                type="range"
                min="10"
                max="100"
                value={quality}
                onChange={(event) => {
                  setQuality(Number(event.target.value));
                  setCompressedUrl("");
                  setCompressedSize(0);
                  setSuccess("");
                }}
                className="w-full accent-violet-600"
              />

              <p className="mt-1 text-xs text-slate-500">
                
                {translate("Lower quality usually creates smaller files.")}
              </p>
            </div>

            <div className="sm:col-span-2">
              <div className="mb-2 flex justify-between">
                <label
                  htmlFor="compress-width"
                  className="text-sm font-semibold text-slate-700"
                >
                  
                  {translate("Maximum image width")}
                </label>

                <span className="text-sm font-bold text-violet-600">
                  {maxWidth}{translate("px")}
                </span>
              </div>

              <input
                id="compress-width"
                type="range"
                min="320"
                max="3840"
                step="160"
                value={maxWidth}
                onChange={(event) => {
                  setMaxWidth(Number(event.target.value));
                  setCompressedUrl("");
                  setCompressedSize(0);
                  setSuccess("");
                }}
                className="w-full accent-violet-600"
              />

              <p className="mt-1 text-xs text-slate-500">
                
                {translate("Images smaller than this width will not be enlarged.")}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={compressImage}
            disabled={loading}
            className="mt-7 flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3.5 font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <>
                <RefreshCw size={18} className="animate-spin" />
                
                {translate("Compressing...")}
              </>
            ) : (
              <>
                <Minimize2 size={18} />
                
                {translate("Compress image")}
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

      {success && file && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-green-700">
            <CheckCircle2 size={18} />
            
            {translate("Compression result")}
          </div>

          <p className="mt-3 text-sm text-green-800">
            {success}
          </p>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-white p-4">
              <p className="text-xs text-slate-500">
                
                {translate("Original size")}
              </p>

              <p className="mt-1 font-bold text-slate-900">
                {(file.size / 1024 / 1024).toFixed(2)}  {translate("MB")}
              </p>
            </div>

            <div className="rounded-xl bg-white p-4">
              <p className="text-xs text-slate-500">
                
                {translate("Compressed size")}
              </p>

              <p className="mt-1 font-bold text-slate-900">
                {(compressedSize / 1024 / 1024).toFixed(2)}  {translate("MB")}
              </p>
            </div>

            <div className="col-span-2 rounded-xl bg-white p-4">
              <p className="text-xs text-slate-500">
                
                {translate("Space saved")}
              </p>

              <p className="mt-1 text-xl font-extrabold text-green-600">
                {savedBytes > 0
                  ? `${savedPercentage}%`
                  : "0%"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={downloadImage}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-green-700 px-5 py-3 font-semibold text-white transition hover:bg-green-800"
          >
            <Download size={18} />
            
            {translate("Download compressed image")}
          </button>
        </div>
      )}
    </div>
  );
}
