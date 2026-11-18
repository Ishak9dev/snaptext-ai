
"use client";

import { useWorkspaceTranslation } from "@/lib/workspace-i18n";

import { useEffect, useState } from "react";
import { consumeLocalToolUsage, completeLocalToolUsage, releaseLocalToolUsage } from "@/lib/usage-client";
import {
  Upload,
  Image as ImageIcon,
  Download,
  Trash2,
  ShieldCheck,
  Loader2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type OutputFormat = "image/png" | "image/jpeg" | "image/webp";

function getOutputFileName(
  fileName: string,
  format: OutputFormat
) {
  const extension =
    format === "image/jpeg"
      ? "jpg"
      : format === "image/png"
        ? "png"
        : "webp";

  const baseName = fileName.replace(/\.[^/.]+$/, "");

  return `${baseName}-cleaned.${extension}`;
}

export default function ImageMetadataRemover() {
  const translate = useWorkspaceTranslation();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [resultUrl, setResultUrl] = useState("");
  const [outputFormat, setOutputFormat] =
    useState<OutputFormat>("image/jpeg");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  useEffect(() => {
    return () => {
      if (resultUrl) URL.revokeObjectURL(resultUrl);
    };
  }, [resultUrl]);

  function handleFileChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const selectedFile = event.target.files?.[0];

    setError("");
    setSuccess("");
    setResultUrl("");

    if (!selectedFile) return;

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(selectedFile.type)) {
      setError(translate("Please upload a JPG, PNG, or WEBP image."));
      event.target.value = "";
      return;
    }

    if (
      selectedFile.size === 0 ||
      selectedFile.size > 10 * 1024 * 1024
    ) {
      setError(
        translate("The image must be greater than 0 and smaller than 10 MB.")
      );
      event.target.value = "";
      return;
    }

    setFile(selectedFile);
    setPreview(URL.createObjectURL(selectedFile));

    if (selectedFile.type === "image/png") {
      setOutputFormat("image/png");
    } else if (selectedFile.type === "image/webp") {
      setOutputFormat("image/webp");
    } else {
      setOutputFormat("image/jpeg");
    }

    event.target.value = "";
  }

  function removeImage() {
    if (loading) return;

    setFile(null);
    setPreview("");
    setResultUrl("");
    setError("");
    setSuccess("");
  }

  async function removeMetadata() {
    if (!file || !preview || loading) return;

    setLoading(true);
    setError("");
    setSuccess("");
    setResultUrl("");

    const supabase = createClient();

    let uploadedPath: string | null = null;
    let historyId: string | null = null;
    let pendingReservationId: string | null = null;

    try {
      const usageReservation = await consumeLocalToolUsage("metadata-remover");
      pendingReservationId = usageReservation;
      const image = new Image();
      image.src = preview;

      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () =>
          reject(new Error(translate("Could not load the image.")));
      });

      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;

      const context = canvas.getContext("2d");

      if (!context) {
        throw new Error(translate("Could not process this image."));
      }

      if (outputFormat === "image/jpeg") {
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, canvas.width, canvas.height);
      }

      context.drawImage(image, 0, 0);

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (result) => {
            if (result) {
              resolve(result);
            } else {
              reject(
                new Error(translate("Could not create the cleaned image."))
              );
            }
          },
          outputFormat,
          0.92
        );
      });

      if (blob.type !== outputFormat || blob.size === 0) {
        throw new Error(
          translate("Your browser could not create the requested image format.")
        );
      }

      // Authenticate the user.
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error(
          translate("Please log in again to save your cleaned image.")
        );
      }

      const outputFileName = getOutputFileName(
        file.name,
        outputFormat
      );

      const extension =
        outputFormat === "image/jpeg"
          ? "jpg"
          : outputFormat === "image/png"
            ? "png"
            : "webp";

      const storagePath =
        `${user.id}/${crypto.randomUUID()}-cleaned.${extension}`;

      // Upload the cleaned image to private Supabase Storage.
      const { error: uploadError } = await supabase.storage
        .from("tool-history")
        .upload(storagePath, blob, {
          contentType: outputFormat,
          upsert: false,
        });

      if (uploadError) throw uploadError;

      uploadedPath = storagePath;

      // Save the operation in shared tool history.
      const { data: historyRecord, error: historyError } =
        await supabase
          .from("tool_history")
          .insert({
            user_id: user.id,
            tool_type: "metadata-remover",
            file_name: file.name,
            output_file_name: outputFileName,
            storage_path: storagePath,
            mime_type: outputFormat,
            metadata: {
              original_size: file.size,
              cleaned_size: blob.size,
              output_format: outputFormat,
              width: canvas.width,
              height: canvas.height,
              quality: 92,
            },
          })
          .select("id")
          .single();

      if (historyError) throw historyError;

      historyId = historyRecord.id;
      await completeLocalToolUsage(usageReservation);
      pendingReservationId = null;

      // Make the cleaned image available for download.
      const url = URL.createObjectURL(blob);

      setResultUrl(url);
      setSuccess(
        translate("Image cleaned and saved to your private history successfully.")
      );
    } catch (err) {
      console.error("Metadata removal error:", err);

      // Remove partially saved history and uploaded file.
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
          : translate("Something went wrong while processing the image.")
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
    if (!resultUrl || !file) return;

    const link = document.createElement("a");
    link.href = resultUrl;
    link.download = getOutputFileName(file.name, outputFormat);

    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-xl bg-violet-100 p-3 text-violet-700">
            <ShieldCheck size={24} />
          </div>

          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              
              {translate("Image Metadata Remover")}
            </h2>

            <p className="text-sm text-gray-500">
              
              {translate("Remove common metadata from your images privately.")}
            </p>
          </div>
        </div>

        {!file ? (
          <label className="flex min-h-64 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-violet-300 bg-violet-50/50 px-6 py-10 text-center transition hover:border-violet-500 hover:bg-violet-50">
            <Upload className="mb-3 text-violet-600" size={32} />

            <span className="font-medium text-gray-800">
              
              {translate("Click to upload an image")}
            </span>

            <span className="mt-1 text-sm text-gray-500">
              
              {translate("JPG, PNG or WEBP · Maximum 10 MB")}
            </span>

            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        ) : (
          <div className="space-y-5">
            <div className="overflow-hidden rounded-xl border border-gray-200">
              <img
                loading="lazy"
                src={preview}
                alt={translate("Original image preview")}
                className="max-h-80 w-full object-contain"
              />

              <div className="flex items-center justify-between gap-3 border-t p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-800">
                    {file.name}
                  </p>

                  <p className="text-xs text-gray-500">
                    {(file.size / 1024).toFixed(1)}  {translate("KB")}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={removeImage}
                  disabled={loading}
                  className="rounded-lg p-2 text-red-500 hover:bg-red-50 disabled:opacity-50"
                  aria-label={translate("Remove image")}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>

            <div>
              <label
                htmlFor="metadata-output-format"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                
                {translate("Output format")}
              </label>

              <select
                id="metadata-output-format"
                value={outputFormat}
                disabled={loading}
                onChange={(event) => {
                  setOutputFormat(
                    event.target.value as OutputFormat
                  );
                  setResultUrl("");
                  setError("");
                  setSuccess("");
                }}
                className="w-full rounded-lg border border-gray-300 bg-white p-3 text-sm outline-none focus:border-violet-500 disabled:opacity-60"
              >
                <option value="image/jpeg">{translate("JPG")}</option>
                <option value="image/png">{translate("PNG")}</option>
                <option value="image/webp">{translate("WEBP")}</option>
              </select>
            </div>

            <button
              type="button"
              onClick={removeMetadata}
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3 font-medium text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  
                  {translate("Removing metadata...")}
                </>
              ) : (
                <>
                  <ShieldCheck size={18} />
                  
                  {translate("Remove Metadata")}
                </>
              )}
            </button>

            {resultUrl && (
              <button
                type="button"
                onClick={downloadImage}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-5 py-3 font-medium text-violet-700 hover:bg-violet-100"
              >
                <Download size={18} />
                
                {translate("Download Clean Image")}
              </button>
            )}
          </div>
        )}

        {error && (
          <p
            role="alert"
            className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600"
          >
            {error}
          </p>
        )}

        {success && (
          <p className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">
            {success}
          </p>
        )}
      </div>

      <div className="rounded-xl border border-violet-100 bg-violet-50/60 p-4">
        <div className="flex items-start gap-3">
          <ImageIcon className="mt-0.5 text-violet-600" size={20} />

          <div>
            <h3 className="font-medium text-gray-900">
              
              {translate("Privacy information")}
            </h3>

            <p className="mt-1 text-sm text-gray-600">
              
              {translate("The original image is processed in your browser and is not uploaded. The cleaned output is securely saved in your private history so you can download it later. Re-encoding removes common embedded metadata, such as EXIF information, but does not guarantee complete forensic metadata removal.")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
