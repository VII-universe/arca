"use client";

import { useVibe, type Vibe } from "@/contexts/vibe-context";

// The atmospheres the marketing scene can render — the subset of the app's
// background picker (components/layout/AppearanceButton) that is light, not
// a photo. The choice is the app's own `vibe` (VibeProvider, persisted in
// localStorage), so picking one here also changes the app in this browser,
// and a returning user sees the landing in the atmosphere they already use.
export const ATMOSPHERES = ["nebula", "sunset", "ocean", "midnight", "stars"] as const satisfies readonly Vibe[];
export type Atmosphere = (typeof ATMOSPHERES)[number];

export function toAtmosphere(vibe: Vibe): Atmosphere {
  return (ATMOSPHERES as readonly Vibe[]).includes(vibe) ? (vibe as Atmosphere) : "nebula";
}

export function useAtmosphere(): [Atmosphere, (a: Atmosphere) => void] {
  const { vibe, setVibe } = useVibe();
  const set = (a: Atmosphere) => {
    try {
      setVibe(a);
    } catch {
      // localStorage can throw (private mode, blocked storage) — the state
      // update inside setVibe has already happened, so the page still changes.
    }
  };
  return [toAtmosphere(vibe), set];
}

export function MarketingShell({ children }: { children: React.ReactNode }) {
  const [atmosphere] = useAtmosphere();
  return (
    <div className="mk" data-atmosphere={atmosphere}>
      <div className="mk-sky" aria-hidden="true" />
      <div className="mk-grain" aria-hidden="true" />
      {children}
    </div>
  );
}
