import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site-url";

// Only the public marketing pages belong here — everything else is either
// auth-gated (/dashboard) or a private per-recipient/per-token link
// (/arca, /s, /guardian) that must never be indexed (see robots.ts).
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/login`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.5,
    },
  ];
}
