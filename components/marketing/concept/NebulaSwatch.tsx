"use client";

import { ConceptSky, type ConceptAtmosphere } from "./ConceptSky";

// One live tile per atmosphere on the concept board.
export function NebulaSwatch({ atmosphere, label, note }: { atmosphere: ConceptAtmosphere; label: string; note: string }) {
  return (
    <figure className="cx-swatch">
      <ConceptSky mode="deep" atmosphere={atmosphere} look={[18.4, -24]} />
      <figcaption className="cx-mono" style={{ marginTop: 8 }}>
        <span style={{ color: "var(--cx-star)" }}>{label}</span> · {note}
      </figcaption>
    </figure>
  );
}
