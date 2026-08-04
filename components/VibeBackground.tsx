"use client";

import { useVibe, GRADIENTS, PHOTOS } from "@/contexts/vibe-context";

// ─── Component ────────────────────────────────────────────────────────────────
// KEY FIX: renders the background as a fixed -z-20 div instead of mutating
// body.style. This means page containers no longer need to be transparent —
// any element WITHOUT a background will naturally show the fixed layer below.

export function VibeBackground() {
  const { vibe, customImageUrl } = useVibe();

  const isPhoto = vibe in PHOTOS || (vibe === "custom" && !!customImageUrl);
  const isGradient = vibe in GRADIENTS;

  // Build inline style for the background div
  const bgStyle: React.CSSProperties = {};
  if (vibe === "custom" && customImageUrl) {
    bgStyle.backgroundImage = `url(${customImageUrl})`;
    bgStyle.backgroundSize = "cover";
    bgStyle.backgroundPosition = "center";
    bgStyle.backgroundRepeat = "no-repeat";
  } else if (PHOTOS[vibe]) {
    bgStyle.backgroundImage = `url(${PHOTOS[vibe]})`;
    bgStyle.backgroundSize = "cover";
    bgStyle.backgroundPosition = "center";
    bgStyle.backgroundRepeat = "no-repeat";
  } else if (GRADIENTS[vibe]) {
    bgStyle.backgroundImage = GRADIENTS[vibe];
  }

  return (
    <>
      {/* ── The actual background layer (behind everything) ─────── */}
      {(isPhoto || isGradient) && (
        <div
          className="fixed inset-0 -z-20"
          style={bgStyle}
          aria-hidden="true"
        />
      )}

      {/* ── Dark scrim for photos (improves text readability) ────── */}
      {isPhoto && (
        <div
          className="fixed inset-0 -z-10 bg-black/55"
          aria-hidden="true"
        />
      )}

      {/* ── Ambient blobs for the default minimal vibe ───────────── */}
      {vibe === "nebula" && (
        <div
          className="fixed inset-0 overflow-hidden pointer-events-none -z-10 mix-blend-screen"
          aria-hidden="true"
        >
          <div className="absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full blur-[60px] opacity-40 bg-[var(--orb-magenta)]" />
          <div className="absolute -bottom-48 -right-24 w-[700px] h-[700px] rounded-full blur-[80px] opacity-30 bg-[var(--orb-turquoise)]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full blur-[70px] opacity-25 bg-[var(--orb-pink)]" />
        </div>
      )}
      {vibe === "sunset" && (
        <div
          className="fixed inset-0 overflow-hidden pointer-events-none -z-10 mix-blend-screen"
          aria-hidden="true"
        >
          <div className="absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full blur-[60px] opacity-40 bg-[var(--orb-orange)]" />
          <div className="absolute -bottom-48 -right-24 w-[700px] h-[700px] rounded-full blur-[80px] opacity-30 bg-[var(--orb-pink)]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full blur-[70px] opacity-25 bg-[var(--orb-magenta)]" />
        </div>
      )}
      {vibe === "deep-sea" && (
        <div
          className="fixed inset-0 overflow-hidden pointer-events-none -z-10 mix-blend-screen"
          aria-hidden="true"
        >
          <div className="absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full blur-[60px] opacity-40 bg-[var(--orb-turquoise)]" />
          <div className="absolute -bottom-48 -right-24 w-[700px] h-[700px] rounded-full blur-[80px] opacity-30 bg-[var(--orb-blue)]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full blur-[70px] opacity-25 bg-[var(--orb-pink)]" />
        </div>
      )}
    </>
  );
}
