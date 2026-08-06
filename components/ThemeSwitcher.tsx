"use client";

import { useRef } from "react";
import { Sun, Moon, Palette, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "@/contexts/theme-context";
import { useVibe, type Vibe, GRADIENTS, PHOTOS } from "@/contexts/vibe-context";
import { cn } from "@/lib/utils";

// ─── Scene catalogue ──────────────────────────────────────────────────────────

const SCENES: {
  id: Vibe;
  label: string;
  type: "gradient" | "photo" | "nebula";
}[] = [
  { id: "nebula",    label: "Nebula",    type: "nebula" },
  { id: "midnight",  label: "Midnight",  type: "gradient" },
  { id: "ocean",     label: "Ocean",     type: "gradient" },
  { id: "sunset",    label: "Sunset",    type: "gradient" },
  { id: "ember",     label: "Ember",     type: "gradient" },
  { id: "aurora",    label: "Aurora",    type: "gradient" },
  { id: "forest",    label: "Forest",    type: "photo" },
  { id: "mountains", label: "Mountains", type: "photo" },
  { id: "stars",     label: "Stars",     type: "photo" },
  { id: "sakura",    label: "Sakura",    type: "photo" },
];

// Minimal preview — dark dot grid
const MINIMAL_PREVIEW =
  "radial-gradient(circle,#3f3f46 1px,transparent 1px) 0 0/16px 16px,#09090b";

function getPreviewStyle(scene: (typeof SCENES)[0]): React.CSSProperties {
  if (scene.type === "nebula") {
    return { background: MINIMAL_PREVIEW };
  }
  if (scene.type === "gradient" && GRADIENTS[scene.id]) {
    return { backgroundImage: GRADIENTS[scene.id] };
  }
  if (scene.type === "photo" && PHOTOS[scene.id]) {
    return {
      backgroundImage: `url(${PHOTOS[scene.id]})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
    };
  }
  return { background: "#09090b" };
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const { vibe, setVibe, customImageUrl, setCustomImageUrl } = useVibe();
  const urlInputRef = useRef<HTMLInputElement>(null);

  function handleUrlCommit() {
    const val = urlInputRef.current?.value.trim() ?? "";
    setCustomImageUrl(val);
    if (!val) setVibe("nebula");
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="xs"
          className="rounded-full text-muted-foreground hover:text-foreground gap-1.5"
          aria-label="Appearance settings"
        >
          <Palette className="size-3.5" />
          <span className="hidden sm:inline text-xs">Appearance</span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className={cn(
          "z-[100] w-[260px] p-3 space-y-3",
          // Solid, opaque — never transparent even over image vibes
          "bg-popover border border-border shadow-2xl",
        )}
      >
        {/* ── Light / Dark ──────────────────────────────────────── */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
            Color scheme
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            {(["light", "dark"] as const).map((t) => {
              const Icon = t === "light" ? Sun : Moon;
              const active = theme === t;
              return (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  className={cn(
                    "flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-xs font-medium transition-all",
                    active
                      ? "bg-foreground text-background shadow-sm"
                      : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80 border border-border/50"
                  )}
                >
                  <Icon className="size-3.5" />
                  {t === "light" ? "Light" : "Dark"}
                </button>
              );
            })}
          </div>
        </div>

        <DropdownMenuSeparator className="-mx-3" />

        {/* ── Scene grid ────────────────────────────────────────── */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
            Background scene
          </p>
          <div className="grid grid-cols-5 gap-1.5">
            {SCENES.map((scene) => {
              const active = vibe === scene.id && vibe !== "custom";
              return (
                <button
                  key={scene.id}
                  onClick={() => setVibe(scene.id)}
                  title={scene.label}
                  style={getPreviewStyle(scene)}
                  className={cn(
                    "relative aspect-video rounded-lg overflow-hidden transition-all duration-150",
                    "ring-offset-background ring-offset-1",
                    active
                      ? "ring-2 ring-foreground scale-[1.08] shadow-md"
                      : "opacity-70 hover:opacity-100 hover:scale-[1.04]"
                  )}
                >
                  {/* Overlay for photos so the label is readable */}
                  {scene.type === "photo" && (
                    <div className="absolute inset-0 bg-black/30" />
                  )}
                  <span className="absolute inset-x-0 bottom-0 text-[6px] text-white/90 text-center pb-0.5 leading-none font-medium truncate px-0.5">
                    {scene.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <DropdownMenuSeparator className="-mx-3" />

        {/* ── Custom image URL ──────────────────────────────────── */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1.5">
            <ImageIcon className="size-3" />
            Custom image URL
          </p>
          <input
            ref={urlInputRef}
            type="url"
            defaultValue={customImageUrl}
            placeholder="https://images.unsplash.com/…"
            onBlur={handleUrlCommit}
            onKeyDown={(e) => e.key === "Enter" && handleUrlCommit()}
            className={cn(
              "w-full rounded-lg border px-2.5 py-2 text-[11px]",
              "bg-background border-border text-foreground placeholder:text-muted-foreground/50",
              "outline-none focus:ring-1 focus:ring-ring/60 transition-colors",
              vibe === "custom" && customImageUrl && "border-ring/60"
            )}
          />
          {vibe === "custom" && customImageUrl && (
            <button
              onClick={() => {
                if (urlInputRef.current) urlInputRef.current.value = "";
                setCustomImageUrl("");
                setVibe("nebula");
              }}
              className="mt-1.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
            >
              ✕ Clear custom image
            </button>
          )}
          <p className="mt-1 text-[10px] text-muted-foreground/60 leading-snug">
            Press Enter or click away to apply.
          </p>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
