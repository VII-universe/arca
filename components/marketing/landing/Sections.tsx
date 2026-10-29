import { formatPrice, type MarketingPricing } from "@/lib/marketing/pricing";
import { getCopy } from "./copy";
import { Waypoint } from "./Waypoint";

// The sections after the orbits, set on the sky like magazine spreads: a
// headline of 8–10 vw on every one, three sizes on every screen, and a
// composition that changes from section to section (brief, section 4).
// Same copy as before. Their motion (the five points joining up, the
// guardians' mechanics) comes in M5.

type Card = { key: string; title: string; example: string };
type Step = { title: string; body: string };
type Point = { title: string; body: string };
type QA = { q: string; a: string };

const two = (i: number) => String(i + 1).padStart(2, "0");

// Pro koho: the headline across the width, the five items as five points
// on one orbit, each with its words under it.
export async function ForWhom() {
  const { t, raw } = await getCopy("Marketing.forWhom");
  const cards = raw<Card[]>("cards");
  return (
    <Waypoint waypoint="forWhom" id="for-whom" className="l-section l-forwhom" aria-labelledby="l-for-whom-title">
      {/* Pinned on wide screens while the five points are joined one by one (Motion.tsx). */}
      <div className="l-pin" data-pin="forWhom">
      <div className="l-wrap">
        <div className="l-head l-shade">
          <p className="l-kicker">{t("label")}</p>
          <h2 className="l-h2" id="l-for-whom-title">{t("title")}</h2>
        </div>
        <p className="l-lead l-forwhom__lead l-shade">{t("lead")}</p>
        <ol className="l-points-orbit">
          <span className="l-points-orbit__line" aria-hidden="true"><span className="l-points-orbit__progress" /></span>
          {cards.map((c, i) => (
            <li key={c.key} className="l-shade" data-gone={c.key === "gone"} data-active={i === 0}>
              <span className="l-points-orbit__dot" aria-hidden="true" />
              <span className="l-index" aria-hidden="true">{two(i)}</span>
              <h3>{c.title}</h3>
              <p>{c.example}</p>
            </li>
          ))}
        </ol>
      </div>
      </div>
    </Waypoint>
  );
}

// Jak to funguje: four points on one trajectory, from the top left to the
// bottom right; the camera will stop at each (M5).
export async function HowItWorks() {
  const { t, raw } = await getCopy("Marketing.how");
  const steps = raw<Step[]>("steps");
  const kinds = raw<string[]>("ui.kinds");
  // A small, matte slice of the real app under each step.
  const snippets = [
    <div key="write" className="l-ui" aria-hidden="true">
      <div className="l-ui__row"><span>{t("ui.to")}</span><strong>{t("ui.recipient")}</strong></div>
      <p className="l-ui__text">{t("ui.draft")}</p>
      <div className="l-ui__pills">
        {kinds.map((k, i) => <span key={k} className="l-ui__pill" data-on={i === 0}>{k}</span>)}
      </div>
    </div>,
    <div key="when" className="l-ui" aria-hidden="true">
      <div className="l-ui__row"><span>{t("ui.when")}</span></div>
      <div className="l-ui__pills"><span className="l-ui__pill" data-on="true">{t("ui.whenValue")}</span></div>
    </div>,
    <div key="guardians" className="l-ui" aria-hidden="true">
      <div className="l-ui__row"><span>{t("ui.guardians")}</span></div>
      <div className="l-ui__people">
        <span className="l-ui__avatar">{t("ui.guardianA").slice(0, 1)}</span><strong>{t("ui.guardianA")}</strong>
        <span className="l-ui__avatar">{t("ui.guardianB").slice(0, 1)}</span><strong>{t("ui.guardianB")}</strong>
      </div>
    </div>,
    <div key="deliver" className="l-ui" aria-hidden="true">
      <div className="l-ui__row"><strong>{t("ui.mailSubject")}</strong></div>
      <div className="l-ui__pills"><span className="l-ui__pill" data-on="true">{t("ui.mailOpen")} →</span></div>
    </div>,
  ];
  return (
    <Waypoint waypoint="how" id="how-it-works" className="l-section l-how" aria-labelledby="l-how-title">
      <div className="l-wrap">
        <div className="l-head l-shade">
          <p className="l-kicker">{t("label")}</p>
          <h2 className="l-h2" id="l-how-title">{t("title")}</h2>
        </div>
        <ol className="l-trajectory">
          <svg className="l-trajectory__line" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <path className="l-trajectory__base" d="M 1 3 C 28 30, 40 40, 52 50 S 80 80, 94 97" vectorEffect="non-scaling-stroke" />
            <path className="l-trajectory__drawn" d="M 1 3 C 28 30, 40 40, 52 50 S 80 80, 94 97" vectorEffect="non-scaling-stroke" pathLength={1} />
          </svg>
          <span className="l-trajectory__light" aria-hidden="true" />
          {steps.map((step, i) => (
            <li key={step.title} className="l-trajectory__step" style={{ "--i": i } as React.CSSProperties} data-active={i === 0}>
              <span className="l-trajectory__n" aria-hidden="true">{two(i)}</span>
              <div className="l-shade">
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </div>
              {snippets[i]}
            </li>
          ))}
        </ol>
      </div>
    </Waypoint>
  );
}

