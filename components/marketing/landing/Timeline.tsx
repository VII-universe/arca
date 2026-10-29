import { STOP_SIDE, STOP_YEARS, WRITTEN_IN, type WaypointId } from "../cosmos/journey";
import { getCopy } from "./copy";
import { Waypoint } from "./Waypoint";

type Stop = { year: string; to: string; occasion: string; quote: string };

// The orbits: each sample message is a stop at a planet on the way out,
// year − 2026 orbits of the Sun away. The year is the headline; the message,
// in the warm light of what a person wrote, sits under it; the planet fills
// the other half of the screen (sides alternate). Screen readers get a plain
// ordered list.

const STOPS = Object.keys(STOP_YEARS) as (keyof typeof STOP_YEARS)[];

export async function Timeline() {
  const { t, raw } = await getCopy("Marketing.timeline");
  const stops = raw<Stop[]>("stops");

  return (
    <section className="l-timeline" aria-labelledby="l-timeline-title">
      <Waypoint waypoint="liftoff" as="div" className="l-intro">
        <div className="l-wrap">
          <div className="l-intro__text l-shade">
            <p className="l-kicker">{t("label")}</p>
            <h2 className="l-h2 l-h2--intro" id="l-timeline-title">{t("title")}</h2>
            <p className="l-lead">{t("orbitsNote")}</p>
          </div>
        </div>
      </Waypoint>

      <ol className="l-stops">
        {stops.map((stop, i) => {
          const id = STOPS[i] as WaypointId;
          const orbits = Number(stop.year) - WRITTEN_IN;
          return (
            <Waypoint key={stop.year} waypoint={id} as="li" className="l-stop" data-last={i === stops.length - 1} data-side={STOP_SIDE[STOPS[i]]}>
              {/* The pin: a container from 50 svh before the stop to 50 svh into the flight after it, holding a
                  100 svh sticky frame — so the words stand still exactly while the camera stands at the planet. */}
              <div className="l-stop__pin">
              <div className="l-wrap l-stop__frame">
                <div className="l-stop__text">
                  <p className="l-stop__year l-shade" aria-hidden="true">{stop.year}</p>
                  <p className="l-sr">{stop.year}</p>
                  <p className="l-stop__orbits l-shade">
                    <span className="l-badge">{t("sample")}</span>
                    <span>{stop.to} · {stop.occasion}</span>
                  </p>
                  {/* The marks are part of the text (not q::before/::after), so a quote split into lines keeps one pair. */}
                  <blockquote className="l-stop__quote l-shade"><span className="l-stop__mark" aria-hidden="true">“</span>{stop.quote}<span className="l-stop__mark" aria-hidden="true">”</span></blockquote>
                  <p className="l-stop__meta l-shade">
                    <span>{t("writtenIn", { year: WRITTEN_IN })}</span>
                    <span aria-hidden="true"> · </span>
                    <span className="l-stop__count">{stop.year} · {t("orbits", { count: orbits })}</span>
                  </p>
                </div>
              </div>
              </div>
            </Waypoint>
          );
        })}
      </ol>
    </section>
  );
}
