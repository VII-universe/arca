"use client";

import { useTranslations } from "next-intl";
import { ATMOSPHERES, useAtmosphere, type Atmosphere } from "./atmosphere";

const SWATCHES: Record<Atmosphere, string> = {
  nebula: "radial-gradient(circle at 30% 30%, var(--orb-magenta), transparent 60%), radial-gradient(circle at 70% 75%, var(--orb-turquoise), transparent 60%), #120a1c",
  sunset: "radial-gradient(circle at 30% 30%, var(--orb-orange), transparent 60%), radial-gradient(circle at 70% 75%, var(--orb-pink), transparent 60%), #1a0a08",
  ocean: "radial-gradient(circle at 30% 30%, var(--orb-blue), transparent 60%), radial-gradient(circle at 70% 75%, var(--orb-turquoise), transparent 60%), #04101f",
  midnight: "radial-gradient(circle at 35% 35%, #3b2a8a, transparent 65%), radial-gradient(circle at 70% 75%, #1a2a6a, transparent 60%), #040212",
  stars: "radial-gradient(1.5px 1.5px at 30% 35%, #fff, transparent), radial-gradient(1px 1px at 65% 60%, #fff, transparent), radial-gradient(1px 1px at 45% 75%, #fff, transparent), radial-gradient(circle at 50% 50%, #142036, #020308 70%)",
};

export function AtmosphereSwitcher() {
  const t = useTranslations("Marketing.world");
  const scenes = useTranslations("Appearance.scenes");
  const [atmosphere, setAtmosphere] = useAtmosphere();

  return (
    <section className="mk-section mk-world" aria-labelledby="mk-world-title">
      <div className="mk-container">
        <p className="mk-kicker">{t("label")}</p>
        <h2 className="mk-h2" id="mk-world-title">{t("title")}</h2>
        <p className="mk-lead">{t("lead")}</p>
        <div className="mk-swatches" role="radiogroup" aria-label={t("groupLabel")}>
          {ATMOSPHERES.map((a) => (
            <button
              key={a}
              type="button"
              role="radio"
              aria-checked={atmosphere === a}
              className="mk-swatch"
              onClick={() => setAtmosphere(a)}
            >
              <span className="mk-swatch__ball" style={{ "--swatch": SWATCHES[a] } as React.CSSProperties} aria-hidden="true" />
              {scenes(a)}
            </button>
          ))}
        </div>
        <p className="mk-small" style={{ marginTop: 20 }}>{t("carryOver")}</p>
      </div>
    </section>
  );
}
