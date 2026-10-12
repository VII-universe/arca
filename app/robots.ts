import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Dashboard and API are auth-gated; /arca, /s, and /guardian are
      // private per-recipient/per-token delivery links — none of this
      // should ever show up in search results even if a crawler finds a link.
      disallow: ["/dashboard", "/api", "/arca", "/s", "/guardian"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
