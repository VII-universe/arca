"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";

export type Vibe = "minimal" | "ocean" | "sunset" | "forest";

const VALID_VIBES: Vibe[] = ["minimal", "ocean", "sunset", "forest"];

interface VibeContextValue {
  vibe: Vibe;
  setVibe: (v: Vibe) => void;
}

const VibeContext = createContext<VibeContextValue>({
  vibe: "minimal",
  setVibe: () => {},
});

export function VibeProvider({ children }: { children: ReactNode }) {
  const [vibe, setVibeState] = useState<Vibe>("minimal");

  useEffect(() => {
    const stored = localStorage.getItem("arca-vibe") as Vibe | null;
    if (stored && VALID_VIBES.includes(stored)) setVibeState(stored);
  }, []);

  const setVibe = (v: Vibe) => {
    setVibeState(v);
    localStorage.setItem("arca-vibe", v);
  };

  return (
    <VibeContext.Provider value={{ vibe, setVibe }}>
      {children}
    </VibeContext.Provider>
  );
}

export const useVibe = () => useContext(VibeContext);
