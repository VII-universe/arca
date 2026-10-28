import { formatPrice, type MarketingPricing } from "@/lib/marketing/pricing";
import { getCopy } from "./copy";
import { Waypoint } from "./Waypoint";

// The sections after the journey, set on the sky like film titles. Same
// copy as before; cards only where there's a message or a plan. Their
// motion (constellation, guardians' mechanics) comes in M5.

type Card = { key: string; title: string; example: string };
type Step = { title: string; body: string };
type Point = { title: string; body: string };
type QA = { q: string; a: string };

export async function ForWhom() {
  const { t, raw } = await getCopy("Marketing.forWhom");
  const cards = raw<Card[]>("cards");
  return (
    <Waypoint waypoint="forWhom" id="for-whom" className="l-section" aria-labelledby="l-for-whom-title">
      <div className="l-wrap">
        <div className="l-col l-shade">
          <p className="l-kicker">{t("label")}</p>
          <h2 className="l-h2" id="l-for-whom-title">{t("title")}</h2>
          <p className="l-lead">{t("lead")}</p>
        </div>
        <ol className="l-forwhom">
          {cards.map((c, i) => (
            <li key={c.key} className="l-shade">
              <span className="l-index" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
              <h3>{c.title}</h3>
              <p>{c.example}</p>
            </li>
          ))}
        </ol>
      </div>
    </Waypoint>
  );
}

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
    <Waypoint waypoint="how" id="how-it-works" className="l-section" aria-labelledby="l-how-title">
      <div className="l-wrap">
        <div className="l-col l-shade">
          <p className="l-kicker">{t("label")}</p>
          <h2 className="l-h2" id="l-how-title">{t("title")}</h2>
        </div>
        <ol className="l-steps">
          {steps.map((step, i) => (
            <li key={step.title}>
              <div className="l-shade">
                <span className="l-index" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
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

// The message is a point of light; the guardians are two calm stars beside it.
function GuardiansFigure({ you, label }: { you: string; label: string }) {
  return (
    <svg className="l-guardians__figure" viewBox="0 0 360 260" role="img" aria-label={label}>
      <line x1="120" y1="150" x2="250" y2="82" className="l-thread" />
      <line x1="120" y1="150" x2="268" y2="196" className="l-thread" />
      <circle cx="120" cy="150" r="22" className="l-glow" />
      <circle cx="120" cy="150" r="5" className="l-light" />
      <circle cx="250" cy="82" r="2.6" className="l-star" />
      <circle cx="268" cy="196" r="2.2" className="l-star" />
      <text x="120" y="196" textAnchor="middle" className="l-figure-label">{you}</text>
    </svg>
  );
}

export async function Guardians() {
  const { t, raw } = await getCopy("Marketing.guardians");
  const steps = raw<string[]>("steps");
  return (
    <Waypoint waypoint="guardians" className="l-section" aria-labelledby="l-guardians-title">
      <div className="l-wrap l-guardians">
        <div className="l-col l-shade">
          <p className="l-kicker">{t("label")}</p>
          <h2 className="l-h2" id="l-guardians-title">{t("title")}</h2>
          <p className="l-lead">{t("lead")}</p>
          <ol className="l-list">
            {steps.map((s) => <li key={s}>{s}</li>)}
          </ol>
          <p className="l-note">{t("noGuardians")} {t("privacy")}</p>
        </div>
        <GuardiansFigure you={t("you")} label={t("diagram")} />
      </div>
    </Waypoint>
  );
}

// The quietest section: the camera stands still, the sky dims, two columns of facts.
export async function Security() {
  const { t, raw } = await getCopy("Marketing.security");
  const points = raw<Point[]>("points");
  const whatIf = raw<QA[]>("whatIf");
  return (
    <Waypoint waypoint="security" id="security" className="l-section l-security" aria-labelledby="l-security-title">
      <div className="l-wrap">
        <div className="l-col l-shade">
          <p className="l-kicker">{t("label")}</p>
          <h2 className="l-h2" id="l-security-title">{t("title")}</h2>
          <p className="l-lead">{t("lead")}</p>
        </div>
        <ul className="l-points l-shade">
          {points.map((p) => (
            <li key={p.title}>
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
    <Waypoint waypoint="pricing" id="pricing" className="l-section" aria-labelledby="l-pricing-title">
      <div className="l-wrap">
        <div className="l-col l-shade">
          <p className="l-kicker">{t("label")}</p>
          <h2 className="l-h2" id="l-pricing-title">{t("title")}</h2>
          <p className="l-lead">{t("lead")}</p>
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
        <p className="l-small l-shade">{t("note")}</p>
      </div>
    </Waypoint>
  );
}

// One sentence across the whole width, the whole solar system behind it.
export async function Statement() {
  const { t } = await getCopy("Marketing.timeline");
  return (
    <Waypoint waypoint="statement" className="l-statement" aria-label={t("finale")}>
      <div className="l-wrap">
        <p className="l-statement__text l-shade">{t("finale")}</p>
      </div>
    </Waypoint>
  );
}

// Native <details>: keyboard and screen-reader support for free, works without JS.
export async function Faq() {
  const { t, raw } = await getCopy("Marketing.faq");
  const items = raw<QA[]>("items");
  return (
    <Waypoint waypoint="faq" className="l-section" aria-labelledby="l-faq-title">
      <div className="l-wrap">
        <div className="l-col l-shade">
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
