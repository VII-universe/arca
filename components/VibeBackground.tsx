"use client";

import { useEffect } from "react";
import { useVibe } from "@/contexts/vibe-context";

const FOREST_URL =
  "https://images.unsplash.com/photo-1448375240586-882707db888b?w=1920&q=80&auto=format&fit=crop";

const GRADIENTS: Record<string, string> = {
  ocean:
    "linear-gradient(135deg, #0f172a 0%, #0c4a6e 40%, #0f2744 70%, #0a0f1e 100%)",
  sunset:
    "linear-gradient(135deg, #0f0a1e 0%, #7c1d3b 35%, #9a3412 65%, #1a0a00 100%)",
};

export function VibeBackground() {
  const { vibe, customImageUrl } = useVibe();

  useEffect(() => {
    const body = document.body;
    const reset = () => {
      body.style.backgroundImage = "";
      body.style.backgroundSize = "";
      body.style.backgroundPosition = "";
      body.style.backgroundAttachment = "";
      body.style.backgroundRepeat = "";
    };

    reset();

    if (vibe === "custom" && customImageUrl) {
      body.style.backgroundImage = `url(${customImageUrl})`;
      body.style.backgroundSize = "cover";
      body.style.backgroundPosition = "center";
      body.style.backgroundAttachment = "fixed";
      body.style.backgroundRepeat = "no-repeat";
    } else if (vibe === "ocean" || vibe === "sunset") {
      body.style.backgroundImage = GRADIENTS[vibe];
    } else if (vibe === "forest") {
      body.style.backgroundImage = `url(${FOREST_URL})`;
      body.style.backgroundSize = "cover";
      body.style.backgroundPosition = "center";
      body.style.backgroundAttachment = "fixed";
      body.style.backgroundRepeat = "no-repeat";
    }

    return reset;
  }, [vibe, customImageUrl]);

  const isImageBackground =
    vibe === "forest" || (vibe === "custom" && !!customImageUrl);

  return (
    <>
      {/* Minimal: subtle ambient blobs */}
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

      {/* Image backgrounds: strong dark overlay so text on un-papered surfaces stays readable */}
      {isImageBackground && (
        <div
          className="fixed inset-0 pointer-events-none -z-10 bg-black/60"
          aria-hidden="true"
        />
      )}
    </>
  );
}
