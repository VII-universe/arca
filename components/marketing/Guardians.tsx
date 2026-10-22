import { getTranslations } from "next-intl/server";

// Your light in the middle, linked by fine threads to three guardians.
const GUARDIAN_POINTS = [
  { x: 260, y: 78, color: "var(--orb-turquoise)" },
  { x: 438, y: 372, color: "var(--orb-pink)" },
  { x: 82, y: 372, color: "var(--orb-orange)" },
];
const CENTER = { x: 260, y: 270 };

function GuardiansDiagram({ you, label }: { you: string; label: string }) {
  return (
    <svg className="mk-guardians__diagram" viewBox="0 0 520 470" role="img" aria-label={label}>
      <defs>
        <radialGradient id="mk-g-you" cx="40%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.95" />
          <stop offset="35%" stopColor="var(--mk-ink)" stopOpacity="0.55" />
          <stop offset="100%" stopColor="var(--mk-a)" stopOpacity="0.9" />
        </radialGradient>
        {GUARDIAN_POINTS.map((g, i) => (
          <radialGradient key={i} id={`mk-g-${i}`} cx="40%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#fff" stopOpacity="0.9" />
            <stop offset="100%" stopColor={g.color} stopOpacity="0.85" />
          </radialGradient>
        ))}
        <filter id="mk-g-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="14" />
        </filter>
      </defs>
      {GUARDIAN_POINTS.map((g, i) => {
        const cx = (CENTER.x + g.x) / 2 + (i === 0 ? 30 : i === 1 ? -10 : 10);
        const cy = (CENTER.y + g.y) / 2 + (i === 0 ? 0 : 24);
        return (
          <path
            key={i}
            d={`M${CENTER.x} ${CENTER.y} Q${cx} ${cy} ${g.x} ${g.y}`}
            fill="none"
            stroke="var(--mk-ink)"
            strokeOpacity="0.35"
            strokeWidth="1"
            strokeDasharray="2 6"
          />
        );
      })}
      <circle cx={CENTER.x} cy={CENTER.y} r="70" fill="var(--mk-a)" opacity="0.55" filter="url(#mk-g-glow)" />
      <circle cx={CENTER.x} cy={CENTER.y} r="46" fill="url(#mk-g-you)" />
      <text x={CENTER.x} y={CENTER.y + 82} textAnchor="middle" fill="var(--mk-ink)" fontSize="15" fontFamily="var(--f-sans)">
        {you}
      </text>
      {GUARDIAN_POINTS.map((g, i) => (
        <g key={i}>
          <circle cx={g.x} cy={g.y} r="42" fill={g.color} opacity="0.4" filter="url(#mk-g-glow)" />
          <circle cx={g.x} cy={g.y} r="24" fill={`url(#mk-g-${i})`} />
        </g>
      ))}
    </svg>
  );
}

export async function Guardians() {
  const t = await getTranslations("Marketing.guardians");
  const steps = t.raw("steps") as string[];

  return (
    <section className="mk-section" aria-labelledby="mk-guardians-title">
      <div className="mk-container mk-guardians">
        <div>
          <p className="mk-kicker">{t("label")}</p>
          <h2 className="mk-h2" id="mk-guardians-title">{t("title")}</h2>
          <p className="mk-lead">{t("lead")}</p>
          <ol className="mk-guardians__list">
            {steps.map((s) => <li key={s}>{s}</li>)}
          </ol>
          <p className="mk-note">{t("noGuardians")} {t("privacy")}</p>
        </div>
        <GuardiansDiagram you={t("you")} label={t("diagram")} />
      </div>
    </section>
  );
}
