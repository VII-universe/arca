import { getTranslations } from "next-intl/server";

type Stop = { year: string; to: string; occasion: string; quote: string };

// Light at each stop moves from warm morning, through day and evening,
// into deep night — the finale then brings back the dawn.
const STOP_COLORS = [
  "var(--orb-orange)",
  "var(--orb-turquoise)",
  "var(--orb-pink)",
  "var(--orb-blue)",
];

// The year the illustrative messages were "written" — the start of the line.
const WRITTEN_IN = 2026;

// Static, vertical version of the life timeline. It's what reduced-motion
// visitors and no-JS get; the scroll-driven scene (M4) builds on this markup.
export async function LifeTimeline() {
  const t = await getTranslations("Marketing.timeline");
  const stops = t.raw("stops") as Stop[];

  return (
    <section className="mk-section" aria-labelledby="mk-timeline-title">
      <div className="mk-container">
        <p className="mk-kicker">{t("label")}</p>
        <h2 className="mk-h2" id="mk-timeline-title">{t("title")}</h2>

        <ol className="mk-timeline">
          {stops.map((stop, i) => (
            <li key={stop.year} className="mk-stop" style={{ "--stop-color": STOP_COLORS[i] } as React.CSSProperties}>
              <p className="mk-stop__year mk-num" aria-hidden="true">{stop.year}</p>
              <article className="mk-stop__card mk-glass">
                <p className="mk-stop__meta">
                  <span className="mk-badge">{t("sample")}</span>
                  <span>
                    <span className="mk-sr">{stop.year}: </span>
                    {stop.to} · {stop.occasion}
                  </span>
                </p>
                <blockquote><q>{stop.quote}</q></blockquote>
                <p className="mk-stop__written mk-small">{t("writtenIn", { year: WRITTEN_IN })}</p>
              </article>
            </li>
          ))}
        </ol>

        <p className="mk-finale">{t("finale")}</p>
      </div>
    </section>
  );
}