// The message is a point of light; the guardians are two calm planets beside it. The figure plays the
// mechanism exactly as the text tells it (Motion.tsx drives it with the scroll, step by step):
// 1 the countdown ring round the light drains (days without activity), 2 two pulses go out to the guardians
// (the e-mail with two links), 3 one guardian answers — a pulse comes back and the ring refills, 4 nobody
// answers — the guardians stay quiet and, after the grace period, the light goes out on its way, calmly.
function GuardiansFigure({ you, label }: { you: string; label: string }) {
  const L = { x: 150, y: 226 }, G1 = { x: 372, y: 118 }, G2 = { x: 402, y: 318 };
  return (
    <svg className="l-guardians__figure" viewBox="0 0 520 420" role="img" aria-label={label}>
      <defs>
        <radialGradient id="l-g-planet" cx="38%" cy="34%" r="70%">
          <stop offset="0" stopColor="#dce6ff" stopOpacity="0.9" />
          <stop offset="0.55" stopColor="#6b7a9c" stopOpacity="0.9" />
          <stop offset="1" stopColor="#0a0f1c" stopOpacity="1" />
        </radialGradient>
        <radialGradient id="l-g-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0" style={{ stopColor: "var(--amber)" }} stopOpacity="0.55" />
          <stop offset="0.4" style={{ stopColor: "var(--amber)" }} stopOpacity="0.12" />
          <stop offset="1" style={{ stopColor: "var(--amber)" }} stopOpacity="0" />
        </radialGradient>
      </defs>
      <line x1={L.x} y1={L.y} x2={G1.x} y2={G1.y} className="l-thread" />
      <line x1={L.x} y1={L.y} x2={G2.x} y2={G2.y} className="l-thread" />
      <circle cx={L.x} cy={L.y} r="96" fill="url(#l-g-glow)" className="l-g-glow" />
      {/* The countdown: a ring that drains (pathLength 1, dashoffset 0 → 1). */}
      <circle cx={L.x} cy={L.y} r="30" className="l-g-ring-track" />
      <circle cx={L.x} cy={L.y} r="30" className="l-g-ring" pathLength={1} transform={`rotate(-90 ${L.x} ${L.y})`} />
      <circle cx={L.x} cy={L.y} r="7" className="l-light" />
      {/* The light on its way (step 4). */}
      <line x1={L.x} y1={L.y} x2={L.x - 140} y2={L.y + 150} className="l-g-ray" pathLength={1} />
      <circle cx={G1.x} cy={G1.y} r="34" fill="url(#l-g-planet)" className="l-g-planet l-g-planet--a" />
      <circle cx={G2.x} cy={G2.y} r="26" fill="url(#l-g-planet)" className="l-g-planet l-g-planet--b" />
      {/* The pulses: out to both guardians (step 2), back from one (step 3). */}
      <circle r="5" className="l-g-pulse l-g-pulse--a" cx={L.x} cy={L.y} data-x1={L.x} data-y1={L.y} data-x2={G1.x} data-y2={G1.y} />
      <circle r="5" className="l-g-pulse l-g-pulse--b" cx={L.x} cy={L.y} data-x1={L.x} data-y1={L.y} data-x2={G2.x} data-y2={G2.y} />
      <circle r="5" className="l-g-pulse l-g-pulse--back" cx={G1.x} cy={G1.y} data-x1={G1.x} data-y1={G1.y} data-x2={L.x} data-y2={L.y} />
      <text x={L.x} y={L.y + 66} textAnchor="middle" className="l-figure-label">{you}</text>
    </svg>
  );
}

// Strážci: the headline over the whole width, the figure large on the
// left, the mechanics — exactly as the text says — numbered on the right.
export async function Guardians() {
  const { t, raw } = await getCopy("Marketing.guardians");
  const steps = raw<string[]>("steps");
  return (
    <Waypoint waypoint="guardians" className="l-section l-guardians" aria-labelledby="l-guardians-title">
      <div className="l-wrap">
        <div className="l-head l-shade">
          <p className="l-kicker">{t("label")}</p>
          <h2 className="l-h2" id="l-guardians-title">{t("title")}</h2>
        </div>
        <GuardiansFigure you={t("you")} label={t("diagram")} />
        <div className="l-guardians__text l-shade">
          <p className="l-lead">{t("lead")}</p>
          <ol className="l-mech">
            {steps.map((s, i) => (
              <li key={s} data-step={i + 1}>
                <span className="l-mech__n" aria-hidden="true">{two(i)}</span>
                <p>{s}</p>
              </li>
            ))}
          </ol>
          <p className="l-note">{t("noGuardians")} {t("privacy")}</p>
        </div>
      </div>
    </Waypoint>
  );
}

