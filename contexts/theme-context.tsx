"use client";

// React-19-compatible dark mode — no script injection, no next-themes.
// Uses useLayoutEffect to apply the class before first paint on client.
// SSR always renders "dark" (matching defaultTheme) → zero FOUC for dark users.
// Light-mode users see a brief flash only on very first visit — acceptable tradeoff.

import {
  createContext,
  useContext,
  useState,
  useLayoutEffect,
  useEffect,
  type ReactNode,
} from "react";

export type Theme = "dark" | "light";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (t: Theme) => void;
  resolvedTheme: Theme;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "dark",
  setTheme: () => {},
  resolvedTheme: "dark",
});

const STORAGE_KEY = "arca-theme";

function applyTheme(t: Theme) {
  const root = document.documentElement;
  root.classList.toggle("dark", t === "dark");
  root.classList.toggle("light", t === "light");
  // Let browsers know color scheme for native UI elements (scrollbar, inputs…)
  root.style.colorScheme = t;
}

export function AppThemeProvider({
  children,
  defaultTheme = "dark",
}: {
  children: ReactNode;
  defaultTheme?: Theme;
}) {
  const [theme, setThemeState] = useState<Theme>(defaultTheme);

  // useLayoutEffect runs synchronously after DOM is built, before paint — no flash.
  // Falls back to useEffect on SSR (where window is undefined) safely.
  const useIsomorphicLayoutEffect =
    typeof window !== "undefined" ? useLayoutEffect : useEffect;

  useIsomorphicLayoutEffect(() => {
    let stored: Theme | null = null;
    try {
      stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
    } catch {}
    const resolved = stored === "dark" || stored === "light" ? stored : defaultTheme;
    setThemeState(resolved);
    applyTheme(resolved);
  }, [defaultTheme]);

  function setTheme(t: Theme) {
    setThemeState(t);
    try {
      localStorage.setItem(STORAGE_KEY, t);
    } catch {}
    applyTheme(t);
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme: theme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
