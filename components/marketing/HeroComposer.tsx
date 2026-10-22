"use client";

import { useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";

// The interactive hero: write a message, pick who and when, "seal" it.
// Nothing is sent anywhere — it's a demo with a real text field.
// (M1: markup, state and the result; the light/orb animation and the draft
// hand-off to the app's composer come in later milestones.)

const RECIPIENTS = ["child", "partner", "self", "mom", "other"] as const;
type Recipient = (typeof RECIPIENTS)[number];

const WHEN = ["oneYear", "tenYears", "eighteen", "gone"] as const;
type When = (typeof WHEN)[number] | "year";

const YEARS_AHEAD = 50;

export function HeroComposer() {
  const t = useTranslations("Marketing.hero.composer");
  const id = useId();
  const textRef = useRef<HTMLTextAreaElement>(null);
  const [thisYear] = useState(() => new Date().getFullYear());

  const [recipient, setRecipient] = useState<Recipient | null>(null);
  const [text, setText] = useState("");
  const [when, setWhen] = useState<When>("tenYears");
  const [year, setYear] = useState(() => thisYear + 10);
  const [sealed, setSealed] = useState(false);

  const starters = t.raw("starters") as string[];
  const showsYear = when === "oneYear" || when === "tenYears" || when === "year";

  function pickRecipient(r: Recipient) {
    setRecipient(r);
    if (r === "self") pickWhen("tenYears");
  }

  function pickWhen(w: When) {
    setWhen(w);
    if (w === "oneYear") setYear(thisYear + 1);
    if (w === "tenYears") setYear(thisYear + 10);
  }

  function applyStarter(s: string) {
    setText((prev) => (prev.trim() ? prev : s));
    requestAnimationFrame(() => {
      const el = textRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    });
  }

  function reset() {
    setSealed(false);
    setText("");
    requestAnimationFrame(() => textRef.current?.focus());
  }

  const sealedWhen =
    when === "eighteen" ? t("sealedEighteen") : when === "gone" ? t("sealedGone") : t("sealedYear", { year });

  return (
    <section className="mk-composer mk-glass" aria-label={t("label")}>
      {/* Announces the seal result to screen readers. */}
      <p className="mk-sr" aria-live="polite">{sealed ? `${t("sealedTitle")} ${sealedWhen}` : ""}</p>

      {sealed ? (
        <div className="mk-sealed">
          <div className="mk-sealed__orb" aria-hidden="true" />
          <p className="mk-sealed__title">{t("sealedTitle")}</p>
          <p className="mk-sealed__when">{sealedWhen}</p>
          <div className="mk-composer__actions" style={{ justifyContent: "center" }}>
            <a href="/login?mode=signup" className="mk-btn mk-btn--primary">{t("saveCta")}</a>
            <button type="button" className="mk-btn mk-btn--ghost" onClick={reset}>{t("again")}</button>
          </div>
          <p className="mk-small" style={{ marginTop: 18 }}>{t("demoNote")}</p>
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (text.trim()) setSealed(true);
          }}
        >
          <p className="mk-composer__q" id={`${id}-who`}>{t("question")}</p>
          <div className="mk-chips" role="group" aria-labelledby={`${id}-who`}>
            {RECIPIENTS.map((r) => (
              <button key={r} type="button" className="mk-chip" aria-pressed={recipient === r} onClick={() => pickRecipient(r)}>
                {t(`recipients.${r}`)}
              </button>
            ))}
          </div>

          <label className="mk-composer__label" htmlFor={`${id}-msg`}>{t("messageLabel")}</label>
          <textarea
            id={`${id}-msg`}
            ref={textRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t("placeholder")}
            maxLength={2000}
            rows={4}
          />
          <div className="mk-starters" role="group" aria-label={t("startersLabel")}>
            {starters.map((s) => (
              <button key={s} type="button" className="mk-starter" onClick={() => applyStarter(s)}>
                {s.trim()}…
              </button>
            ))}
          </div>

          <p className="mk-composer__label" id={`${id}-when`}>{t("whenLabel")}</p>
          <div className="mk-chips" role="group" aria-labelledby={`${id}-when`}>
            {WHEN.map((w) => (
              <button key={w} type="button" className="mk-chip" aria-pressed={when === w} onClick={() => pickWhen(w)}>
                {t(`when.${w}`)}
              </button>
            ))}
          </div>

          <div className="mk-year">
            <label className="mk-small" htmlFor={`${id}-year`}>{t("yearLabel")}</label>
            <output htmlFor={`${id}-year`} aria-hidden={!showsYear} style={{ opacity: showsYear ? 1 : 0.35 }}>
              {year}
            </output>
          </div>
          <input
            id={`${id}-year`}
            className="mk-range"
            type="range"
            min={thisYear + 1}
            max={thisYear + YEARS_AHEAD}
            step={1}
            value={year}
            onChange={(e) => {
              setYear(Number(e.target.value));
              setWhen("year");
            }}
          />

          <div className="mk-composer__actions">
            <button type="submit" className="mk-btn mk-btn--primary" disabled={!text.trim()}>
              {t("seal")}
            </button>
            <span className="mk-small">{t("demoNote")}</span>
          </div>
        </form>
      )}
    </section>
  );
}