// The quietest section: the camera stands still, the sky dims, the facts in two columns.
export async function Security() {
  const { t, raw } = await getCopy("Marketing.security");
  const points = raw<Point[]>("points");
  const whatIf = raw<QA[]>("whatIf");
  return (
    <Waypoint waypoint="security" id="security" className="l-section l-security" aria-labelledby="l-security-title">
      <div className="l-wrap">
        <div className="l-head l-shade">
          <p className="l-kicker">{t("label")}</p>
          <h2 className="l-h2" id="l-security-title">{t("title")}</h2>
        </div>
        <p className="l-lead l-security__lead l-shade">{t("lead")}</p>
        <ul className="l-points l-shade">
          {points.map((p, i) => (
            <li key={p.title}>
              <span className="l-index" aria-hidden="true">{two(i)}</span>
              <h3>{p.title}</h3>
              <p>{p.body}</p>
            </li>
          ))}
        </ul>
        <div className="l-whatif l-shade">
          <h3>{t("whatIfTitle")}</h3>
          <dl>
            {whatIf.map((item) => (
              <div key={item.q}>
                <dt>{item.q}</dt>
                <dd>{item.a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </Waypoint>
  );
}

// Ceník: the headline left, two matte obsidian cards right.
export async function Pricing({ pricing }: { pricing: MarketingPricing }) {
  const { t, raw, locale } = await getCopy("Marketing.pricing");
  const freeFeatures = raw<string[]>("free.features");
  const proFeatures = raw<string[]>("pro.features");
  const monthly = pricing.monthly ? formatPrice(pricing.monthly, locale) : null;
  const lifetime = pricing.lifetime ? formatPrice(pricing.lifetime, locale) : null;
  // Free is $0 in whatever currency Pro is billed in; without Stripe there's
  // no currency to show, so the amount is left out like Pro's.
  const freeCurrency = pricing.monthly?.currency ?? pricing.lifetime?.currency;
  const freePrice = freeCurrency ? formatPrice({ unitAmount: 0, currency: freeCurrency }, locale) : null;

  return (
    <Waypoint waypoint="pricing" id="pricing" className="l-section l-pricing" aria-labelledby="l-pricing-title">
      <div className="l-wrap">
        <div className="l-head l-pricing__head l-shade">
          <p className="l-kicker">{t("label")}</p>
          <h2 className="l-h2" id="l-pricing-title">{t("title")}</h2>
          <p className="l-lead">{t("lead")}</p>
          <p className="l-small">{t("note")}</p>
        </div>
        <div className="l-plans">
          <article className="l-card l-plan" aria-labelledby="l-plan-free">
            <h3 className="l-plan__name" id="l-plan-free">{t("free.name")}</h3>
            {freePrice && <p className="l-plan__price">{freePrice}</p>}
            <p className="l-plan__tagline">{t("free.tagline")}</p>
            <ul>
              <li>{t("free.messages", { count: pricing.freeMaxMessages })}</li>
              {freeFeatures.map((f) => <li key={f}>{f}</li>)}
            </ul>
            <a href="/login?mode=signup" className="l-btn l-btn--ghost">{t("free.cta")}</a>
          </article>
          <article className="l-card l-plan l-plan--pro" aria-labelledby="l-plan-pro">
            <h3 className="l-plan__name" id="l-plan-pro">{t("pro.name")}</h3>
            {monthly ? (
              <p className="l-plan__price">{monthly}<small>{t("pro.perMonth")}</small></p>
            ) : (
              <p className="l-plan__tagline">{t("pro.unavailable")}</p>
            )}
            {lifetime && <p className="l-plan__alt">{t("pro.orLifetime", { price: lifetime })}</p>}
            <p className="l-plan__tagline">{t("pro.tagline")}</p>
            <ul>
              {proFeatures.map((f) => <li key={f}>{f}</li>)}
            </ul>
            <a href="/dashboard/billing" className="l-btn l-btn--primary">{t("pro.cta")}</a>
          </article>
        </div>
      </div>
    </Waypoint>
  );
}

// One sentence across the whole width, the stars behind it.
export async function Statement() {
  const { t } = await getCopy("Marketing.timeline");
  return (
    <Waypoint waypoint="statement" className="l-statement" aria-label={t("finale")}>
      {/* Pinned in the middle while the camera holds, like a stop. */}
      <div className="l-pin" data-pin="statement">
        <div className="l-wrap">
          <p className="l-statement__text l-shade">{t("finale")}</p>
        </div>
      </div>
    </Waypoint>
  );
}

// FAQ: the headline on the left, the questions down the right.
// Native <details>: keyboard and screen-reader support for free, works without JS.
export async function Faq() {
  const { t, raw } = await getCopy("Marketing.faq");
  const items = raw<QA[]>("items");
  return (
    <Waypoint waypoint="faq" className="l-section l-faq-s" aria-labelledby="l-faq-title">
      <div className="l-wrap">
        <div className="l-head l-faq__head l-shade">
          <p className="l-kicker">{t("label")}</p>
          <h2 className="l-h2" id="l-faq-title">{t("title")}</h2>
        </div>
        <div className="l-faq l-shade">
          {items.map((item) => (
            <details key={item.q}>
              <summary>{item.q}</summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </Waypoint>
  );
}
