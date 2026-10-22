import type { Locale } from "@/i18n/config";

// Public marketing routes. Kept dependency-free (no Prisma/Supabase) because
// proxy.ts imports it.
//
// "/" auto-detects the language (cookie → Accept-Language); "/en" and "/cs"
// are explicit per-language URLs so search engines can index each language
// and hreflang has distinct URLs to point at.
export const MARKETING_LOCALE_PATHS: Record<string, Locale> = {
  "/en": "en",
  "/cs": "cs",
};

export const MARKETING_PATHS = ["/", ...Object.keys(MARKETING_LOCALE_PATHS)];

export function isMarketingPath(pathname: string | null | undefined): boolean {
  return !!pathname && MARKETING_PATHS.includes(pathname);
}

export function marketingPathFor(locale: Locale): string {
  return `/${locale}`;
}
