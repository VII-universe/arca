"use client";

import { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { setLocale } from "@/app/actions/locale";

export function LanguageSwitcher({ className }: { className?: string }) {
  const locale = useLocale();
  const t = useTranslations("Common.languageSwitcher");
  const [isPending, startTransition] = useTransition();

  return (
    <select
      value={locale}
      disabled={isPending}
      onChange={(e) => startTransition(() => { setLocale(e.target.value); })}
      aria-label={t("label")}
      className={className}
      style={{
        background: "transparent",
        border: "1px solid var(--hairline-2, rgba(127,127,127,.3))",
        borderRadius: 999,
        padding: "5px 10px",
        fontSize: 12,
        color: "inherit",
        cursor: isPending ? "wait" : "pointer",
        opacity: isPending ? 0.6 : 1,
      }}
    >
      <option value="cs">{t("cs")}</option>
      <option value="en">{t("en")}</option>
    </select>
  );
}
