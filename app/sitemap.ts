import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo";
const slugs = ["image-to-text", "document-analyzer", "form-extractor", "receipt-scanner", "image-description", "background-remover", "image-compressor", "image-converter", "image-to-pdf", "metadata-remover"];
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: absoluteUrl("/"), changeFrequency: "weekly", priority: 1 },
    { url: absoluteUrl("/fr"), changeFrequency: "weekly", priority: 0.9 },
    ...slugs.flatMap((slug) => [
      { url: absoluteUrl(`/tools/${slug}`), changeFrequency: "monthly" as const, priority: 0.8 },
      { url: absoluteUrl(`/fr/outils/${slug}`), changeFrequency: "monthly" as const, priority: 0.8 },
    ]),
  ];
}
