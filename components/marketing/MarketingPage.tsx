import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { LOCALES } from "@/i18n/config";
import { marketingPathFor } from "@/lib/marketing/paths";
import { getMarketingPricing } from "@/lib/marketing/pricing";
import { getOperatorInfo } from "@/lib/marketing/operator";
import { MarketingShell } from "./atmosphere";
import { MarketingNav } from "./MarketingNav";
import { HeroComposer } from "./HeroComposer";
import { LifeTimeline } from "./LifeTimeline";
import { ForWhom } from "./ForWhom";
import { HowItWorks } from "./HowItWorks";
import { Guardians } from "./Guardians";
import { AtmosphereSwitcher } from "./AtmosphereSwitcher";
import { Security } from "./Security";
import { Pricing } from "./Pricing";
import { Faq } from "./Faq";
import { FinalCta } from "./FinalCta";
import { MarketingFooter } from "./MarketingFooter";

// Shared by "/", "/en" and "/cs". The locale itself is decided in proxy.ts
// (LOCALE_HEADER), so every getTranslations() here already renders the
// page's language.
export async function marketingMetadata(path: string): Promise<Metadata> {
  const t = await getTranslations("Marketing.meta");
  const locale = await getLocale();
  return {
    title: t("title"),
    description: t("description"),
    alternates: {
      canonical: path,
      languages: {
        ...Object.fromEntries(LOCALES.map((l) => [l, marketingPathFor(l)])),
        "x-default": "/",
      },
    },
    openGraph: {
      title: t("title"),
      description: t("description"),
      url: path,
      siteName: "ARCA",
      locale,
      type: "website",
    },
  };
}

export async function MarketingPage() {
  const t = await getTranslations("Marketing.hero");
  const pricing = await getMarketingPricing();
  const operator = getOperatorInfo();

  return (
    <MarketingShell>
      <MarketingNav />
      <main id="main">
        <section className="mk-hero" aria-labelledby="mk-hero-title">
          <div className="mk-container mk-hero__grid">
            <div>
              <p className="mk-kicker">{t("kicker")}</p>
              <h1 className="mk-display" id="mk-hero-title">
                {t.rich("title", { em: (chunks) => <em>{chunks}</em> })}
              </h1>
              <p className="mk-lead">{t("lead")}</p>
            </div>
            <HeroComposer />
          </div>
        </section>
        <LifeTimeline />
        <ForWhom />
        <HowItWorks />
        <Guardians />
        <AtmosphereSwitcher />
        <Security />
        <Pricing pricing={pricing} />
        <Faq />
        <FinalCta />
      </main>
      <MarketingFooter operator={operator} />
    </MarketingShell>
  );
}
