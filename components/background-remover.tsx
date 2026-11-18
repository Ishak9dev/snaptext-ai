
"use client";

import { useWorkspaceTranslation } from "@/lib/workspace-i18n";

import { useEffect, useRef, useState } from "react";
import {
  Upload,
  Image as ImageIcon,
  Download,
  Trash2,
  Scissors,
  Loader2,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const MAX_FILE_SIZE = 4 * 1024 * 1024;

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

export default function BackgroundRemover() {
  const translate = useWorkspaceTranslation();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [resultUrl, setResultUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const inputRef = useRef<HTMLInputElement>(null);

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

    if (!ALLOWED_TYPES.includes(selectedFile.type)) {
      setError(translate("Please upload a JPG, PNG or WEBP image."));
      event.target.value = "";
      return;
    }

    if (
      selectedFile.size === 0 ||
      selectedFile.size > MAX_FILE_SIZE
    ) {
      setError(translate("Your image must be smaller than 4 MB."));
      event.target.value = "";
      return;
    }

    setFile(selectedFile);
    setPreview(URL.createObjectURL(selectedFile));
  }

  function removeImage() {
    if (loading) return;

    setFile(null);
    setPreview("");
    setResultUrl("");
    setError("");
    setSuccess("");

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  async function processImage() {
    if (!file || loading) return;

    setLoading(true);
    setError("");
    setSuccess("");
    setResultUrl("");

    const supabase = createClient();

    let uploadedPath: string | null = null;
    let historyId: string | null = null;

    try {
      // Authenticate the user before processing.
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error(translate("Please log in again to use this tool."));
      }

      // Send the original image to the background removal API.
      const formData = new FormData();
      formData.append("image", file);

      const response = await fetch("/api/remove-background", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        let message = translate("Could not remove the background.");

        try {
          const data = await response.json();

          if (typeof data.error === "string") {
            message = data.error;
          }
        } catch {
          // Keep the default error message.
        }

        throw new Error(message);
      }

      const blob = await response.blob();

      if (
        blob.size === 0 ||
        blob.type !== "image/png"
      ) {
        throw new Error(translate("The API returned an invalid image."));
      }

      const outputFileName = file.name.replace(
        /\.[^/.]+$/,
        ""
      ) + "-background-removed.png";

      const storagePath =
        `${user.id}/${crypto.randomUUID()}-background-removed.png`;

      // Upload the processed PNG to private Supabase Storage.
      const { error: uploadError } = await supabase.storage
        .from("tool-history")
        .upload(storagePath, blob, {
          contentType: "image/png",
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
            tool_type: "background-remover",
            file_name: file.name,
            output_file_name: outputFileName,
            storage_path: storagePath,
            mime_type: "image/png",
            metadata: {
              original_size: file.size,
              result_size: blob.size,
              original_format: file.type,
              output_format: "image/png",
              provider: "remove.bg",
            },
          })
          .select("id")
          .single();

      if (historyError) throw historyError;

      historyId = historyRecord.id;

      // Publish the result after successful authorization.
      const url = URL.createObjectURL(blob);

      setResultUrl(url);
      setSuccess(
        translate("Background removed and saved to your private history successfully!")
      );
    } catch (err) {
      console.error(translate("Background removal error:"), err);

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
          : translate("An unexpected error occurred.")
      );
    } finally {
      setLoading(false);
    }
  }

  function downloadImage() {
    if (!resultUrl) return;

    const link = document.createElement("a");
    link.href = resultUrl;
    link.download = file
      ? file.name.replace(/\.[^/.]+$/, "") +
        "-background-removed.png"
      : "snaptext-background-removed.png";

    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <div className="rounded-2xl border border-violet-100 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-8 flex items-center gap-3">
          <div className="rounded-xl bg-violet-100 p-3 text-violet-700">
            <Scissors size={25} />
          </div>

          <div>
            <h2 className="text-xl font-bold text-slate-900">
              
              {translate("AI Background Remover")}
            </h2>

            <p className="text-sm text-slate-500">
              
              {translate("Remove image backgrounds in seconds.")}
            </p>
          </div>
        </div>

        {!file ? (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex min-h-64 w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-violet-300 bg-violet-50/50 px-6 py-10 text-center transition hover:border-violet-500 hover:bg-violet-50"
          >
            <div className="mb-4 rounded-full bg-white p-4 text-violet-600 shadow-sm">
              <Upload size={30} />
            </div>

            <span className="font-semibold text-slate-800">
              
              {translate("Upload your image")}
            </span>

            <span className="mt-2 text-sm text-slate-500">
              
              {translate("JPG, PNG or WEBP · Maximum 4 MB")}
            </span>

            <span className="mt-5 rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white">
              
              {translate("Choose Image")}
            </span>
          </button>
        ) : (
          <div className="space-y-6">
            <div className="grid gap-5 md:grid-cols-2">
              <div className="overflow-hidden rounded-xl border border-slate-200">
                <div className="border-b bg-slate-50 px-4 py-3">
                  <p className="text-sm font-semibold text-slate-700">
                    
                    {translate("Original Image")}
                  </p>
                </div>

                <div className="flex min-h-64 items-center justify-center bg-slate-100 p-3">
                  <img
                loading="lazy"
                    src={preview}
                    alt={translate("Original image")}
                    className="max-h-72 max-w-full object-contain"
                  />
                </div>
              </div>

              <div className="overflow-hidden rounded-xl border border-slate-200">
                <div className="border-b bg-slate-50 px-4 py-3">
                  <p className="text-sm font-semibold text-slate-700">
                    
                    {translate("Background Removed")}
                  </p>
                </div>

                <div
                  className="flex min-h-64 items-center justify-center p-3"
                  style={{
                    backgroundColor: "#ffffff",
                    backgroundImage:
                      "linear-gradient(45deg, #e5e7eb 25%, transparent 25%), linear-gradient(-45deg, #e5e7eb 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e5e7eb 75%), linear-gradient(-45deg, transparent 75%, #e5e7eb 75%)",
                    backgroundSize: "20px 20px",
                    backgroundPosition:
                      "0 0, 0 10px, 10px -10px, -10px 0px",
                  }}
                >
                  {resultUrl ? (
                    <img
                loading="lazy"
                      src={resultUrl}
                      alt={translate("Background removed")}
                      className="max-h-72 max-w-full object-contain"
                    />
                  ) : (
                    <div className="px-4 text-center text-slate-400">
                      <ImageIcon
                        size={38}
                        className="mx-auto mb-3"
                      />

                      <p className="text-sm">
                        
                        {translate("Your result will appear here.")}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-800">
                  {file.name}
                </p>

                <p className="text-xs text-slate-500">
                  {(file.size / 1024).toFixed(1)}  {translate("KB")}
                </p>
              </div>

              <button
                type="button"
                onClick={removeImage}
                disabled={loading}
                className="flex items-center justify-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                <Trash2 size={16} />
                
                {translate("Remove image")}
              </button>
            </div>

            {!resultUrl ? (
              <button
                type="button"
                onClick={processImage}
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3.5 font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2
                      size={19}
                      className="animate-spin"
                    />
                    
                    {translate("Removing background...")}
                  </>
                ) : (
                  <>
                    <Scissors size={19} />
                    
                    {translate("Remove Background")}
                  </>
                )}
              </button>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={downloadImage}
                  className="flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3.5 font-semibold text-white hover:bg-violet-700"
                >
                  <Download size={19} />
                  
                  {translate("Download PNG")}
                </button>

                <button
                  type="button"
                  onClick={processImage}
                  disabled={loading}
                  className="flex items-center justify-center gap-2 rounded-xl border border-violet-200 px-5 py-3.5 font-semibold text-violet-700 hover:bg-violet-50 disabled:opacity-60"
                >
                  <RefreshCw size={18} />
                  
                  {translate("Process Again")}
                </button>
              </div>
            )}
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileChange}
          className="hidden"
        />

        {error && (
          <div
            role="alert"
            className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        {success && (
          <div className="mt-5 flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
            <ShieldCheck size={18} />
            {success}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-violet-100 bg-violet-50/60 p-5">
        <div className="flex items-start gap-3">
          <ShieldCheck
            size={21}
            className="mt-0.5 shrink-0 text-violet-600"
          />

          <div>
            <h3 className="font-semibold text-slate-900">
              
              {translate("Secure image processing")}
            </h3>

            <p className="mt-1 text-sm leading-6 text-slate-600">
              
              {translate("Your API key stays on the server. Your original image is sent securely to our background removal provider for AI processing. The resulting PNG is saved in your private SnapText history so you can download it again later. Only you can access your saved result.")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
