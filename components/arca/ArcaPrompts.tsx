"use client";

import { useState } from "react";

interface Prompt {
  question: string;
  hint: string;
}

const EMOTIONAL_PROMPTS: Prompt[] = [
  {
    question: "What is a memory with this person that still makes you smile when you think of it?",
    hint: "The more specific the detail — a smell, a sound, a place — the more vivid it will feel to them.",
  },
  {
    question: "What do you most hope they remember about you?",
    hint: "Not how you looked. How you made them feel when they walked into the room.",
  },
  {
    question: "What is the advice you wish someone had given you at their age?",
    hint: "The lesson that cost you years, or pain, to learn on your own.",
  },
  {
    question: "Is there something you have always been afraid to say to them?",
    hint: "You are safe here. This may be your only chance. Be brave.",
  },
  {
    question: "What do you see in them that they may not yet see in themselves?",
    hint: "The quiet strength, the hidden gift, the thing that made you proud but you never quite said aloud.",
  },
  {
    question: "If you could spend one more ordinary day with them, what would you do?",
    hint: "Not an adventure. Just the small, ordinary hours you would choose to repeat.",
  },
];

const PRACTICAL_PROMPTS: Prompt[] = [
  {
    question: "Where are the physical keys to any safe, lockbox, or safety deposit box?",
    hint: "Include the institution name, address, and account number if applicable.",
  },
  {
    question: "Are there any digital wallets, cryptocurrency, or offline password stores?",
    hint: "Hardware wallets, seed phrases — where are they physically kept, and how are they accessed?",
  },
  {
    question: "Who is your lawyer, accountant, or financial advisor — and how can they be reached?",
    hint: "Firm name, phone number, email, and any reference number for your account.",
  },
  {
    question: "What recurring subscriptions or memberships must be cancelled immediately?",
    hint: "Streaming services, SaaS tools, gym memberships, domain renewals, insurance policies.",
  },
  {
    question: "Where is your will, and who is named as the executor of your estate?",
    hint: "The physical location of the document and the contact details of the executor.",
  },
  {
    question: "What bank accounts, investment accounts, or pension funds exist — and at which institutions?",
    hint: "Include account numbers and whether there is a named beneficiary on file.",
  },
];

export default function ArcaPrompts({ packType }: { packType: "EMOTIONAL" | "PRACTICAL" }) {
  const prompts = packType === "EMOTIONAL" ? EMOTIONAL_PROMPTS : PRACTICAL_PROMPTS;
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());

  return (
    <div className="flex flex-col gap-1 h-full">
      <div className="mb-5">
        <p className="text-xs font-semibold text-foreground">Writing prompts</p>
        <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
          {packType === "EMOTIONAL"
            ? "Questions to draw out what matters most."
            : "Details your recipient will need — be precise."}
        </p>
      </div>

      <div className="space-y-2.5 overflow-y-auto flex-1 pr-0.5">
        {dismissed.size === prompts.length && (
          <p className="text-xs text-muted-foreground/60 italic py-2">
            All prompts dismissed. You know what to write.
          </p>
        )}
        {prompts.map((prompt, i) => {
          if (dismissed.has(i)) return null;
          return (
            <PromptCard
              key={i}
              prompt={prompt}
              packType={packType}
              onDismiss={() => setDismissed((prev) => new Set([...prev, i]))}
            />
          );
        })}
      </div>

      {dismissed.size > 0 && (
        <button
          onClick={() => setDismissed(new Set())}
          className="mt-3 text-[11px] text-muted-foreground/50 hover:text-muted-foreground transition-colors text-left"
        >
          Restore {dismissed.size} dismissed prompt{dismissed.size > 1 ? "s" : ""}
        </button>
      )}
    </div>
  );
}

function PromptCard({
  prompt,
  packType,
  onDismiss,
}: {
  prompt: Prompt;
  packType: "EMOTIONAL" | "PRACTICAL";
  onDismiss: () => void;
}) {
  const borderAccent =
    packType === "EMOTIONAL"
      ? "border-l-violet-400/40"
      : "border-l-sky-400/40";
  const bgAccent =
    packType === "EMOTIONAL"
      ? "bg-violet-400/[0.04]"
      : "bg-sky-400/[0.04]";

  return (
    <div
      className={`group relative rounded-r-lg border border-border/30 border-l-4 ${borderAccent} ${bgAccent} px-3.5 py-3 transition-colors hover:border-border/50`}
    >
      <button
        onClick={onDismiss}
        aria-label="Dismiss prompt"
        className="absolute top-2 right-2.5 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground/40 hover:text-muted-foreground text-xs leading-none"
      >
        ✕
      </button>
      <div className="space-y-1.5 pr-4">
        <p className="text-xs font-medium text-foreground/90 leading-relaxed">
          {prompt.question}
        </p>
        <p className="text-[11px] text-muted-foreground/70 leading-relaxed italic">
          {prompt.hint}
        </p>
      </div>
    </div>
  );
}
