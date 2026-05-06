"use client";

import { useState } from "react";
import { Popover } from "radix-ui";
import { Smile } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Emoji catalogue ─────────────────────────────────────────────────────────

const CATEGORIES: { label: string; icon: string; emojis: string[] }[] = [
  {
    label: "Smileys",
    icon: "😀",
    emojis: [
      "😀","😂","🥲","😊","😍","🥰","😎","🤩","😭","😤","🤔","😴",
      "🥳","😅","🫡","🥺","😏","🙃","🤗","😬","🫠","😇","🤓","😜",
    ],
  },
  {
    label: "Hearts",
    icon: "❤️",
    emojis: [
      "❤️","🧡","💛","💚","💙","💜","🖤","🤍","💕","💖","💗","💘",
      "💝","💞","❣️","❤️‍🔥","❤️‍🩹","🫀","💓","💟","♥️","🩷","🩵","🩶",
    ],
  },
  {
    label: "Hands",
    icon: "👋",
    emojis: [
      "👋","🤚","✋","🤙","👍","👎","👏","🙌","🤝","🫶","💪","🫂",
      "✌️","🤞","🫰","🤜","🤛","👊","✊","🤟","🤘","🖖","👌","🫵",
    ],
  },
  {
    label: "Nature",
    icon: "🌸",
    emojis: [
      "🌸","🌺","🌻","🌼","🍀","🌿","🌱","🌲","🌳","🌈","☀️","🌙",
      "⭐","✨","🌊","🦋","🌺","🌷","🪷","🌹","💐","🍁","🍂","🌴",
    ],
  },
  {
    label: "Celebration",
    icon: "🎉",
    emojis: [
      "🎉","🎊","🎈","🎁","🏆","🥂","🍰","🎂","🎶","🎵","🌟","💫",
      "🔥","⚡","🎸","🎹","🎺","🥁","🎻","🎤","🎧","🪩","🕯️","🫧",
    ],
  },
  {
    label: "Symbols",
    icon: "✨",
    emojis: [
      "💯","✅","❌","💡","🔑","🗝️","📝","📖","💌","🕊️","☮️","🙏",
      "⚘","🫂","🌺","🪬","🧿","♾️","☯️","🔮","💎","🪄","✍️","📜",
    ],
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  onSelect: (emoji: string) => void;
}

export default function EmojiPicker({ onSelect }: Props) {
  const [activeCategory, setActiveCategory] = useState(0);
  const [open, setOpen] = useState(false);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          title="Emoji"
          className="flex items-center justify-center w-7 h-7 rounded text-xs transition-all duration-150 select-none text-zinc-500 hover:text-zinc-200 hover:bg-white/8"
        >
          <Smile className="size-3.5" />
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          side="top"
          align="start"
          sideOffset={8}
          className={cn(
            "z-[200] w-72 rounded-2xl border border-border/60",
            "bg-zinc-900/95 backdrop-blur-xl shadow-2xl",
            "focus:outline-none"
          )}
        >
          {/* Category tabs */}
          <div className="flex items-center gap-0.5 px-3 pt-3 pb-2 border-b border-border/30 overflow-x-auto scrollbar-none">
            {CATEGORIES.map((cat, i) => (
              <button
                key={cat.label}
                type="button"
                title={cat.label}
                onClick={() => setActiveCategory(i)}
                className={cn(
                  "shrink-0 text-base px-1.5 py-1 rounded-lg transition-colors",
                  activeCategory === i
                    ? "bg-white/15"
                    : "hover:bg-white/8 opacity-60 hover:opacity-100"
                )}
              >
                {cat.icon}
              </button>
            ))}
          </div>

          {/* Emoji grid */}
          <div className="grid grid-cols-8 gap-0.5 p-3">
            {CATEGORIES[activeCategory].emojis.map((emoji) => (
              <button
                key={emoji}
                type="button"
                title={emoji}
                onClick={() => {
                  onSelect(emoji);
                  setOpen(false);
                }}
                className="text-xl flex items-center justify-center h-8 w-8 rounded-lg hover:bg-white/10 transition-colors"
              >
                {emoji}
              </button>
            ))}
          </div>

          <Popover.Arrow className="fill-zinc-900" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
