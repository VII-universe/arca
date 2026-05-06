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
      {vibe === "minimal" && (
        <div
          className="fixed inset-0 overflow-hidden pointer-events-none -z-10"
          aria-hidden="true"
        >
          <div className="ambient-blob-1 absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full bg-indigo-700/[0.12] blur-[130px]" />
          <div className="ambient-blob-2 absolute -bottom-48 -right-24 w-[700px] h-[700px] rounded-full bg-violet-800/[0.10] blur-[160px]" />
          <div className="ambient-blob-3 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-blue-900/[0.08] blur-[140px]" />
        </div>
      )}
    </>
  );
}
