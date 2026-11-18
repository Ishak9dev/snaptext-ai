import type { Metadata } from "next";
import HomePageClient from "@/components/home-page-client";
import { absoluteUrl } from "@/lib/seo";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

const title = "Outils IA pour images et documents";
const description = "Extrayez du texte, analysez des documents, scannez des reçus et optimisez vos images avec SnapText AI. Découvrez 10 outils en ligne, gratuitement.";

export const instant = false;

export const metadata: Metadata = {
  title, description,
  alternates: { canonical: absoluteUrl("/fr"), languages: { "en": absoluteUrl("/"), "fr": absoluteUrl("/fr") } },
  openGraph: { title, description, url: absoluteUrl("/fr"), type: "website", locale: "fr_FR", images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "SnapText AI — outils IA pour images et documents" }] },
  twitter: { card: "summary_large_image", title, description, images: ["/twitter-image"] },
};

export default async function FrenchHomePage({ searchParams }: { searchParams: Promise<{ checkout?: string }> }) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (data?.claims) {
    const { checkout } = await searchParams;
    if (checkout) redirect(`/fr/dashboard?checkout=${encodeURIComponent(checkout)}`);
  }
  return <HomePageClient initialLanguage="fr" />;
}
