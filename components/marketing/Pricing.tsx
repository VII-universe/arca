import { getLocale, getTranslations } from "next-intl/server";
import { formatPrice, type MarketingPricing } from "@/lib/marketing/pricing";

export async function Pricing({ pricing }: { pricing: MarketingPricing }) {
  const t = await getTranslations("Marketing.pricing");
  const locale = await getLocale();
  const freeFeatures = t.raw("free.features") as string[];
  const proFeatures = t.raw("pro.features") as string[];

  const monthly = pricing.monthly ? formatPrice(pricing.monthly, locale) : null;
  const lifetime = pricing.lifetime ? formatPrice(pricing.lifetime, locale) : null;
  // Free is $0 in whatever currency Pro is billed in; without Stripe there's
  // no currency to show, so the amount is left out like Pro's.
  const freeCurrency = pricing.monthly?.currency ?? pricing.lifetime?.currency;
  const freePrice = freeCurrency ? formatPrice({ unitAmount: 0, currency: freeCurrency }, locale) : null;

  return (
    <section id="pricing" className="mk-section" aria-labelledby="mk-pricing-title">
      <div className="mk-container">
        <p className="mk-kicker">{t("label")}</p>
        <h2 className="mk-h2" id="mk-pricing-title">{t("title")}</h2>
        <p className="mk-lead">{t("lead")}</p>

        <div className="mk-plans">
          <article className="mk-plan mk-glass" aria-labelledby="mk-plan-free">
            <h3 className="mk-plan__name" id="mk-plan-free">{t("free.name")}</h3>
            {freePrice && <p className="mk-plan__price mk-num">{freePrice}</p>}
            <p className="mk-plan__tagline">{t("free.tagline")}</p>
            <ul>
              <li>{t("free.messages", { count: pricing.freeMaxMessages })}</li>
              {freeFeatures.map((f) => <li key={f}>{f}</li>)}
            </ul>
            <a href="/login?mode=signup" className="mk-btn mk-btn--ghost">{t("free.cta")}</a>
          </article>

          <article className="mk-plan mk-plan--pro mk-glass" aria-labelledby="mk-plan-pro">
            <h3 className="mk-plan__name" id="mk-plan-pro">{t("pro.name")}</h3>
            {monthly ? (
              <p className="mk-plan__price mk-num">
                {monthly}<small>{t("pro.perMonth")}</small>
              </p>
            ) : (
              <p className="mk-plan__tagline">{t("pro.unavailable")}</p>
            )}
            {lifetime && <p className="mk-plan__alt mk-num">{t("pro.orLifetime", { price: lifetime })}</p>}
            <p className="mk-plan__tagline">{t("pro.tagline")}</p>
            <ul>
              {proFeatures.map((f) => <li key={f}>{f}</li>)}
            </ul>
            <a href="/dashboard/billing" className="mk-btn mk-btn--primary">{t("pro.cta")}</a>
          </article>
        </div>
        <p className="mk-small" style={{ marginTop: 20 }}>{t("note")}</p>
      </div>
    </section>
  );
}
