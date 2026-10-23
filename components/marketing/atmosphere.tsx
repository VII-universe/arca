"use client";

import { useSyncExternalStore } from "react";
import type { Vibe } from "@/contexts/vibe-context";

// The atmospheres the landing's sky can render — the subset of the app's
// background picker (components/layout/AppearanceButton) that is light, not
// a photo. The choice is the app's own `vibe`, stored under the same
// localStorage key the app's VibeProvider reads, so picking one here also
// changes the app in this browser, and a returning user sees the landing in
// the atmosphere they already use. (The landing has its own root layout
// without the app's providers, so it talks to the storage directly.)
export const ATMOSPHERES = ["nebula", "sunset", "ocean", "midnight", "stars"] as const satisfies readonly Vibe[];
export type Atmosphere = (typeof ATMOSPHERES)[number];

const STORAGE_KEY = "arca-vibe";

export function toAtmosphere(vibe: string | null | undefined): Atmosphere {
  return (ATMOSPHERES as readonly string[]).includes(vibe ?? "") ? (vibe as Atmosphere) : "nebula";
}

const listeners = new Set<() => void>();
// Kept in memory too: storage can throw (private mode, blocked site data),
// and the page should still change.
let memory: Atmosphere | null = null;

function read(): Atmosphere {
  if (memory) return memory;
  try {
    return toAtmosphere(localStorage.getItem(STORAGE_KEY));
  } catch {
    return "nebula";
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key !== STORAGE_KEY) return;
    memory = null;
    listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function write(a: Atmosphere) {
  memory = a;
  try {
    localStorage.setItem(STORAGE_KEY, a);
  } catch {
    // Remembered for this page only.
  }
  listeners.forEach((l) => l());
}

export function useAtmosphere(): [Atmosphere, (a: Atmosphere) => void] {
  const atmosphere = useSyncExternalStore(subscribe, read, () => "nebula" as const);
  return [atmosphere, write];
}
