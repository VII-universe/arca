"use client";

import { useEffect, useId, useRef, useState } from "react";
import { saveLandingDraft, type DraftRecipient, type DraftWhen } from "@/lib/marketing/landing-draft";
import { formatIcuPlural } from "./plural";

// The interactive sample in the hero: who, the words, when. Nothing is sent —
// the draft only stays in this browser so the composer in the app can offer
// it after sign-up (lib/marketing/landing-draft.ts).
//
// The scene answers it: every year on the slider draws another orbit line
// round the Earth ("when I'm gone" dissolves them); sealing gathers the words
// into the message's light, which lifts off from the night side into orbit
// (CosmosStage listens for the events below). 2.5–3.5 s, skippable, no
// layout shift, announced to screen readers, focus on the CTA.
// Copy comes in as props from the server (no i18n runtime on the client).

export const SEAL_EVENTS = { years: "arca:years", seal: "arca:seal", skip: "arca:seal-skip", unseal: "arca:unseal" } as const;
export interface YearsDetail { years: number; gone: boolean }
export interface SealDetail { from: [number, number] }
const GATHER_MS = 700;

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
  /** ICU: "Na cestě do roku {year}. {count, plural, …}." */
  sealedOrbits: string;
  skip: string;
}

const RECIPIENTS: DraftRecipient[] = ["child", "partner", "self", "mom", "other"];
const WHEN_CHIPS = ["oneYear", "tenYears", "eighteen", "gone"] as const;
const YEARS_AHEAD = 50;

export function Composer({ copy, locale }: { copy: ComposerCopy; locale: string }) {
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
  const [gathering, setGathering] = useState(false);
  const [animating, setAnimating] = useState(false);
  const sealBtnRef = useRef<HTMLButtonElement>(null);
  const gatherTimer = useRef<number>(0);

  const showsYear = when === "oneYear" || when === "tenYears" || when === "year";
  const orbits = year - thisYear;

  // The scene draws a ring per year of waiting.
  useEffect(() => {
    const detail: YearsDetail = { years: when === "gone" ? 0 : when === "eighteen" ? 18 : orbits, gone: when === "gone" };
    window.dispatchEvent(new CustomEvent(SEAL_EVENTS.years, { detail }));
  }, [when, orbits]);
  useEffect(() => () => window.clearTimeout(gatherTimer.current), []);

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
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // The words gather into the light at the button; the scene takes it from there.
    const b = sealBtnRef.current?.getBoundingClientRect();
    const from: [number, number] = b ? [b.left + b.width / 2, b.top + b.height / 2] : [window.innerWidth / 2, window.innerHeight / 2];
    window.dispatchEvent(new CustomEvent(SEAL_EVENTS.seal, { detail: { from } satisfies SealDetail }));
    if (reduced) {
      window.dispatchEvent(new Event(SEAL_EVENTS.skip));
      finish();
      return;
    }
    setGathering(true);
    setAnimating(true);
    gatherTimer.current = window.setTimeout(finish, GATHER_MS);
    window.setTimeout(() => setAnimating(false), 3400);
  }

  function finish() {
    setGathering(false);
    setSealed(true);
    requestAnimationFrame(() => ctaRef.current?.focus({ preventScroll: true }));
  }

  function skip() {
    window.clearTimeout(gatherTimer.current);
    window.dispatchEvent(new Event(SEAL_EVENTS.skip));
    setAnimating(false);
    finish();
  }

  function reset() {
    const card = cardRef.current;
    if (card) card.style.minHeight = "";
    window.dispatchEvent(new Event(SEAL_EVENTS.unseal));
    setSealed(false);
    setAnimating(false);
    setText("");
    requestAnimationFrame(() => textRef.current?.focus());
  }

  // Year-based messages count their orbits ("Na cestě do roku 2044. 18 oběhů."); the others keep their own line.
  const sealedWhen =
    when === "eighteen" ? copy.sealedEighteen : when === "gone" ? copy.sealedGone : formatIcuPlural(copy.sealedOrbits, { year, count: orbits }, locale);
  const words = text.trim().split(/\s+/).slice(0, 80);

  return (
    <section ref={cardRef} className="l-card l-composer" aria-label={copy.label} data-sealed={sealed} data-gathering={gathering}>
      {/* Announces the result to screen readers. */}
      <p className="l-sr" aria-live="polite">{sealed ? `${copy.sealedTitle} ${sealedWhen}` : ""}</p>

      {sealed || gathering ? (
        // The sealed view is laid out at once (hidden while the words gather over it), so nothing ever moves.
        <div className="l-sealed" data-hidden={gathering}>
          {showsYear && <p className="l-sealed__year" aria-hidden="true">{year}</p>}
          <p className="l-sealed__title">{copy.sealedTitle}</p>
          <p className="l-sealed__when">{sealedWhen}</p>
          <div className="l-actions">
            <a ref={ctaRef} href={`/login?mode=signup&next=${encodeURIComponent("/dashboard/arca/new")}`} className="l-btn l-btn--primary" tabIndex={gathering ? -1 : 0}>
              {copy.saveCta}
            </a>
            <button type="button" className="l-btn l-btn--ghost" onClick={reset} tabIndex={gathering ? -1 : 0}>{copy.again}</button>
            {/* Always in the row (hidden once the light is in orbit), so nothing shifts when it goes. */}
            <button type="button" className="l-btn l-btn--sm l-btn--ghost" onClick={skip} style={{ visibility: animating ? "visible" : "hidden" }} aria-hidden={!animating} tabIndex={animating && !gathering ? 0 : -1}>{copy.skip}</button>
          </div>
          <p className="l-small">{copy.demoNote}</p>
          {gathering && (
            // The words of the message fly into the light at the seal button (700 ms), laid over the sealed view.
            <div className="l-gather" aria-hidden="true">
              <p className="l-gather__words">
                {words.map((w, i) => (
                  <span key={i} style={{ "--i": i / Math.max(1, words.length - 1) } as React.CSSProperties}>{w} </span>
                ))}
              </p>
              <div className="l-actions l-gather__actions">
                <span className="l-btn l-btn--primary l-gather__seal">{copy.seal}</span>
                <button type="button" className="l-btn l-btn--sm l-btn--ghost" onClick={skip} aria-hidden="false">{copy.skip}</button>
              </div>
            </div>
          )}
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
            <button ref={sealBtnRef} type="submit" className="l-btn l-btn--primary" disabled={!text.trim()}>{copy.seal}</button>
            <span className="l-small">{copy.demoNote}</span>
          </div>
        </form>
      )}
    </section>
  );
}
