import { getTranslations } from "next-intl/server";
import { JOURNEY } from "./journey";
import { SkyStage } from "./SkyStage";
import "./sky.css";

// M1: the scene only. Each section is an empty stretch of scroll that flies
// the camera to its waypoint; M2 sets the existing content into them.
export async function SkyJourney() {
  const t = await getTranslations("Marketing.hero");
  return (
    <div className="sky-page">
      <SkyStage />
      <main id="main" className="sky-track">
        <h1 className="sky-sr">{t.rich("title", { em: (chunks) => chunks })}</h1>
        {JOURNEY.map((s) => (
          <section
            key={s.id}
            data-waypoint={s.id}
            aria-hidden="true"
            style={{ "--vh": s.vh, "--vh-phone": s.vhPhone } as React.CSSProperties}
          />
        ))}
      </main>
    </div>
  );
}
