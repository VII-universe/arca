import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";
import { LOCALES, DEFAULT_LOCALE, LOCALE_COOKIE, type Locale } from "./config";

export { LOCALES, DEFAULT_LOCALE, LOCALE_COOKIE, type Locale };

function isLocale(value: string | undefined): value is Locale {
  return !!value && (LOCALES as readonly string[]).includes(value);
}

// "without i18n routing" setup — URLs stay exactly as they are (/dashboard,
// /login, ...), no [locale] segment. Locale resolution order:
// 1. Logged-in user's saved preference (User.locale) — follows the account
//    across devices/browsers.
// 2. The `arca_locale` cookie — set once by middleware.ts on first visit
//    (from Accept-Language) or by the language switcher.
// 3. DEFAULT_LOCALE, if somehow neither of the above is set yet.
export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value;

  let locale: Locale = isLocale(cookieLocale) ? cookieLocale : DEFAULT_LOCALE;

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

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
