import { getLocale, getTranslations } from "next-intl/server";
import { typeset } from "./typography";

type Values = Record<string, string | number | Date>;

/** Server-side translations for the landing, typeset for the page's language. */
export async function getCopy(namespace: string) {
  const [t, locale] = await Promise.all([getTranslations(namespace), getLocale()]);
  const ty = typeset(locale);
  return {
    locale,
    t: (key: string, values?: Values) => ty.text(t(key, values)),
    raw: <T,>(key: string): T => ty.deep(t.raw(key) as T),
    rich: t.rich,
  };
}
