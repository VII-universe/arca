import { getMarketingPricing } from "@/lib/marketing/pricing";
import { getOperatorInfo } from "@/lib/marketing/operator";
import { SkyStage } from "../sky/SkyStage";
import { Atmospheres, type AtmospheresCopy } from "./Atmospheres";
import type { Atmosphere } from "../atmosphere";
import { FinalCta, Footer } from "./Closing";
import { Hero } from "./Hero";
import { Nav, type NavCopy } from "./Nav";
import { getCopy } from "./copy";
import { Faq, ForWhom, Guardians, HowItWorks, Pricing, Security } from "./Sections";
import { Timeline } from "./Timeline";

// v2 „Světlo na cestě“: one sky behind the whole page, one camera flown by
// scroll; every section below is a waypoint (sky/journey.ts).
export async function LandingPage() {
  const pricing = await getMarketingPricing();
  const operator = getOperatorInfo();
  const [marketing, appearance] = await Promise.all([getCopy("Marketing"), getCopy("Appearance")]);
  return (
    <div className="l-page">
      <SkyStage />
      <Nav copy={marketing.raw<NavCopy>("nav")} locale={marketing.locale} />
      <main id="main" className="l-main">
        <Hero />
        <Timeline />
        <ForWhom />
        <HowItWorks />
        <Guardians />
        <Atmospheres copy={marketing.raw<AtmospheresCopy>("world")} scenes={appearance.raw<Record<Atmosphere, string>>("scenes")} />
        <Security />
        <Pricing pricing={pricing} />
        <Faq />
        <FinalCta />
      </main>
      <Footer operator={operator} />
    </div>
  );
}
