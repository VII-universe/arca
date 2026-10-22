// Locale constants shared between i18n/request.ts (Node runtime — talks to
// Prisma/Supabase) and middleware.ts (Edge runtime — must NOT import either).
// Kept in their own file for exactly that reason: middleware.ts importing
// from i18n/request.ts directly would pull Prisma's pg driver into the Edge
// bundle and fail to build.
export const LOCALES = ["cs", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "cs";
export const LOCALE_COOKIE = "arca_locale";
// Request header the proxy sets on marketing pages (/, /en, /cs) to pin the
// render locale — takes priority over the saved user preference and cookie
// so /en always renders English, whoever is visiting.
export const LOCALE_HEADER = "x-arca-locale";
