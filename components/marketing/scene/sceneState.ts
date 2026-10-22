import type { OrbDraw } from "./renderer";

// Shared, mutable scene state — a plain module singleton rather than React
// state, because it's read 60× a second by the render loop and written by
// animations (GSAP tweens in later milestones) that shouldn't re-render React.

export type TintKey = "a" | "b" | "c" | "warm";

export interface AmbientOrb {
  /** 0..1 of viewport width */
  x: number;
  /** world position in viewport heights; the field wraps vertically */
  y: number;
  /** radius in viewport heights */
  r: number;
  /** 0 = far (barely moves), 1 = near (moves most with scroll and pointer) */
  depth: number;
  tint: TintKey;
}

// The slow constellation behind the whole page: other people's messages,
// waiting. Sorted far → near so nearer glass is drawn over farther glass.
export const AMBIENT_ORBS: AmbientOrb[] = [
  { x: 0.47, y: 0.12, r: 0.026, depth: 0.12, tint: "c" },
  { x: 0.6, y: 2.45, r: 0.032, depth: 0.18, tint: "b" },
  { x: 0.045, y: 0.48, r: 0.05, depth: 0.25, tint: "a" },
  { x: 0.3, y: 1.38, r: 0.042, depth: 0.32, tint: "warm" },
  { x: 0.82, y: 1.78, r: 0.058, depth: 0.45, tint: "a" },
  { x: 0.93, y: 0.84, r: 0.072, depth: 0.55, tint: "b" },
  { x: 0.13, y: 2.08, r: 0.082, depth: 0.7, tint: "c" },
];

/** Height of the repeating orb field, in viewport heights. */
export const WORLD_HEIGHT = 2.8;

export const sceneState = {
  /**
   * Orbs drawn on top of the ambient field, already in p-space (viewport
   * heights, y from the top of the viewport) — e.g. the hero's sealed
   * message on its way into the depth (M3).
   */
  overlayOrbs: [] as OrbDraw[],
  /** Multiplier for the far lights (final CTA brightens them). */
  starBoost: 1,
};
