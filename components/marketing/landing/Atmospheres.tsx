"use client";

import { ATMOSPHERES, useAtmosphere, type Atmosphere } from "../atmosphere";
import { Waypoint } from "./Waypoint";

// Atmospheres are regions of space now, not colours: the sky crossfades to
// the chosen nebulae. The dot is the nebula's own tint (no text colour ever
// changes). The choice carries over to the app in this browser.
const TINT: Record<Atmosphere, string> = {
  nebula: "rgb(82 110 196)",
  sunset: "rgb(196 128 70)",
  ocean: "rgb(52 150 156)",
  midnight: "rgb(70 80 150)",
  stars: "rgb(220 230 255)",
};

export type AtmospheresCopy = Record<"label" | "title" | "lead" | "groupLabel" | "carryOver", string>;

export function Atmospheres({ copy, scenes }: { copy: AtmospheresCopy; scenes: Record<Atmosphere, string> }) {
  const [atmosphere, setAtmosphere] = useAtmosphere();

  return (
    <Waypoint waypoint="atmospheres" className="l-section" aria-labelledby="l-world-title">
      <div className="l-wrap">
        <div className="l-col l-shade">
          <p className="l-kicker">{copy.label}</p>
          <h2 className="l-h2" id="l-world-title">{copy.title}</h2>
          <p className="l-lead">{copy.lead}</p>
          <div className="l-atmos" role="radiogroup" aria-label={copy.groupLabel}>
            {ATMOSPHERES.map((a) => (
              <button
                key={a}
                type="button"
                role="radio"
                aria-checked={atmosphere === a}
                className="l-atmos__option"
                onClick={() => setAtmosphere(a)}
              >
                <span className="l-atmos__dot" style={{ background: TINT[a] }} aria-hidden="true" />
                {scenes[a]}
              </button>
            ))}
          </div>
          <p className="l-small">{copy.carryOver}</p>
        </div>
      </div>
    </Waypoint>
  );
}
