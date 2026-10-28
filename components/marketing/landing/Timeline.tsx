import { STOP_YEARS, WRITTEN_IN, type WaypointId } from "../cosmos/journey";
import { getCopy } from "./copy";
import { Waypoint } from "./Waypoint";

type Stop = { year: string; to: string; occasion: string; quote: string };

// The orbits: each sample message is a stop on the Earth's orbit, year −
// 2026 orbits of the Sun away. The year is the headline; the message, in
// the warm light of what a person wrote, sits under it; the orbits ring the
// Sun behind. Screen readers get a plain ordered list.

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
            <Waypoint key={stop.year} waypoint={id} as="li" className="l-stop" data-last={i === stops.length - 1}>
              <div className="l-wrap l-stop__frame">
                <div className="l-stop__text">
                  <p className="l-stop__year l-shade" aria-hidden="true">{stop.year}</p>
                  <p className="l-sr">{stop.year}</p>
                  <p className="l-stop__orbits l-shade">
                    <span className="l-badge">{t("sample")}</span>
                    <span>{stop.to} · {stop.occasion}</span>
                  </p>
                  <blockquote className="l-stop__quote l-shade"><q>{stop.quote}</q></blockquote>
                  <p className="l-stop__meta l-shade">
                    <span>{t("writtenIn", { year: WRITTEN_IN })}</span>
                    <span aria-hidden="true"> · </span>
                    <span className="l-stop__count">{stop.year} · {t("orbits", { count: orbits })}</span>
                  </p>
                </div>
              </div>
            </Waypoint>
          );
        })}
      </ol>
    </section>
  );
}
