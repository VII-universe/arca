"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Popover } from "radix-ui";
import { Search, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// GIPHY public beta key — rate-limited, replace with a registered key for production
const GIPHY_KEY = "dc6zaTOxFJmzC";

interface GifResult {
  id: string;
  title: string;
  url: string;       // Full GIF URL for inserting
  preview: string;   // Smaller webp preview for the picker grid
  width: number;
  height: number;
}

async function fetchGifs(query: string): Promise<GifResult[]> {
  const endpoint = query.trim()
    ? `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_KEY}&q=${encodeURIComponent(query)}&limit=15&rating=pg&lang=en`
    : `https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_KEY}&limit=15&rating=pg`;

  const res = await fetch(endpoint);
  if (!res.ok) return [];
  const { data } = await res.json();

  return (data as GiphyItem[]).map((item) => ({
    id: item.id,
    title: item.title,
    url: item.images.original.url,
    preview:
      item.images.fixed_width_small?.webp ||
      item.images.fixed_width_small?.url ||
      item.images.original.url,
    width: Number(item.images.fixed_width_small?.width ?? 100),
    height: Number(item.images.fixed_width_small?.height ?? 100),
  }));
}

// Minimal GIPHY response typing
interface GiphyItem {
  id: string;
  title: string;
  images: {
    original: { url: string };
    fixed_width_small?: { url: string; webp?: string; width?: string; height?: string };
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  onSelect: (url: string) => void;
}

export default function GifPicker({ onSelect }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [gifs, setGifs] = useState<GifResult[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async (q: string) => {
    setLoading(true);
    const results = await fetchGifs(q);
    setGifs(results);
    setLoading(false);
  }, []);

  // Load trending GIFs when picker opens
  useEffect(() => {
    if (open && gifs.length === 0) load("");
  }, [open, gifs.length, load]);

  const handleQueryChange = (q: string) => {
    setQuery(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => load(q), 400);
  };

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          title="GIF"
          className="flex items-center justify-center h-7 px-1.5 rounded text-[10px] font-bold tracking-tight transition-all duration-150 select-none text-zinc-500 hover:text-zinc-200 hover:bg-white/8"
        >
          GIF
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          side="top"
          align="start"
          sideOffset={8}
          className={cn(
            "z-[200] w-80 rounded-2xl border border-border/60",
            "bg-zinc-900/95 backdrop-blur-xl shadow-2xl",
            "flex flex-col focus:outline-none",
          )}
          style={{ maxHeight: "min(420px, 60vh)" }}
        >
          {/* Search */}
          <div className="px-3 pt-3 pb-2">
            <div className="flex items-center gap-2 rounded-xl border border-border/50 bg-zinc-800/60 px-3 py-2">
              <Search className="size-3.5 text-zinc-500 shrink-0" />
              <input
                type="text"
                value={query}
                onChange={(e) => handleQueryChange(e.target.value)}
                placeholder="Search GIFs…"
                className="flex-1 bg-transparent text-sm text-zinc-200 placeholder:text-zinc-600 outline-none"
                autoFocus
              />
              {loading && <Loader2 className="size-3.5 text-zinc-500 animate-spin shrink-0" />}
            </div>
          </div>

          {/* Grid */}
          <div className="flex-1 overflow-y-auto px-3 pb-3">
            {gifs.length === 0 && !loading ? (
              <p className="text-xs text-zinc-600 text-center py-6">
                {query ? "No GIFs found." : "Loading trending GIFs…"}
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-1.5">
                {gifs.map((gif) => (
                  <button
                    key={gif.id}
                    type="button"
                    title={gif.title}
                    onClick={() => {
                      onSelect(gif.url);
                      setOpen(false);
                    }}
                    className="relative rounded-lg overflow-hidden bg-zinc-800 hover:ring-2 hover:ring-primary/60 transition-all aspect-square"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={gif.preview}
                      alt={gif.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* GIPHY attribution */}
          <div className="px-3 pb-2 flex justify-end">
            <span className="text-[9px] text-zinc-700">Powered by GIPHY</span>
          </div>

          <Popover.Arrow className="fill-zinc-900" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
