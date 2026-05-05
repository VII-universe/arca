"use client";

import { useTheme } from "next-themes";
import { Sun, Moon, Monitor, Palette } from "lucide-react";
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
  { value: "minimal", label: "Minimal", preview: "bg-zinc-950" },
  { value: "ocean", label: "Ocean", preview: "bg-blue-900" },
  { value: "sunset", label: "Sunset", preview: "bg-rose-900" },
  { value: "forest", label: "Forest", preview: "bg-emerald-900" },
];

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const { vibe, setVibe } = useVibe();

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

      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
          Theme
        </DropdownMenuLabel>

        <div className="flex gap-1 px-1 pb-1">
          {(["light", "dark", "system"] as const).map((t) => {
            const Icon = t === "light" ? Sun : t === "dark" ? Moon : Monitor;
            return (
              <button
                key={t}
                onClick={() => setTheme(t)}
                className={cn(
                  "flex flex-1 flex-col items-center gap-1 rounded-md px-2 py-2 text-[10px] capitalize transition-colors",
                  theme === t
                    ? "bg-accent text-foreground"
                    : "text-muted-foreground hover:bg-accent/50"
                )}
              >
                <Icon className="size-3.5" />
                {t}
              </button>
            );
          })}
        </div>

        <DropdownMenuSeparator />

        <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
          Background
        </DropdownMenuLabel>

        <div className="grid grid-cols-2 gap-1 px-1 pb-1">
          {VIBES.map((v) => (
            <button
              key={v.value}
              onClick={() => setVibe(v.value)}
              className={cn(
                "flex items-center gap-2 rounded-md px-2 py-2 text-xs transition-colors",
                vibe === v.value
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground hover:bg-accent/50"
              )}
            >
              <span className={cn("size-3 rounded-full shrink-0", v.preview)} />
              {v.label}
            </button>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
