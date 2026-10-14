"use client";

import { useState } from "react";

// Recipients aren't logged-in app users, so there's no saved locale
// preference to read — this is a manual toggle, not auto-detection. Always
// offers both app languages regardless of what the original was written
// in; the API decides server-side whether translation is actually needed.
const LABELS = {
  cs: { button: "Zobrazit v češtině", loading: "Překládám…", original: "Zobrazit originál" },
  en: { button: "Show in English", loading: "Translating…", original: "Show original" },
} as const;

export function TranslatableText({
  livingLinkHash,
  originalHtml,
  className,
}: {
  livingLinkHash: string;
  originalHtml: string;
  className?: string;
}) {
  const [targetLocale, setTargetLocale] = useState<"cs" | "en" | null>(null);
  const [translatedHtml, setTranslatedHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState<"cs" | "en" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function translate(locale: "cs" | "en") {
    setLoading(locale);
    setError(null);
    try {
      const res = await fetch("/api/arca/translate-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ livingLinkHash, targetLocale: locale }),
      });
      const data = await res.json();
      if (!res.ok || data.error) { setError(data.error ?? "Error."); return; }
      setTranslatedHtml(data.html);
      setTargetLocale(locale);
    } catch {
      setError("Couldn't connect.");
    } finally {
      setLoading(null);
    }
  }

  const showingTranslation = targetLocale !== null && translatedHtml !== null;

  return (
    <div>
      <div
        className={className}
        dangerouslySetInnerHTML={{ __html: showingTranslation ? translatedHtml : originalHtml }}
      />

      <div className="mt-6 flex items-center gap-4 text-xs text-muted-foreground/60">
        {showingTranslation ? (
          <button
            type="button"
            onClick={() => setTargetLocale(null)}
            className="underline decoration-dotted hover:text-muted-foreground transition-colors"
          >
            {LABELS[targetLocale].original}
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={() => translate("cs")}
              disabled={loading !== null}
              className="underline decoration-dotted hover:text-muted-foreground transition-colors disabled:opacity-50"
            >
              {loading === "cs" ? LABELS.cs.loading : LABELS.cs.button}
            </button>
            <button
              type="button"
              onClick={() => translate("en")}
              disabled={loading !== null}
              className="underline decoration-dotted hover:text-muted-foreground transition-colors disabled:opacity-50"
            >
              {loading === "en" ? LABELS.en.loading : LABELS.en.button}
            </button>
          </>
        )}
      </div>

      {error && <p className="mt-2 text-xs text-rose-400">{error}</p>}
    </div>
  );
}
