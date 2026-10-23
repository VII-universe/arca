import type { WaypointId } from "../sky/journey";
import { getCopy } from "./copy";
import { Waypoint } from "./Waypoint";

type Stop = { year: string; to: string; occasion: string; quote: string };

// The journey to the stars: each sample message is a stop at a real star
// (year − 2026) light years away. Screen readers get a plain ordered list of
// messages with their years; the camera does the rest.

/** The year the sample messages were "written" — where the light sets off. */
const WRITTEN_IN = 2026;
const STOPS: WaypointId[] = ["barnard", "gliese251", "vega", "titawin"];

export async function Timeline() {
  const { t, raw } = await getCopy("Marketing.timeline");
  const stops = raw<Stop[]>("stops");
  const stars = raw<string[]>("stars");

  return (
    <section className="l-timeline" aria-labelledby="l-timeline-title">
      <Waypoint waypoint="liftoff" as="div" className="l-intro">
        <div className="l-wrap">
          <div className="l-col l-shade">
            <p className="l-kicker">{t("label")}</p>
            <h2 className="l-h2" id="l-timeline-title">{t("title")}</h2>
          </div>
        </div>
      </Waypoint>

      <ol className="l-stops">
        {stops.map((stop, i) => (
          <Waypoint key={stop.year} waypoint={STOPS[i]} as="li" className="l-stop" data-last={i === stops.length - 1}>
            <div className="l-wrap l-stop__frame">
              <div className="l-stop__text">
                <p className="l-meta l-shade">
                  <span className="l-meta__year">{stop.year}</span>
                  <span aria-hidden="true"> · </span>
                  {t("distance", { ly: Number(stop.year) - WRITTEN_IN })}
                  <span aria-hidden="true"> · </span>
                  {stars[i]}
                </p>
                <article className="l-card l-sample">
                  <p className="l-sample__meta">
                    <span className="l-badge">{t("sample")}</span>
                    <span>{stop.to} · {stop.occasion}</span>
                  </p>
                  <blockquote className="l-quote"><q>{stop.quote}</q></blockquote>
                  <p className="l-small">{t("writtenIn", { year: WRITTEN_IN })}</p>
                </article>
                {/* Only the first stop explains; after that, just the data. */}
                {i === 0 && <p className="l-note l-shade">{t("lightNote", { year: stop.year })}</p>}
                {i === stops.length - 1 && <p className="l-finale l-shade">{t("finale")}</p>}
              </div>
            </div>
          </Waypoint>
        ))}
      </ol>
    </section>
  );
}
