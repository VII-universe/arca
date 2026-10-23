import { ConceptScene, type Atmosphere, type Shot } from "@/components/marketing/concept/scene/ConceptScene";

// Full-viewport render target for stills and the flight video (no UI).
const SHOTS: Shot[] = ["meadow", "flight", "vega", "titawin", "deep"];
const ATMOSPHERES: Atmosphere[] = ["nebula", "sunset", "ocean", "midnight", "stars"];

export default async function ScenePage({ searchParams }: { searchParams: Promise<{ shot?: string; atm?: string; capture?: string }> }) {
  const { shot, atm, capture } = await searchParams;
  return (
    <ConceptScene
      className="cx-fullscene"
      shot={SHOTS.find((s) => s === shot) ?? "meadow"}
      atmosphere={ATMOSPHERES.find((a) => a === atm) ?? "nebula"}
      capture={capture === "1"}
    />
  );
}
