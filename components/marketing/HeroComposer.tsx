"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { saveLandingDraft, type DraftRecipient, type DraftWhen } from "@/lib/marketing/landing-draft";
import { sceneState } from "./scene/sceneState";
import type { OrbDraw, RGB } from "./scene/renderer";
import { Odometer } from "./Odometer";

gsap.registerPlugin(useGSAP);

// The interactive hero: write a message, pick who and when, seal it. Nothing
// is sent — the draft only stays in this browser so the composer can offer it
// after sign-up (lib/marketing/landing-draft.ts).

const RECIPIENTS: DraftRecipient[] = ["child", "partner", "self", "mom", "other"];
const WHEN_CHIPS = ["oneYear", "tenYears", "eighteen", "gone"] as const;
const YEARS_AHEAD = 50;
const ORB_PX = 120;

// The light of time: near future is morning-warm, the far future deep blue;
// "when I'm gone" is night.
const TIME_STOPS: [number, RGB][] = [
  [0, [1, 0.62, 0.26]],
  [0.2, [1, 0.42, 0.6]],
  [0.5, [0.2, 0.82, 0.84]],
  [1, [0.38, 0.42, 1]],
];
const NIGHT: RGB = [0.46, 0.38, 0.95];

function timeColor(t: number): RGB {
  const x = Math.min(1, Math.max(0, t));
  for (let i = 1; i < TIME_STOPS.length; i++) {
    const [t1, c1] = TIME_STOPS[i];
    const [t0, c0] = TIME_STOPS[i - 1];
    if (x <= t1) {
      const k = (x - t0) / (t1 - t0);
      return [0, 1, 2].map((j) => c0[j] + (c1[j] - c0[j]) * k) as RGB;
    }
  }
  return TIME_STOPS[TIME_STOPS.length - 1][1];
}

const rgbCss = (c: RGB) => `rgb(${Math.round(c[0] * 255)} ${Math.round(c[1] * 255)} ${Math.round(c[2] * 255)})`;

