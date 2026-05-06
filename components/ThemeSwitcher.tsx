"use client";

import { useRef } from "react";
import { useTheme } from "@/contexts/theme-context";
import { Sun, Moon, Palette, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useVibe, type Vibe } from "@/contexts/vibe-context";
import { cn } from "@/lib/utils";

const VIBES: { value: Vibe; label: string; preview: string }[] = [
  { value: "minimal", label: "Minimal",  preview: "bg-zinc-950" },
  { value: "ocean",   label: "Ocean",    preview: "bg-blue-900" },
  { value: "sunset",  label: "Sunset",   preview: "bg-rose-900" },
  { value: "forest",  label: "Forest",   preview: "bg-emerald-900" },
];

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const { vibe, setVibe, customImageUrl, setCustomImageUrl } = useVibe();
  const urlInputRef = useRef<HTMLInputElement>(null);

  function handleUrlCommit() {
    const val = urlInputRef.current?.value.trim() ?? "";
    setCustomImageUrl(val);
    if (!val) {
      // When URL is cleared, fall back to minimal
      setVibe("minimal");
    }
  }

  function handleUrlKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") handleUrlCommit();
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

      {/* KEY FIX: z-[100] + solid background + strong shadow so it always sits on top */}
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className={cn(
          "z-[100] w-64 p-2",
          // Solid, opaque background — no more bleed-through on image vibes
          "bg-background border border-border/80 shadow-2xl backdrop-blur-xl",
        )}
      >
        {/* ── Light / Dark / System ─────────────────────────────────── */}
        <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-muted-foreground/70 font-semibold px-1 pb-1">
          Theme
        </DropdownMenuLabel>

        <div className="flex gap-1 mb-1">
          {(["light", "dark"] as const).map((t) => {
            const Icon = t === "light" ? Sun : Moon;
            return (
              <button
                key={t}
                onClick={() => setTheme(t)}
                className={cn(
                  "flex flex-1 flex-col items-center gap-1.5 rounded-lg px-2 py-2 text-[10px] capitalize transition-colors",
                  theme === t
                    ? "bg-accent text-foreground font-semibold"
                    : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                )}
              >
                <Icon className="size-3.5" />
                {t}
              </button>
            );
          })}
        </div>

        <DropdownMenuSeparator />

        {/* ── Background vibes ──────────────────────────────────────── */}
        <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-muted-foreground/70 font-semibold px-1 pb-1 pt-1">
          Background
        </DropdownMenuLabel>

        <div className="grid grid-cols-2 gap-1 mb-1">
          {VIBES.map((v) => (
            <button
              key={v.value}
              onClick={() => setVibe(v.value)}
              className={cn(
                "flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs transition-colors",
                vibe === v.value && vibe !== "custom"
                  ? "bg-accent text-foreground font-medium"
                  : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
              )}
            >
              <span className={cn("size-3 rounded-full shrink-0 border border-white/10", v.preview)} />
              {v.label}
            </button>
          ))}
        </div>

        <DropdownMenuSeparator />

        {/* ── Custom image URL ──────────────────────────────────────── */}
        <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-muted-foreground/70 font-semibold px-1 pb-1 pt-1 flex items-center gap-1.5">
          <ImageIcon className="size-3" />
          Custom image URL
        </DropdownMenuLabel>

        <div className="px-1 pb-1 space-y-1.5">
          <input
            ref={urlInputRef}
            type="url"
            defaultValue={customImageUrl}
            placeholder="https://images.unsplash.com/…"
            onBlur={handleUrlCommit}
            onKeyDown={handleUrlKeyDown}
            className={cn(
              "w-full rounded-md border px-2.5 py-1.5 text-[11px]",
              "bg-background border-border text-foreground placeholder:text-muted-foreground/40",
              "outline-none focus:border-ring focus:ring-1 focus:ring-ring/50",
              "transition-colors",
              vibe === "custom" && customImageUrl
                ? "border-ring/60"
                : "border-border",
            )}
          />
          <p className="text-[10px] text-muted-foreground/50 leading-snug px-0.5">
            Paste any image URL. Press Enter or click away to apply.
            {vibe === "custom" && customImageUrl && (
              <button
                onClick={() => {
                  if (urlInputRef.current) urlInputRef.current.value = "";
                  setCustomImageUrl("");
                  setVibe("minimal");
                }}
                className="ml-1 underline hover:text-muted-foreground transition-colors"
              >
                Clear
              </button>
            )}
          </p>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
