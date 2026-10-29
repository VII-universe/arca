import { getCopy } from "./copy";
import { Composer, type ComposerCopy } from "./Composer";
import { Waypoint } from "./Waypoint";

// Low Earth orbit, the night side with dawn on the limb: the headline across
// seven columns on the left, the Earth filling the right of the screen, the
// interactive sample below.
export async function Hero() {
  const { t, raw, rich, locale } = await getCopy("Marketing.hero");
  return (
    <Waypoint waypoint="hero" className="l-hero" aria-labelledby="l-hero-title">
      <div className="l-wrap l-hero__grid">
        <div className="l-hero__head">
          <p className="l-kicker l-shade">{t("kicker")}</p>
          <h1 className="l-display l-display--hero l-shade" id="l-hero-title">
            {rich("title", { em: (chunks) => <em>{chunks}</em> })}
          </h1>
        </div>
        <p className="l-lead l-hero__lead l-shade">{t("lead")}</p>
        <div className="l-hero__composer">
          <Composer copy={raw<ComposerCopy>("composer")} locale={locale} />
        </div>
      </div>
    </Waypoint>
  );
}
