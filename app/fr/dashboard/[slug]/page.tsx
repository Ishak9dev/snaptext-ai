import { notFound, redirect } from "next/navigation";
import { ScanText } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import OcrWorkspace from "@/components/ocr-workspace";
import DocumentAnalyzerWorkspace from "@/components/document-analyzer-workspace";
import FormExtractorWorkspace from "@/components/form-extractor-workspace";
import ReceiptScannerWorkspace from "@/components/receipt-scanner-workspace";
import ImageDescriptionWorkspace from "@/components/image-description-workspace";
import BackgroundRemover from "@/components/background-remover";
import ImageCompressor from "@/components/image-compressor";
import ImageConverter from "@/components/image-converter";
import ImageToPdf from "@/components/image-to-pdf";
import ImageMetadataRemover from "@/components/image-metadata-remover";


const workspaces = {
  "image-to-text": OcrWorkspace,
  "document-analyzer": DocumentAnalyzerWorkspace,
  "form-extractor": FormExtractorWorkspace,
  "receipt-scanner": ReceiptScannerWorkspace,
  "image-description": ImageDescriptionWorkspace,
  "background-remover": BackgroundRemover,
  "image-compressor": ImageCompressor,
  "image-converter": ImageConverter,
  "image-to-pdf": ImageToPdf,
  "metadata-remover": ImageMetadataRemover,
} as const;

const titles: Record<keyof typeof workspaces, string> = {
  "image-to-text": "Image en texte (OCR)",
  "document-analyzer": "Analyseur intelligent de documents",
  "form-extractor": "Extracteur de formulaires et de données",
  "receipt-scanner": "Scanner de reçus et de factures",
  "image-description": "Description d’image par IA",
  "background-remover": "Suppression de l’arrière-plan",
  "image-compressor": "Compresseur d’images",
  "image-converter": "Convertisseur d’images",
  "image-to-pdf": "Convertisseur d’images en PDF",
  "metadata-remover": "Suppression des métadonnées",
};

export default async function FrenchWorkspacePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!(slug in workspaces)) notFound();

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) {
    redirect(`/login?next=${encodeURIComponent(`/fr/dashboard/${slug}`)}`);
  }

  const key = slug as keyof typeof workspaces;
  const Workspace = workspaces[key];

  return (
    <main lang="fr" className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
          <Link href="/fr" className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-600 text-white">
              <ScanText size={20} />
            </span>
            <span className="text-lg font-bold text-slate-900">
              SnapText <span className="text-violet-600">AI</span>
            </span>
          </Link>
        </div>
      </header>
      <section className="mx-auto max-w-7xl px-5 py-8 sm:py-12">
        {slug !== "image-to-text" && slug !== "document-analyzer" && slug !== "form-extractor" && slug !== "receipt-scanner" && slug !== "image-description" ? (
          <h1 className="mb-8 text-3xl font-bold text-slate-900">{titles[key]}</h1>
        ) : null}
        <Workspace />
      </section>
    </main>
  );
}
