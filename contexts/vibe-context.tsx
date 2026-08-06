"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";

export type Vibe =
  | "nebula"
  | "sunset"
  | "deep-sea"
  | "ocean"
  | "midnight"
  | "ember"
  | "aurora"
  | "forest"
  | "mountains"
  | "stars"
  | "sakura"
  | "custom";

const VALID_VIBES: Vibe[] = [
  "nebula","sunset","deep-sea","ocean","midnight","ember","aurora",
  "forest","mountains","stars","sakura","custom",
];

interface VibeContextValue {
  glassOpacity: number;
  setGlassOpacity: (o: number) => void;
  vibe: Vibe;
  setVibe: (v: Vibe) => void;
  customImageUrl: string;
  setCustomImageUrl: (url: string) => void;
}

const VibeContext = createContext<VibeContextValue>({
  glassOpacity: 0.08,
  setGlassOpacity: () => {},
  vibe: "nebula",
  setVibe: () => {},
  customImageUrl: "",
  setCustomImageUrl: () => {},
});

export function VibeProvider({ children }: { children: ReactNode }) {
  const [glassOpacity, setGlassOpacityState] = useState(0.08);
  const [vibe, setVibeState] = useState<Vibe>("nebula");
  const [customImageUrl, setCustomImageUrlState] = useState("");

  useEffect(() => {
    const storedOpacity = localStorage.getItem("arca-glass-opacity");
    if (storedOpacity) {
      const parsed = parseFloat(storedOpacity);
      if (!isNaN(parsed)) setGlassOpacityState(parsed);
    }
    const storedVibe = localStorage.getItem("arca-vibe") as Vibe | null;
    if (storedVibe && VALID_VIBES.includes(storedVibe)) setVibeState(storedVibe);
    setCustomImageUrlState(localStorage.getItem("arca-custom-image") ?? "");
  }, []);

  const setGlassOpacity = (o: number) => {
    setGlassOpacityState(o);
    localStorage.setItem("arca-glass-opacity", o.toString());
  };

  const setVibe = (v: Vibe) => {
    setVibeState(v);
    localStorage.setItem("arca-vibe", v);
  };

  const setCustomImageUrl = (url: string) => {
    setCustomImageUrlState(url);
    localStorage.setItem("arca-custom-image", url);
    if (url) {
      setVibeState("custom");
      localStorage.setItem("arca-vibe", "custom");
    }
  };

  useEffect(() => {
    document.documentElement.style.setProperty('--glass-opacity', glassOpacity.toString());
  }, [glassOpacity]);

  return (
    <VibeContext.Provider value={{ glassOpacity, setGlassOpacity, vibe, setVibe, customImageUrl, setCustomImageUrl }}>
      {children}
    </VibeContext.Provider>
  );
}

export const useVibe = () => useContext(VibeContext);

// ─── Scene data (exported for ThemeSwitcher previews) ─────────────────────────

export const GRADIENTS: Partial<Record<Vibe, string>> = {
  ocean:
    "linear-gradient(135deg,#0f172a 0%,#0c4a6e 40%,#0f2744 70%,#0a0f1e 100%)",
  sunset:
    "linear-gradient(135deg,#0f0a1e 0%,#7c1d3b 35%,#9a3412 65%,#1a0a00 100%)",
  midnight:
    "linear-gradient(135deg,#050010 0%,#1a0540 35%,#0d002a 60%,#050010 100%)",
  ember:
    "linear-gradient(135deg,#0a0000 0%,#6b1800 40%,#3d0d0d 70%,#0a0000 100%)",
  aurora:
    "linear-gradient(135deg,#011a1a 0%,#042d2d 25%,#0a4a3a 50%,#1a2a10 75%,#011a1a 100%)",
};

export const PHOTOS: Partial<Record<Vibe, string>> = {
  forest:
    "https://images.unsplash.com/photo-1448375240586-882707db888b?w=1920&q=80&auto=format&fit=crop",
  mountains:
    "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=80&auto=format&fit=crop",
  stars:
    "https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=1920&q=80&auto=format&fit=crop",
  sakura:
    "https://images.unsplash.com/photo-1522383225653-ed111181a951?w=1920&q=80&auto=format&fit=crop",
};
