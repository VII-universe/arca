import { getCopy } from "./copy";
import { Composer, type ComposerCopy } from "./Composer";
import { Waypoint } from "./Waypoint";

// The view from the meadow: the headline set like a film title over the
// night sky, the interactive sample below it.
export async function Hero() {
  const { t, raw, rich } = await getCopy("Marketing.hero");
  return (
    <Waypoint waypoint="earth" className="l-hero" aria-labelledby="l-hero-title">
      <div className="l-wrap l-hero__grid">
        <div className="l-hero__head l-shade">
          <p className="l-kicker">{t("kicker")}</p>
          <h1 className="l-display" id="l-hero-title">
            {rich("title", { em: (chunks) => <em>{chunks}</em> })}
          </h1>
        </div>
        <p className="l-lead l-hero__lead l-shade">{t("lead")}</p>
        <div className="l-hero__composer">
          <Composer copy={raw<ComposerCopy>("composer")} />
        </div>
      </div>
    </Waypoint>
  );
}
