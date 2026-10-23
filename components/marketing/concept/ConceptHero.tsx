"use client";

// M0 CONCEPT PROTOTYPE — hero variant A (Earth horizon) / B (into depth).
// Static composition for review; the sealing sequence is M3.

import { useState } from "react";
import { ConceptSky, type ConceptAtmosphere } from "./ConceptSky";

export type DisplayFont = "newsreader" | "instrument" | "bodoni";

// Verified stops (HYG v4.4 + SIMBAD) — see the concept board.
const STOPS: Record<number, string> = { 2032: "Barnardova hvězda", 2044: "Gliese 251", 2051: "Vega", 2070: "Titawin" };
const NOW = 2026;

export interface ConceptHeroCopy {
  kicker: string;
  title: React.ReactNode;
  lead: string;
  question: string;
  recipients: string[];
  message: string;
  seal: string;
  gone: string;
  nav: { links: string[]; signIn: string; start: string };
}

export function ConceptHero({
  variant,
  font = "newsreader",
  atmosphere = "nebula",
  copy,
}: {
  variant: "a" | "b";
  font?: DisplayFont;
  atmosphere?: ConceptAtmosphere;
  copy: ConceptHeroCopy;
}) {
  const [year, setYear] = useState(2044);
  const [gone, setGone] = useState(false);
  const ly = year - NOW;
  const depth = gone ? 1 : Math.min(0.85, ((year - NOW - 1) / 49) * 0.85);
  const star = STOPS[year];

  return (
    <section className={`cx-hero cx-hero--${variant}`}>
      <ConceptSky
        className="cx-sky"
        mode={variant === "a" ? "horizon" : "deep"}
        atmosphere={atmosphere}
        depth={depth}
        look={variant === "a" ? [18.6, 30] : [18.4, -24]}
      />
      <div className="cx-grain" aria-hidden="true" />

      <nav className="cx-nav" aria-label="Hlavní navigace">
        <span className="cx-nav__logo">ARCA</span>
        <span className="cx-nav__links">{copy.nav.links.map((l) => <span key={l}>{l}</span>)}</span>
        <span className="cx-nav__end">
          <span className="cx-nav__lang cx-mono"><b>CS</b> EN</span>
          <span className="cx-nav__signin">{copy.nav.signIn}</span>
          <span className="cx-btn-line">{copy.nav.start}</span>
        </span>
      </nav>

      <div className="cx-hero__grid">
        <div className="cx-hero__text">
          <p className="cx-kicker cx-mono">{copy.kicker}</p>
          <h1 className={`cx-display cx-display--${font}`}>{copy.title}</h1>
          <p className="cx-hero__lead">{copy.lead}</p>
        </div>

        <div className="cx-hero__card">
          <div className="cx-card">
            <p className="cx-card__q">{copy.question}</p>
            <div className="cx-chips">
              {copy.recipients.map((r, i) => (
                <button key={r} type="button" className="cx-chip" aria-pressed={i === 0}>{r}</button>
              ))}
            </div>
            <p className="cx-card__msg">{copy.message}</p>
            <div className="cx-card__when">
              <span className="cx-card__year">{gone ? "—" : year}</span>
              <span className="cx-mono">
                {gone ? copy.gone : `${ly} světelných let${star ? ` · ${star}` : ""}`}
              </span>
            </div>
            <input
              className="cx-range"
              type="range"
              aria-label="Rok doručení"
              min={NOW + 1}
              max={NOW + 50}
              value={year}
              onChange={(e) => {
                setGone(false);
                setYear(Number(e.target.value));
              }}
            />
            <div className="cx-card__actions">
              <button type="button" className="cx-chip" aria-pressed={gone} onClick={() => setGone((g) => !g)}>
                {copy.gone}
              </button>
              <button type="button" className="cx-seal">{copy.seal}</button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
