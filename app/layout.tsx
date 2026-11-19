
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import { APP_URL, SITE_DESCRIPTION, SITE_NAME, absoluteUrl } from "@/lib/seo";
import { CookieConsent } from "@/components/cookie-consent";
import { AnalyticsRuntime } from "@/components/analytics-runtime";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: "SnapText AI – Free AI Tools for Documents, Images & OCR",
    template: "%s | SnapText AI",
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  creator: SITE_NAME,
  publisher: SITE_NAME,
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "en_US",
    title: "SnapText AI – Free AI Tools for Documents, Images & OCR",
    description: SITE_DESCRIPTION,
    url: absoluteUrl("/"),
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "SnapText AI image and document tools",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "SnapText AI – Free AI Tools for Documents, Images & OCR",
    description: SITE_DESCRIPTION,
    images: ["/twitter-image"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": absoluteUrl("/#organization"),
  name: SITE_NAME,
  url: absoluteUrl("/"),

  // Replace with your actual logo image URL if available.
  logo: absoluteUrl("/favicon.ico"),

  description: SITE_DESCRIPTION,
  hasMerchantReturnPolicy: {
    "@type": "MerchantReturnPolicy",
    "@id": absoluteUrl("/#merchant-return-policy"),
    merchantReturnLink: absoluteUrl("/legal/refunds"),
  },
};

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": absoluteUrl("/#website"),
  name: SITE_NAME,
  url: absoluteUrl("/"),
  description: SITE_DESCRIPTION,
  publisher: {
    "@id": absoluteUrl("/#organization"),
  },
  inLanguage: ["en", "fr"],
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify([
              organizationSchema,
              websiteSchema,
            ]).replace(/</g, "\\u003c"),
          }}
        />

        {children}

        <CookieConsent />
        <AnalyticsRuntime />
      </body>
    </html>
  );
}
