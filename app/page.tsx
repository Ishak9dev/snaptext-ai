import type { Metadata } from "next";
import HomePageClient from "@/components/home-page-client";
import { absoluteUrl, SITE_DESCRIPTION } from "@/lib/seo";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

const homepageTitle = "SnapText AI – Free AI Tools for Documents, Images & OCR";

export const instant = false;

export const metadata: Metadata = {
  title: { absolute: homepageTitle },
  description: SITE_DESCRIPTION,
  alternates: { canonical: absoluteUrl("/"), languages: { "en": absoluteUrl("/"), "fr": absoluteUrl("/fr") } },
  openGraph: {
    title: homepageTitle,
    description: SITE_DESCRIPTION,
    url: absoluteUrl("/"),
    type: "website",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "SnapText AI image and document tools" }],
  },
  twitter: { card: "summary_large_image", title: homepageTitle, description: SITE_DESCRIPTION, images: ["/twitter-image"] },
};

export default async function HomePage({ searchParams }: { searchParams: Promise<{ checkout?: string }> }) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (data?.claims) {
    const { checkout } = await searchParams;
    if (checkout) redirect(`/dashboard?checkout=${encodeURIComponent(checkout)}`);
  }
  return <HomePageClient initialLanguage="en" />;
}
