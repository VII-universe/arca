import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { LOCALES } from "@/i18n/config";
import { marketingPathFor } from "@/lib/marketing/paths";
import { SkyJourney } from "./sky/SkyJourney";

// Shared by "/", "/en" and "/cs". The locale itself is decided in proxy.ts
// (LOCALE_HEADER), so every getTranslations() here already renders the
// page's language.
export async function marketingMetadata(path: string): Promise<Metadata> {
  const t = await getTranslations("Marketing.meta");
  const locale = await getLocale();
  return {
    title: t("title"),
    description: t("description"),
    alternates: {
      canonical: path,
      languages: {
        ...Object.fromEntries(LOCALES.map((l) => [l, marketingPathFor(l)])),
        "x-default": "/",
      },
    },
    openGraph: {
      title: t("title"),
      description: t("description"),
      url: path,
      siteName: "ARCA",
      locale,
      type: "website",
    },
  };
}

// v2 („Světlo na cestě“), M1: the scene alone. The sections and their
// content (components in this folder) come back in M2.
export async function MarketingPage() {
  return <SkyJourney />;
}
