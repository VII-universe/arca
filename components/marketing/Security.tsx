import { getTranslations } from "next-intl/server";

type Point = { title: string; body: string };
type QA = { q: string; a: string };

// Deliberately the quietest section — no motion, no glow, just facts.
// Every statement here was checked against the code (see the M0 audit).
export async function Security() {
  const t = await getTranslations("Marketing.security");
  const points = t.raw("points") as Point[];
  const whatIf = t.raw("whatIf") as QA[];

  return (
    <section id="security" className="mk-section mk-security" aria-labelledby="mk-security-title">
      <div className="mk-container">
        <p className="mk-kicker">{t("label")}</p>
        <h2 className="mk-h2" id="mk-security-title">{t("title")}</h2>
        <p className="mk-lead">{t("lead")}</p>

        <ul className="mk-points">
          {points.map((p) => (
            <li key={p.title}>
              <h3>{p.title}</h3>
              <p>{p.body}</p>
            </li>
          ))}
        </ul>

        <div className="mk-whatif">
          <h3>{t("whatIfTitle")}</h3>
          <dl>
            {whatIf.map((item) => (
              <div key={item.q}>
                <dt>{item.q}</dt>
                <dd>{item.a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
