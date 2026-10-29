import { getMarketingPricing } from "@/lib/marketing/pricing";
import { getOperatorInfo } from "@/lib/marketing/operator";
import { CosmosStage } from "../cosmos/CosmosStage";
import { Atmospheres, type AtmospheresCopy } from "./Atmospheres";
import type { Atmosphere } from "../atmosphere";
import { FinalCta, Footer, Galaxy } from "./Closing";
import { Hero } from "./Hero";
import { Nav, type NavCopy } from "./Nav";
import { getCopy } from "./copy";
import { Faq, ForWhom, Guardians, HowItWorks, Pricing, Security, Statement } from "./Sections";
import { Timeline } from "./Timeline";
import { Motion } from "./Motion";

// v3 „Oběhy“: one scene behind the whole page, one camera flown by scroll
// from low Earth orbit to the Galaxy and back; every section below is a
// shot of that journey (cosmos/journey.ts).
export async function LandingPage() {
  const pricing = await getMarketingPricing();
  const operator = getOperatorInfo();
  const [marketing, appearance] = await Promise.all([getCopy("Marketing"), getCopy("Appearance")]);
  return (
    <div className="l-page">
      <CosmosStage />
      <Motion />
      <Nav copy={marketing.raw<NavCopy>("nav")} locale={marketing.locale} />
      <main id="main" className="l-main">
        <Hero />
        <Timeline />
        <ForWhom />
        <HowItWorks />
        <Guardians />
        <Statement />
        <Atmospheres copy={marketing.raw<AtmospheresCopy>("world")} scenes={appearance.raw<Record<Atmosphere, string>>("scenes")} />
        <Security />
        <Pricing pricing={pricing} />
        <Faq />
        <Galaxy />
        <FinalCta />
      </main>
      <Footer operator={operator} />
    </div>
  );
}
