
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { absoluteUrl } from "@/lib/seo";

// Allow request-time Supabase data instead of failing prerendering.
export const instant = false;

type Tool = {
  name: string;
  title: string;
  description: string;
  category: string;
  details: string;
  workspace: string;
  keyword: string;
  benefits: string[];
  faqs: { question: string; answer: string }[];
};

const commonFaqs = (toolName: string, action: string) => [
  {
    question: `How do I use ${toolName.toLowerCase()}?`,
    answer: `Open ${toolName.toLowerCase()} in your SnapText AI workspace and upload a supported file. Review the result before downloading or saving it. Available processing options and file formats depend on the selected tool and source file.`,
  },
  {
    question: `Can I try ${toolName.toLowerCase()} for free?`,
    answer: `Yes. A free SnapText AI account includes two lifetime uses of each of the ten tools. You can try ${action} without entering payment details. Current paid plan prices and billing periods are shown on the pricing section and confirmed in Stripe Checkout before payment. Subscriptions renew at the displayed interval until canceled.`,
  },
  {
    question: `Which file formats does this tool support?`,
    answer: `Supported formats depend on the selected feature. Image tools support common formats such as JPG, PNG and WEBP where applicable. Check the upload area for the accepted input formats before selecting a file, as input and output formats may differ.`,
  },
];

