"use client";

import { useId, useRef, useState } from "react";
import { saveLandingDraft, type DraftRecipient, type DraftWhen } from "@/lib/marketing/landing-draft";

// The interactive sample in the hero: who, the words, when. Nothing is sent —
// the draft only stays in this browser so the composer in the app can offer
// it after sign-up (lib/marketing/landing-draft.ts). M2: static layout; the
// sealing sequence and the sky's response to the year come in M3.
// Copy comes in as props from the server (no i18n runtime on the client).

export interface ComposerCopy {
  label: string;
  question: string;
  recipients: Record<DraftRecipient, string>;
  messageLabel: string;
  placeholder: string;
  startersLabel: string;
  starters: string[];
  whenLabel: string;
  yearLabel: string;
  when: Record<(typeof WHEN_CHIPS)[number], string>;
  seal: string;
  sealedTitle: string;
  /** "{year}" is replaced with the year. */
  sealedYear: string;
  sealedEighteen: string;
  sealedGone: string;
  demoNote: string;
  saveCta: string;
  again: string;
}

const RECIPIENTS: DraftRecipient[] = ["child", "partner", "self", "mom", "other"];
const WHEN_CHIPS = ["oneYear", "tenYears", "eighteen", "gone"] as const;
const YEARS_AHEAD = 50;

export function Composer({ copy }: { copy: ComposerCopy }) {
  const id = useId();
  const cardRef = useRef<HTMLElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const ctaRef = useRef<HTMLAnchorElement>(null);

  const [thisYear] = useState(() => new Date().getFullYear());
  const [recipient, setRecipient] = useState<DraftRecipient | null>(null);
  const [text, setText] = useState("");
  const [when, setWhen] = useState<DraftWhen>("tenYears");
  const [year, setYear] = useState(() => thisYear + 10);
  const [sealed, setSealed] = useState(false);

  const showsYear = when === "oneYear" || when === "tenYears" || when === "year";

  function pickRecipient(r: DraftRecipient) {
    setRecipient(r);
    if (r === "self") pickWhen("tenYears");
  }

  function pickWhen(w: DraftWhen) {
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

  function seal() {
    saveLandingDraft({ text, recipient, when, year });
    // Keep the card's height: the sealed view is shorter (no layout shift).
    const card = cardRef.current;
    if (card) card.style.minHeight = `${card.getBoundingClientRect().height}px`;
    setSealed(true);
    requestAnimationFrame(() => ctaRef.current?.focus({ preventScroll: true }));
  }

  function reset() {
    const card = cardRef.current;
    if (card) card.style.minHeight = "";
    setSealed(false);
    setText("");
    requestAnimationFrame(() => textRef.current?.focus());
  }

  const sealedWhen =
    when === "eighteen" ? copy.sealedEighteen : when === "gone" ? copy.sealedGone : copy.sealedYear.replace("{year}", String(year));

  return (
    <section ref={cardRef} className="l-card l-composer" aria-label={copy.label} data-sealed={sealed}>
      {/* Announces the result to screen readers. */}
      <p className="l-sr" aria-live="polite">{sealed ? `${copy.sealedTitle} ${sealedWhen}` : ""}</p>

      {sealed ? (
        <div className="l-sealed">
          {showsYear && <p className="l-sealed__year" aria-hidden="true">{year}</p>}
          <p className="l-sealed__title">{copy.sealedTitle}</p>
          <p className="l-sealed__when">{sealedWhen}</p>
          <div className="l-actions">
            <a ref={ctaRef} href={`/login?mode=signup&next=${encodeURIComponent("/dashboard/arca/new")}`} className="l-btn l-btn--primary">
              {copy.saveCta}
            </a>
            <button type="button" className="l-btn l-btn--ghost" onClick={reset}>{copy.again}</button>
          </div>
          <p className="l-small">{copy.demoNote}</p>
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (text.trim()) seal();
          }}
        >
          <p className="l-composer__q" id={`${id}-who`}>{copy.question}</p>
          <div className="l-chips" role="group" aria-labelledby={`${id}-who`}>
            {RECIPIENTS.map((r) => (
              <button key={r} type="button" className="l-chip" aria-pressed={recipient === r} onClick={() => pickRecipient(r)}>
                {copy.recipients[r]}
              </button>
            ))}
          </div>

          <label className="l-label" htmlFor={`${id}-msg`}>{copy.messageLabel}</label>
          <textarea
            id={`${id}-msg`}
            ref={textRef}
            className="l-textarea"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={copy.placeholder}
            maxLength={2000}
            rows={4}
          />
          <div className="l-starters" role="group" aria-label={copy.startersLabel}>
            {copy.starters.map((s) => (
              <button key={s} type="button" className="l-starter" onClick={() => applyStarter(s)}>
                {s.trim()}…
              </button>
            ))}
          </div>

          <p className="l-label" id={`${id}-when`}>{copy.whenLabel}</p>
          <div className="l-chips" role="group" aria-labelledby={`${id}-when`}>
            {WHEN_CHIPS.map((w) => (
              <button key={w} type="button" className="l-chip" aria-pressed={when === w} onClick={() => pickWhen(w)}>
                {copy.when[w]}
              </button>
            ))}
          </div>

          <div className="l-year">
            <label className="l-small" htmlFor={`${id}-year`}>{copy.yearLabel}</label>
            <output htmlFor={`${id}-year`} className="l-year__value" data-muted={!showsYear}>{year}</output>
          </div>
          <input
            id={`${id}-year`}
            className="l-range"
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

          <div className="l-actions">
            <button type="submit" className="l-btn l-btn--primary" disabled={!text.trim()}>{copy.seal}</button>
            <span className="l-small">{copy.demoNote}</span>
          </div>
        </form>
      )}
    </section>
  );
}
