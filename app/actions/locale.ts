"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";
import { LOCALE_COOKIE, LOCALES } from "@/i18n/config";

// Writes the locale cookie (always — works for logged-out visitors too) and,
// if the caller is logged in, also saves it on User.locale so the preference
// follows the account across devices/browsers, not just this one cookie.
export async function setLocale(locale: string): Promise<void> {
  if (!(LOCALES as readonly string[]).includes(locale)) return;

  const store = await cookies();
  store.set(LOCALE_COOKIE, locale, { maxAge: 60 * 60 * 24 * 365, path: "/" });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    await prisma.user.update({ where: { id: user.id }, data: { locale } }).catch(() => {});
  }

  // Re-render everything server-side with the new locale — no navigation
  // needed, "without i18n routing" means the URL never changes.
  revalidatePath("/", "layout");
}