const tools: Record<string, Tool> = {
  "image-to-text": {
    name: "Image to Text (OCR)", title: "Convert an Image to Text Online",
    description: "Extract text from images online with AI-powered OCR. Convert photos, screenshots and scanned documents into editable text with SnapText AI.",
    category: "AI & Text Recognition", details: "Upload a JPG, PNG or WEBP image to convert visible text into editable content. The OCR workspace supports recognition in English and French.",
    workspace: "/dashboard/image-to-text", keyword: "convert image to text",
    benefits: ["Extract printed text from photos and screenshots", "Convert scanned pages into editable text", "Copy or save OCR recognition results"],
    faqs: commonFaqs("the image-to-text tool", "image-to-text conversion"),
  },
  "document-analyzer": {
    name: "Smart Document Analyzer", title: "Analyze Documents with AI",
    description: "Analyze documents with AI to identify key information, summaries, dates and action items. Understand your files faster with SnapText AI.",
    category: "AI & Documents", details: "Make documents easier to review by identifying their structure, summaries, important dates, entities and follow-up actions.",
    workspace: "/dashboard/document-analyzer", keyword: "AI document analyzer",
    benefits: ["Analyze document content with AI", "Identify important information and dates", "Review lengthy documents more efficiently"],
    faqs: commonFaqs("the AI document analyzer", "document analysis"),
  },
  "form-extractor": {
    name: "Form & Data Extractor", title: "Extract Form Data with AI",
    description: "Extract structured data from forms and documents with AI. Organize important fields and reduce manual data entry with SnapText AI.",
    category: "AI & Documents", details: "Turn fields found in your documents into structured information that is easier to reuse in your workflows.",
    workspace: "/dashboard/form-extractor", keyword: "AI form data extraction",
    benefits: ["Extract fields from forms and documents", "Organize information into structured data", "Reduce repetitive manual data entry"],
    faqs: commonFaqs("the form and data extractor", "form and data extraction"),
  },
  "receipt-scanner": {
    name: "Receipt & Invoice Scanner", title: "Scan Receipts and Invoices with AI",
    description: "Scan receipts and invoices online with AI. Extract merchants, dates, amounts and invoice line items with SnapText AI.",
    category: "AI & Documents", details: "Scan receipts and invoices to make key transaction information easier to find and review.",
    workspace: "/dashboard/receipt-scanner", keyword: "AI receipt scanner",
    benefits: ["Read merchant details and dates", "Extract totals and itemized line entries", "Review receipt and invoice information"],
    faqs: commonFaqs("the receipt and invoice scanner", "receipt and invoice scanning"),
  },
  "image-description": {
    name: "AI Image Description", title: "AI Image Description Generator",
    description: "Generate clear image descriptions with AI. Understand visual content and turn your photos into written descriptions with SnapText AI.",
    category: "AI & Images", details: "Create useful descriptions of visual content from uploaded images using AI-powered image understanding.",
    workspace: "/dashboard/image-description", keyword: "AI image description generator",
    benefits: ["Generate natural-language descriptions", "Summarize visible elements in an image", "Create descriptive text from your images"],
    faqs: commonFaqs("the AI image description generator", "image description generation"),
  },
  "background-remover": {
    name: "Background Remover", title: "Remove an Image Background Online",
    description: "Remove image backgrounds online and create transparent PNG images. Prepare product photos and visuals with SnapText AI.",
    category: "Image Editing", details: "Create images with transparent backgrounds from supported files uploaded to SnapText AI.",
    workspace: "/dashboard/background-remover", keyword: "remove image background",
    benefits: ["Remove backgrounds from supported images", "Create transparent PNG files", "Prepare visuals for design and product listings"],
    faqs: commonFaqs("the background remover", "background removal"),
  },
  "image-compressor": {
    name: "Image Compressor", title: "Compress Images Online",
    description: "Compress images online to reduce JPG, PNG and WEBP file sizes while preserving visual quality. Optimize your images with SnapText AI.",
    category: "Image Optimization", details: "Reduce image file sizes and download optimized files directly from the SnapText AI workspace.",
    workspace: "/dashboard/image-compressor", keyword: "compress image online",
    benefits: ["Reduce image file sizes", "Optimize common image formats", "Download compressed images"],
    faqs: commonFaqs("the image compressor", "image compression"),
  },
  "image-converter": {
    name: "Image Converter", title: "Convert Images Online",
    description: "Convert images online between JPG, PNG and WEBP formats. Choose the output format you need and download your files with SnapText AI.",
    category: "Image Conversion", details: "Convert common image formats by choosing the output format that best fits your use case.",
    workspace: "/dashboard/image-converter", keyword: "online image converter",
    benefits: ["Convert JPG, PNG and WEBP images", "Choose a suitable output format", "Download converted files"],
    faqs: commonFaqs("the image converter", "image conversion"),
  },
  "image-to-pdf": {
    name: "Image to PDF", title: "Convert Images to PDF Online",
    description: "Convert one or more images into a downloadable PDF online. Combine image files into a document with the SnapText AI converter.",
    category: "Document Conversion", details: "Organize your images and export them as a PDF document that is easy to download and share.",
    workspace: "/dashboard/image-to-pdf", keyword: "convert image to PDF",
    benefits: ["Convert images into a PDF document", "Combine multiple images into one PDF", "Download a PDF that is easy to share"],
    faqs: commonFaqs("the image-to-PDF converter", "image-to-PDF conversion"),
  },
  "metadata-remover": {
    name: "Image Metadata Remover", title: "Remove Image Metadata Online",
    description: "Remove embedded metadata from your images before sharing photos. Export image files without their original metadata with SnapText AI.",
    category: "Privacy", details: "Export an image with its embedded metadata removed before sharing it.",
    workspace: "/dashboard/metadata-remover", keyword: "remove image metadata",
    benefits: ["Remove embedded image metadata", "Prepare photos before sharing", "Create an exported image without its original metadata"],
    faqs: commonFaqs("the metadata remover", "image metadata removal"),
  },
};

