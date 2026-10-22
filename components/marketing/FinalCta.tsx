import { getTranslations } from "next-intl/server";

// A deterministic field of small waiting lights (seeded, so server and any
// re-render agree). One of them burns brighter. M6 brings it to life.
function lights(count: number) {
  let seed = 20261021;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
  return Array.from({ length: count }, () => ({
    x: rand() * 1600,
    y: rand() * 900,
    r: 0.6 + rand() * 1.6,
    o: 0.15 + rand() * 0.6,
  }));
}

const LIGHTS = lights(320);

export async function FinalCta() {
  const t = await getTranslations("Marketing.finalCta");

  return (
    <section className="mk-final" aria-labelledby="mk-final-title">
      <svg className="mk-final__lights" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs>
          <radialGradient id="mk-final-one">
            <stop offset="0%" stopColor="#fff" />
            <stop offset="30%" stopColor="var(--mk-ink)" stopOpacity="0.8" />
            <stop offset="100%" stopColor="var(--mk-a)" stopOpacity="0" />
          </radialGradient>
        </defs>
        {LIGHTS.map((l, i) => (
          <circle key={i} cx={l.x.toFixed(1)} cy={l.y.toFixed(1)} r={l.r.toFixed(2)} fill="var(--mk-ink)" opacity={l.o.toFixed(2)} />
        ))}
        <circle cx="1130" cy="250" r="70" fill="url(#mk-final-one)" />
      </svg>
      <div className="mk-container">
        <h2 className="mk-h2" id="mk-final-title">{t("title")}</h2>
        <p className="mk-lead">{t("lead")}</p>
        <a href="/login?mode=signup" className="mk-btn mk-btn--primary">{t("cta")}</a>
      </div>
    </section>
  );
}
