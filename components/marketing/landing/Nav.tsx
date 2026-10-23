"use client";

import { useEffect, useState } from "react";
import { LOCALES } from "@/i18n/config";
import { marketingPathFor } from "@/lib/marketing/paths";

const SECTIONS = [
  ["#how-it-works", "howItWorks"],
  ["#for-whom", "forWhom"],
  ["#security", "security"],
  ["#pricing", "pricing"],
] as const;

export type NavCopy = Record<
  "primary" | "skip" | "home" | "howItWorks" | "forWhom" | "security" | "pricing" | "signIn" | "start" | "menu" | "closeMenu" | "language",
  string
>;

// Minimal and transparent; hides while reading downwards and comes back on
// the first scroll up. Copy comes in as props from the server.
export function Nav({ copy, locale }: { copy: NavCopy; locale: string }) {
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(false);

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
    <div className="l-lang" role="group" aria-label={copy.language}>
      {LOCALES.map((l) => (
        <a key={l} href={marketingPathFor(l)} hrefLang={l} lang={l} aria-current={l === locale ? "true" : undefined}>
          {l.toUpperCase()}
        </a>
      ))}
    </div>
  );

  return (
    <header className="l-nav" data-hidden={hidden && !open} data-open={open}>
      <a href="#main" className="l-sr l-skip" onFocus={() => setHidden(false)}>{copy.skip}</a>
      <nav className="l-nav__bar" aria-label={copy.primary}>
        <a href={marketingPathFor(locale as (typeof LOCALES)[number])} className="l-logo" aria-label={copy.home}>ARCA</a>
        <ul className="l-nav__links">
          {SECTIONS.map(([href, key]) => (
            <li key={href}><a href={href}>{copy[key]}</a></li>
          ))}
        </ul>
        <div className="l-nav__end">
          {languages}
          <a href="/login" className="l-nav__signin">{copy.signIn}</a>
          <a href="/login?mode=signup" className="l-btn l-btn--primary l-btn--sm l-nav__cta">{copy.start}</a>
          <button
            type="button"
            className="l-nav__menu"
            aria-expanded={open}
            aria-controls="l-menu"
            aria-label={open ? copy.closeMenu : copy.menu}
            onClick={() => setOpen((o) => !o)}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
              {open ? (
                <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.4" fill="none" />
              ) : (
                <path d="M3 7h14M3 13h14" stroke="currentColor" strokeWidth="1.4" fill="none" />
              )}
            </svg>
          </button>
        </div>
      </nav>
      {open && (
        <div id="l-menu" className="l-nav__panel">
          <ul>
            {SECTIONS.map(([href, key]) => (
              <li key={href}><a href={href} onClick={() => setOpen(false)}>{copy[key]}</a></li>
            ))}
          </ul>
          <div className="l-actions">
            <a href="/login?mode=signup" className="l-btn l-btn--primary">{copy.start}</a>
            <a href="/login" className="l-btn l-btn--ghost">{copy.signIn}</a>
          </div>
          {languages}
        </div>
      )}
    </header>
  );
}
