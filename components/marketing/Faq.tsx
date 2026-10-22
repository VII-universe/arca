import { getTranslations } from "next-intl/server";

type QA = { q: string; a: string };

// Native <details> accordion — keyboard and screen-reader support for free,
// works without JS. Only questions whose answers are verified in code are
// listed; the rest wait for the owner's answers.
export async function Faq() {
  const t = await getTranslations("Marketing.faq");
  const items = t.raw("items") as QA[];

  return (
    <section className="mk-section" aria-labelledby="mk-faq-title">
      <div className="mk-container">
        <p className="mk-kicker">{t("label")}</p>
        <h2 className="mk-h2" id="mk-faq-title">{t("title")}</h2>
        <div className="mk-faq">
          {items.map((item) => (
            <details key={item.q}>
              <summary>{item.q}</summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
