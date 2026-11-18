import type { MetadataRoute } from "next";
import { APP_URL, absoluteUrl } from "@/lib/seo";
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/tools/", "/fr/", "/fr/outils/"],
        disallow: ["/api/", "/auth/callback", "/dashboard", "/fr/dashboard", "/login", "/signup"],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: APP_URL,
  };
}
