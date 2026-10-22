import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";
import { LOCALES, DEFAULT_LOCALE, LOCALE_COOKIE, LOCALE_HEADER, type Locale } from "./config";

export { LOCALES, DEFAULT_LOCALE, LOCALE_COOKIE, type Locale };

function isLocale(value: string | undefined): value is Locale {
  return !!value && (LOCALES as readonly string[]).includes(value);
}

// "without i18n routing" setup — URLs stay exactly as they are (/dashboard,
// /login, ...), no [locale] segment. Locale resolution order:
// 0. LOCALE_HEADER — set by proxy.ts only on marketing pages (/, /en, /cs),
//    where the URL itself decides the language.
// 1. Logged-in user's saved preference (User.locale) — follows the account
//    across devices/browsers.
// 2. The `arca_locale` cookie — set once by middleware.ts on first visit
//    (from Accept-Language) or by the language switcher.
// 3. DEFAULT_LOCALE, if somehow neither of the above is set yet.
export default getRequestConfig(async () => {
  const forcedLocale = (await headers()).get(LOCALE_HEADER) ?? undefined;
  if (isLocale(forcedLocale)) {
    return {
      locale: forcedLocale,
      messages: (await import(`../messages/${forcedLocale}.json`)).default,
    };
  }

  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value;

  let locale: Locale = isLocale(cookieLocale) ? cookieLocale : DEFAULT_LOCALE;

  // Only ask Supabase (a network round trip) and the DB when there's a
  // session cookie at all — anonymous visitors can't have a saved preference.
  const hasSessionCookie = cookieStore
    .getAll()
    .some((c) => c.name.startsWith("sb-") && c.name.includes("-auth-token"));

  if (hasSessionCookie) {
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { locale: true } });
        if (isLocale(dbUser?.locale ?? undefined)) locale = dbUser!.locale as Locale;
      }
    } catch {
      // Not authenticated, or DB unreachable — fall back to cookie/default.
      // Never let a locale lookup break rendering.
    }
  }

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
