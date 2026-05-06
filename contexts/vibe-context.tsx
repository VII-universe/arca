"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";

export type Vibe = "minimal" | "ocean" | "sunset" | "forest" | "custom";

const VALID_VIBES: Vibe[] = ["minimal", "ocean", "sunset", "forest", "custom"];

interface VibeContextValue {
  vibe: Vibe;
  setVibe: (v: Vibe) => void;
  customImageUrl: string;
  setCustomImageUrl: (url: string) => void;
}

const VibeContext = createContext<VibeContextValue>({
  vibe: "minimal",
  setVibe: () => {},
  customImageUrl: "",
  setCustomImageUrl: () => {},
});

export function VibeProvider({ children }: { children: ReactNode }) {
  const [vibe, setVibeState] = useState<Vibe>("minimal");
  const [customImageUrl, setCustomImageUrlState] = useState("");

  useEffect(() => {
    const storedVibe = localStorage.getItem("arca-vibe") as Vibe | null;
    if (storedVibe && VALID_VIBES.includes(storedVibe)) setVibeState(storedVibe);

    const storedUrl = localStorage.getItem("arca-custom-image") ?? "";
    setCustomImageUrlState(storedUrl);
  }, []);

  const setVibe = (v: Vibe) => {
    setVibeState(v);
    localStorage.setItem("arca-vibe", v);
  };

  const setCustomImageUrl = (url: string) => {
    setCustomImageUrlState(url);
    localStorage.setItem("arca-custom-image", url);
    // Automatically switch to "custom" vibe when a URL is pasted
    if (url) {
      setVibeState("custom");
      localStorage.setItem("arca-vibe", "custom");
    }
  };

  return (
    <VibeContext.Provider value={{ vibe, setVibe, customImageUrl, setCustomImageUrl }}>
      {children}
    </VibeContext.Provider>
  );
}

export const useVibe = () => useContext(VibeContext);
