import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo";
const slugs = ["image-to-text", "document-analyzer", "form-extractor", "receipt-scanner", "image-description", "background-remover", "image-compressor", "image-converter", "image-to-pdf", "metadata-remover"];
const legalSlugs = ["privacy", "terms", "sale-terms", "legal-notice", "cookies", "refunds", "contact"];
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: absoluteUrl("/"), changeFrequency: "weekly", priority: 1 },
    { url: absoluteUrl("/fr"), changeFrequency: "weekly", priority: 0.9 },
    ...slugs.flatMap((slug) => [
      { url: absoluteUrl(`/tools/${slug}`), changeFrequency: "monthly" as const, priority: 0.8 },
      { url: absoluteUrl(`/fr/outils/${slug}`), changeFrequency: "monthly" as const, priority: 0.8 },
    ]),
    ...legalSlugs.flatMap((slug) => [
      { url: absoluteUrl(`/legal/${slug}`), changeFrequency: "yearly" as const, priority: 0.3 },
      { url: absoluteUrl(`/fr/legal/${slug}`), changeFrequency: "yearly" as const, priority: 0.3 },
    ]),
  ];
}