export function generateStaticParams() {
  return Object.keys(tools).map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const tool = tools[slug];

  if (!tool) {
    return {
      title: "Tool not found",
      robots: { index: false, follow: false },
    };
  }

  const canonical = absoluteUrl(`/tools/${slug}`);
  const frenchUrl = absoluteUrl(`/fr/outils/${slug}`);

  return {
    title: tool.title,
    description: tool.description,
    alternates: {
      canonical,
      languages: {
        en: canonical,
        fr: frenchUrl,
      },
    },
    openGraph: {
      title: tool.title,
      description: tool.description,
      url: canonical,
      type: "website",
      locale: "en_US",
      images: [
        {
          url: "/opengraph-image",
          width: 1200,
          height: 630,
          alt: `${tool.name} by SnapText AI`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: tool.title,
      description: tool.description,
      images: ["/twitter-image"],
    },
  };
}

export default async function EnglishToolLandingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tool = tools[slug];

  if (!tool) {
    notFound();
  }

  // Request-time Supabase authentication.
  await connection();

  const supabase = await createClient();
  const { data: authData, error: authError } =
    await supabase.auth.getClaims();

  const isSignedIn =
    !authError && Boolean(authData?.claims);

  async function handleLogout() {
    "use server";

    const supabase = await createClient();
    await supabase.auth.signOut();

    redirect("/login");
  }

  const pageUrl = absoluteUrl(`/tools/${slug}`);

  const offers = [
    {
      "@type": "Offer",
      name: "Free",
      price: "0",
      priceCurrency: "EUR",
      description: "Two lifetime uses per tool.",
    },
  ];

  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: tool.name,
      applicationCategory: "UtilitiesApplication",
      operatingSystem: "Web",
      inLanguage: "en",
      description: tool.description,
      url: pageUrl,
      offers,
    },
    {
      "@context": "https://schema.org",
      "@type": "Product",
      name: tool.name,
      description: tool.description,
      category: tool.category,
      brand: {
        "@type": "Brand",
        name: "SnapText AI",
      },
      url: pageUrl,
      offers,
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      inLanguage: "en",
      mainEntity: tool.faqs.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: faq.answer,
        },
      })),
    },
  ];

  return (
    <main lang="en" className="min-h-screen bg-slate-950 text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(
            /</g,
            "\\u003c"
          ),
        }}
      />

      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link
            href="/"
            aria-label="SnapText AI home"
            className="text-xl font-bold"
          >
            SnapText <span className="text-violet-400">AI</span>
          </Link>

          <nav
            aria-label="Main navigation"
            className="flex items-center gap-5 text-sm"
          >
            <Link
              href="/#tools"
              className="text-slate-300 hover:text-white"
            >
              All tools
            </Link>

            <Link
              href={`/fr/outils/${slug}`}
              hrefLang="fr"
              lang="fr"
              className="text-slate-300 hover:text-white"
            >
              Français
            </Link>

            {isSignedIn ? (
              <>
                <Link
                  href="/dashboard"
                  className="text-slate-300 hover:text-white"
                >
                  Dashboard
                </Link>

                <form action={handleLogout}>
                  <button
                    type="submit"
                    aria-label="Log out of SnapText AI"
                    className="text-slate-300 hover:text-white"
                  >
                    Log out
                  </button>
                </form>
              </>
            ) : (
              <Link
                href="/login"
                className="text-slate-300 hover:text-white"
              >
                Log in
              </Link>
            )}
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-6 py-24 text-center">
        <p className="mb-5 text-sm font-semibold uppercase tracking-[0.2em] text-violet-300">
          {tool.category}
        </p>

        <h1 className="mx-auto max-w-4xl text-4xl font-bold tracking-tight sm:text-6xl">
          {tool.title}
        </h1>

        <p className="mx-auto mt-7 max-w-2xl text-lg leading-8 text-slate-300">
          {tool.description}
        </p>

        <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href={tool.workspace}
            aria-label={`Open ${tool.name}`}
            className="rounded-xl bg-violet-500 px-7 py-3.5 font-semibold text-white hover:bg-violet-400"
          >
            Use this tool
          </Link>

          <Link
            href="/#pricing"
            className="rounded-xl border border-white/20 px-7 py-3.5 font-semibold hover:bg-white/5"
          >
            View pricing
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-16">
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-8">
          <h2 className="text-2xl font-semibold">
            What can you do with {tool.name.toLowerCase()}?
          </h2>

          <p className="mt-4 leading-7 text-slate-300">
            {tool.details}
          </p>

          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            {tool.benefits.map((benefit) => (
              <li
                key={benefit}
                className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-slate-200"
              >
                {benefit}
              </li>
            ))}
          </ul>

          <p className="mt-7 text-sm text-slate-400">
            A free account includes two lifetime uses of each tool. Upgrade to Pro for unlimited access to SnapText AI.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-24">
        <h2 className="text-2xl font-semibold">
          Frequently asked questions
        </h2>

        <div className="mt-6 grid gap-4">
          {tool.faqs.map((faq) => (
            <article
              key={faq.question}
              className="rounded-2xl border border-white/10 bg-white/[0.04] p-6"
            >
              <h3 className="font-semibold">
                {faq.question}
              </h3>

              <p className="mt-3 leading-7 text-slate-300">
                {faq.answer}
              </p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