export function HeroComposer() {
  const t = useTranslations("Marketing.hero.composer");
  const id = useId();
  const cardRef = useRef<HTMLElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const lightRef = useRef<HTMLDivElement>(null);
  const morphRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLAnchorElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const flightOrbs = useRef<OrbDraw[]>([]);

  const [thisYear] = useState(() => new Date().getFullYear());
  const [recipient, setRecipient] = useState<DraftRecipient | null>(null);
  const [text, setText] = useState("");
  const [when, setWhen] = useState<DraftWhen>("tenYears");
  const [year, setYear] = useState(() => thisYear + 10);
  const [sealed, setSealed] = useState(false);
  const [dragging, setDragging] = useState(false);

  const starters = t.raw("starters") as string[];
  const showsYear = when === "oneYear" || when === "tenYears" || when === "year";
  const progress = when === "gone" ? 1 : when === "eighteen" ? 0.36 : (year - thisYear) / YEARS_AHEAD;
  const tint = when === "gone" ? NIGHT : timeColor(progress);

  // Dragging through the years changes the light behind the hero.
  useEffect(() => {
    const hero = cardRef.current?.closest<HTMLElement>(".mk-hero");
    if (!hero) return;
    hero.style.setProperty("--mk-time-color", rgbCss(tint));
    hero.style.setProperty("--mk-time-amount", dragging ? "0.32" : "0.18");
  }, [tint, dragging]);

  const { contextSafe } = useGSAP(
    () => () => {
      // Unmounted mid-flight: don't leave our orb behind in the shared scene.
      sceneState.overlayOrbs = sceneState.overlayOrbs.filter((o) => !flightOrbs.current.includes(o));
      sceneState.starBoost = 1;
    },
    { scope: cardRef }
  );

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

  // contextSafe is applied inside the handlers (not at render), so GSAP still
  // reverts these tweens on unmount and the refs are only read on events.
  function seal() {
    contextSafe(runSeal)();
  }

  function runSeal() {
    const card = cardRef.current;
    const form = formRef.current;
    const light = lightRef.current;
    const morph = morphRef.current;
    if (!card || !form || !light || !morph) return;

    saveLandingDraft({ text, recipient, when, year });

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const rect = card.getBoundingClientRect();
    const H = window.innerHeight;
    // Fold into — and later answer in — the middle of the part of the card
    // that's on screen; on a phone the card is often taller than the viewport.
    const cx = rect.left + rect.width / 2;
    const cy = (Math.max(rect.top, 0) + Math.min(rect.bottom, H)) / 2;
    // Keep the card's height through the whole sequence — the sealed view is
    // shorter, and a late height change would be a layout shift.
    card.style.minHeight = `${rect.height}px`;
    card.style.setProperty("--sealed-center", `${cy - rect.top}px`);

    if (reduce) {
      // Reduced motion: no flight, just a quiet fade.
      gsap.timeline()
        .to(form, { opacity: 0, duration: 0.4 })
        .call(() => setSealed(true))
        .fromTo(card, { opacity: 0.4 }, { opacity: 1, duration: 0.6 })
        .call(() => ctaRef.current?.focus({ preventScroll: true }));
      return;
    }

    const root = card.closest<HTMLElement>(".mk");
    const webgl = root?.dataset.scene === "webgl";
    // Where it flies: up and away, into the far field of lights.
    const toX = window.innerWidth * (0.55 + Math.random() * 0.3);
    const toY = H * 0.14;

    // The morph layer is placed once over the card and only ever animated
    // with clip-path and transforms — moving it with left/top/width/height
    // would register as layout shift.
    const insetX = (rect.width - ORB_PX) / 2;
    const insetTop = cy - rect.top - ORB_PX / 2;
    const insetBottom = rect.bottom - cy - ORB_PX / 2;
    gsap.set(morph, {
      display: "block",
      opacity: 0,
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
      x: 0,
      y: 0,
      scale: 1,
      clipPath: "inset(0px 0px 0px 0px round 28px)",
      "--morph-color": rgbCss(tint),
      "--morph-cx": `${cx - rect.left}px`,
      "--morph-cy": `${cy - rect.top}px`,
    });

    const tl = gsap.timeline({ defaults: { ease: "power2.inOut" } });
    // 1. Light gathers inside the glass; the words dissolve into it.
    tl.to(light, { opacity: 1, duration: 1.1 }, 0)
      .to(form, { opacity: 0, filter: "blur(12px)", duration: 0.9 }, 0.15)
      // 2. The card folds into a glowing orb.
      .to(morph, { opacity: 1, duration: 0.35 }, 0.85)
      .to(card, { opacity: 0, duration: 0.45 }, 0.95)
      .to(morph, {
        clipPath: `inset(${insetTop}px ${insetX}px ${insetBottom}px ${insetX}px round ${ORB_PX / 2}px)`,
        duration: 1,
        ease: "expo.inOut",
      }, 0.95)
      .call(() => {
        setSealed(true);
        gsap.set(light, { opacity: 0 });
      }, [], 1.9);

    // 3. It rises and drifts away into the depth, among the other lights.
    if (webgl) {
      // Hand over to the shader so the orb gets real refraction.
      const orb: OrbDraw = { x: cx / H, y: cy / H, r: ORB_PX / 2 / H, opacity: 0, tint, light: 1.2 };
      flightOrbs.current.push(orb);
      tl.call(() => { sceneState.overlayOrbs = [...sceneState.overlayOrbs, orb]; }, [], 1.9)
        .to(orb, { opacity: 1, duration: 0.4 }, 1.9)
        .to(morph, { opacity: 0, duration: 0.4 }, 1.95)
        .to(orb, { x: toX / H, y: toY / H, r: 0.004, duration: 2.8, ease: "sine.inOut" }, 2.15)
        .to(orb, { opacity: 0, duration: 0.9, ease: "sine.in" }, 4.2)
        .to(sceneState, { starBoost: 1.9, duration: 0.6, yoyo: true, repeat: 1 }, 4.3)
        .call(() => {
          sceneState.overlayOrbs = sceneState.overlayOrbs.filter((o) => o !== orb);
          flightOrbs.current = flightOrbs.current.filter((o) => o !== orb);
        });
    } else {
      tl.to(morph, {
        x: toX - cx,
        y: toY - cy,
        scale: 4 / ORB_PX,
        duration: 2.8,
        ease: "sine.inOut",
      }, 2.15).to(morph, { opacity: 0, duration: 0.9, ease: "sine.in" }, 4.2);
    }
    tl.set(morph, { display: "none" });

    // 4. The card returns, holding the answer.
    tl.to(card, { opacity: 1, duration: 1.1 }, 2.3)
      .call(() => ctaRef.current?.focus({ preventScroll: true }), [], 3.2);
  }

  function reset() {
    contextSafe(runReset)();
  }

  function runReset() {
    const card = cardRef.current;
    setSealed(false);
    setText("");
    if (card) {
      card.style.minHeight = "";
      card.style.removeProperty("--sealed-center");
      gsap.fromTo(card, { opacity: 0 }, { opacity: 1, duration: 0.8, ease: "power2.out" });
    }
    requestAnimationFrame(() => textRef.current?.focus());
  }

  const sealedWhen =
    when === "eighteen" ? t("sealedEighteen") : when === "gone" ? t("sealedGone") : t("sealedYear", { year });

  return (
    <>
      <section ref={cardRef} className="mk-composer mk-glass" aria-label={t("label")} data-sealed={sealed}>
        <div ref={lightRef} className="mk-composer__light" aria-hidden="true" style={{ "--morph-color": rgbCss(tint) } as React.CSSProperties} />
        {/* Announces the seal result to screen readers. */}
        <p className="mk-sr" aria-live="polite">{sealed ? `${t("sealedTitle")} ${sealedWhen}` : ""}</p>

        {sealed ? (
          <div className="mk-sealed">
            {showsYear && (
              <p className="mk-sealed__year" aria-hidden="true">
                <Odometer from={thisYear} value={year} />
              </p>
            )}
            <p className="mk-sealed__title mk-rise">{t("sealedTitle")}</p>
            <p className="mk-sealed__when mk-rise" style={{ animationDelay: "0.25s" }}>{sealedWhen}</p>
            <div className="mk-composer__actions mk-rise" style={{ justifyContent: "center", animationDelay: "0.5s" }}>
              <a ref={ctaRef} href={`/login?mode=signup&next=${encodeURIComponent("/dashboard/arca/new")}`} className="mk-btn mk-btn--primary">
                {t("saveCta")}
              </a>
              <button type="button" className="mk-btn mk-btn--ghost" onClick={reset}>{t("again")}</button>
            </div>
            <p className="mk-small mk-rise" style={{ marginTop: 18, animationDelay: "0.7s" }}>{t("demoNote")}</p>
          </div>
        ) : (
          <form
            ref={formRef}
            onSubmit={(e) => {
              e.preventDefault();
              if (text.trim()) seal();
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
              {WHEN_CHIPS.map((w) => (
                <button key={w} type="button" className="mk-chip" aria-pressed={when === w} onClick={() => pickWhen(w)}>
                  {t(`when.${w}`)}
                </button>
              ))}
            </div>

            <div className="mk-year">
              <label className="mk-small" htmlFor={`${id}-year`}>{t("yearLabel")}</label>
              <output htmlFor={`${id}-year`} className="mk-num" style={{ opacity: showsYear ? 1 : 0.35 }}>
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
              style={{ "--mk-range-color": rgbCss(tint) } as React.CSSProperties}
              onPointerDown={() => setDragging(true)}
              onPointerUp={() => setDragging(false)}
              onPointerCancel={() => setDragging(false)}
              onBlur={() => setDragging(false)}
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
      {/* The card's light, folded into an orb — flies outside the card. */}
      <div ref={morphRef} className="mk-morph" aria-hidden="true" />
    </>
  );
}
