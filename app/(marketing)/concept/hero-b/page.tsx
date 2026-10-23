import { ConceptHero, type DisplayFont } from "@/components/marketing/concept/ConceptHero";
import type { ConceptAtmosphere } from "@/components/marketing/concept/ConceptSky";
import { heroCopy } from "@/components/marketing/concept/heroCopy";

const FONTS: DisplayFont[] = ["newsreader", "instrument", "bodoni"];
const ATMOSPHERES: ConceptAtmosphere[] = ["nebula", "sunset", "ocean", "midnight", "stars"];

export default async function HeroBPage({ searchParams }: { searchParams: Promise<{ font?: string; atm?: string }> }) {
  const { font, atm } = await searchParams;
  return (
    <ConceptHero
      variant="b"
      font={FONTS.find((f) => f === font) ?? "newsreader"}
      atmosphere={ATMOSPHERES.find((a) => a === atm) ?? "nebula"}
      copy={await heroCopy()}
    />
  );
}
