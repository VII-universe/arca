"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Menu, X } from "lucide-react";
import { LOCALES } from "@/i18n/config";
import { marketingPathFor } from "@/lib/marketing/paths";

const SECTIONS = [
  ["#how-it-works", "howItWorks"],
  ["#for-whom", "forWhom"],
  ["#security", "security"],
  ["#pricing", "pricing"],
] as const;

export function MarketingNav() {
  const t = useTranslations("Marketing.nav");
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(false);

  // Hide while reading downwards, come back on the first scroll up.
  useEffect(() => {
    let lastY = window.scrollY;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const y = window.scrollY;
        if (Math.abs(y - lastY) < 6) return;
        setHidden(y > lastY && y > 160);
        lastY = y;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const languages = (
    <div className="mk-lang" role="group" aria-label={t("language")}>
      {LOCALES.map((l) => (
        <a key={l} href={marketingPathFor(l)} hrefLang={l} lang={l} aria-current={l === locale ? "true" : undefined}>
          {l.toUpperCase()}
        </a>
      ))}
    </div>
  );

  return (
    <header className="mk-nav" data-hidden={hidden && !open ? "true" : "false"}>
      <a href="#main" className="mk-sr" onFocus={() => setHidden(false)}>{t("skip")}</a>
      <nav className="mk-nav__bar mk-glass" aria-label={t("primary")}>
        <a href={marketingPathFor(locale as (typeof LOCALES)[number])} className="mk-logo" aria-label={t("home")}>
          ARCA
        </a>
        <ul className="mk-nav__links">
          {SECTIONS.map(([href, key]) => (
            <li key={href}><a href={href}>{t(key)}</a></li>
          ))}
        </ul>
        <div className="mk-nav__end">
          {languages}
          <a href="/login" className="mk-nav__signin">{t("signIn")}</a>
          <a href="/login?mode=signup" className="mk-btn mk-btn--primary mk-btn--sm mk-nav__cta">{t("start")}</a>
          <button
            type="button"
            className="mk-nav__menu-btn"
            aria-expanded={open}
            aria-controls="mk-menu"
            aria-label={open ? t("closeMenu") : t("menu")}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <X size={18} aria-hidden /> : <Menu size={18} aria-hidden />}
          </button>
        </div>
      </nav>
      {open && (
        <div id="mk-menu" className="mk-nav__panel mk-glass">
          <ul>
            {SECTIONS.map(([href, key]) => (
              <li key={href}><a href={href} onClick={() => setOpen(false)}>{t(key)}</a></li>
            ))}
          </ul>
          <div className="mk-nav__panel-actions">
            <a href="/login?mode=signup" className="mk-btn mk-btn--primary">{t("start")}</a>
            <a href="/login" className="mk-btn mk-btn--ghost">{t("signIn")}</a>
          </div>
        </div>
      )}
    </header>
  );
}
