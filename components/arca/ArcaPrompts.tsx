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

  const visible = prompts.filter((_, i) => !dismissed.has(i));

  return (
    <div className="flex flex-col gap-1 h-full">
      <div className="mb-4">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-600">
          Writing Prompts
        </p>
        <p className="mt-1 text-xs text-neutral-600">
          {packType === "EMOTIONAL"
            ? "Questions to draw out what matters most."
            : "Details your recipient will need — be precise."}
        </p>
      </div>

      <div className="space-y-3 overflow-y-auto flex-1 pr-1">
        {visible.length === 0 && (
          <p className="text-xs text-neutral-700 italic">
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
          className="mt-3 text-[10px] text-neutral-700 hover:text-neutral-500 transition-colors text-left"
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
  const accent =
    packType === "EMOTIONAL"
      ? "border-rose-900/60 hover:border-rose-800/80"
      : "border-blue-900/60 hover:border-blue-800/80";
  const dot =
    packType === "EMOTIONAL" ? "bg-rose-700" : "bg-blue-700";

  return (
    <div
      className={`group relative rounded-lg border bg-neutral-900/60 p-3.5 transition-colors ${accent}`}
    >
      <button
        onClick={onDismiss}
        aria-label="Dismiss prompt"
        className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition-opacity text-neutral-700 hover:text-neutral-400 text-xs leading-none"
      >
        ✕
      </button>
      <div className="flex gap-2.5">
        <div className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
        <div className="space-y-1.5">
          <p className="text-sm text-neutral-300 leading-snug">{prompt.question}</p>
          <p className="text-xs text-neutral-600 leading-snug italic">{prompt.hint}</p>
        </div>
      </div>
    </div>
  );
}
