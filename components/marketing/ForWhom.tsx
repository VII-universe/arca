import { getTranslations } from "next-intl/server";

type Card = { key: string; title: string; example: string };

const CARD_COLORS: Record<string, string> = {
  children: "var(--orb-orange)",
  partner: "var(--orb-pink)",
  self: "var(--orb-turquoise)",
  family: "var(--orb-blue)",
  gone: "color-mix(in oklab, var(--orb-magenta) 55%, #c9b8ff)",
};

export async function ForWhom() {
  const t = await getTranslations("Marketing.forWhom");
  const cards = t.raw("cards") as Card[];

  return (
    <section id="for-whom" className="mk-section" aria-labelledby="mk-for-whom-title">
      <div className="mk-container">
        <p className="mk-kicker">{t("label")}</p>
        <h2 className="mk-h2" id="mk-for-whom-title">{t("title")}</h2>
        <p className="mk-lead">{t("lead")}</p>
      </div>
      <ul className="mk-rail" aria-label={t("title")} tabIndex={0}>
        {cards.map((card) => (
          <li key={card.key} className="mk-card mk-glass" style={{ "--card-color": CARD_COLORS[card.key] } as React.CSSProperties}>
            <span className="mk-card__dot" aria-hidden="true" />
            <div>
              <h3>{card.title}</h3>
              <p style={{ marginTop: 14 }}>{card.example}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
