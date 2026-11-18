import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LegalPage } from "@/components/legal-page";
import { getLegalDocument } from "@/lib/legal-content";
import { absoluteUrl } from "@/lib/seo";

const slugs = ["privacy", "terms", "sale-terms", "legal-notice", "cookies", "refunds", "contact"];
export function generateStaticParams() { return slugs.map((slug) => ({ slug })); }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const page = getLegalDocument("fr", slug);
  if (!page) return {};
  return { title: page.title, description: page.intro, alternates: { canonical: absoluteUrl(`/fr/legal/${slug}`), languages: { en: absoluteUrl(`/legal/${slug}`), fr: absoluteUrl(`/fr/legal/${slug}`) } }, robots: { index: true, follow: true } };
}
export default async function FrenchLegalPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = getLegalDocument("fr", slug);
  if (!page) notFound();
  return <LegalPage lang="fr" {...page} />;
}
