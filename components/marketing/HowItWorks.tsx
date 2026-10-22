import { getTranslations } from "next-intl/server";

type Step = { title: string; body: string };

// Each step carries a small slice of the app's UI. M1 renders them as static
// glass snippets mirroring the real composer; M5 turns them into live UI.
export async function HowItWorks() {
  const t = await getTranslations("Marketing.how");
  const steps = t.raw("steps") as Step[];
  const kinds = t.raw("ui.kinds") as string[];

  const snippets = [
    <div key="write" className="mk-ui" aria-hidden="true">
      <div className="mk-ui__row"><span>{t("ui.to")}</span><strong>{t("ui.recipient")}</strong></div>
      <p className="mk-ui__text" style={{ margin: 0 }}>{t("ui.draft")}</p>
      <div className="mk-ui__pills">
        {kinds.map((k, i) => <span key={k} className="mk-ui__pill" data-on={i === 0}>{k}</span>)}
      </div>
    </div>,
    <div key="when" className="mk-ui" aria-hidden="true">
      <div className="mk-ui__row"><span>{t("ui.when")}</span></div>
      <div className="mk-ui__pills"><span className="mk-ui__pill" data-on="true">{t("ui.whenValue")}</span></div>
    </div>,
    <div key="guardians" className="mk-ui" aria-hidden="true">
      <div className="mk-ui__row"><span>{t("ui.guardians")}</span></div>
      <div className="mk-ui__row" style={{ justifyContent: "flex-start", gap: 10 }}>
        <span className="mk-ui__avatar">{t("ui.guardianA").slice(0, 1)}</span><strong>{t("ui.guardianA")}</strong>
        <span className="mk-ui__avatar" style={{ marginLeft: 8 }}>{t("ui.guardianB").slice(0, 1)}</span><strong>{t("ui.guardianB")}</strong>
      </div>
    </div>,
    <div key="deliver" className="mk-ui" aria-hidden="true">
      <div className="mk-ui__row"><strong>{t("ui.mailSubject")}</strong></div>
      <div className="mk-ui__pills"><span className="mk-ui__pill" data-on="true">{t("ui.mailOpen")} →</span></div>
    </div>,
  ];

  return (
    <section id="how-it-works" className="mk-section" aria-labelledby="mk-how-title">
      <div className="mk-container">
        <p className="mk-kicker">{t("label")}</p>
        <h2 className="mk-h2" id="mk-how-title">{t("title")}</h2>
        <ol className="mk-steps">
          {steps.map((step, i) => (
            <li key={step.title} className="mk-step mk-glass">
              <span className="mk-step__n" aria-hidden="true" />
              <h3>{step.title}</h3>
              <p>{step.body}</p>
              {snippets[i]}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
