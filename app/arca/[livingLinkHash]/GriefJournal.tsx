"use client";

import { useState, useTransition } from "react";
import { addJournalEntry } from "@/app/actions/journal";
import { PenLine, Check, Lock } from "lucide-react";

interface JournalEntry {
  id: string;
  content: string;
  createdAt: Date;
}

interface Props {
  messagePackId: string;
  initialEntries: JournalEntry[];
}

function formatDate(d: Date) {
  return new Date(d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function GriefJournal({ messagePackId, initialEntries }: Props) {
  const [entries, setEntries] = useState(initialEntries);
  const [draft, setDraft] = useState("");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSave = () => {
    if (!draft.trim()) return;
    setError(null);

    startTransition(async () => {
      const result = await addJournalEntry(messagePackId, draft);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      const newEntry: JournalEntry = {
        id: Date.now().toString(),
        content: draft.trim(),
        createdAt: new Date(),
      };
      setEntries((prev) => [newEntry, ...prev]);
      setDraft("");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    });
  };

  return (
    <section className="mt-24 border-t border-border/30 pt-16">
      {/* Header */}
      <div className="mb-10 space-y-2">
        <div className="flex items-center gap-2.5 text-muted-foreground/50">
          <Lock className="size-3.5" />
          <p className="text-[10px] font-semibold uppercase tracking-[0.25em]">
            Private · Only visible to you
          </p>
        </div>
        <h2 className="font-serif text-2xl text-foreground font-normal">
          Your journal
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-lg">
          A quiet space to process your thoughts, remember, and write to the past.
          These words belong only to you.
        </p>
      </div>

      {/* Write area */}
      <div className="relative">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="What is on your mind right now…"
          rows={6}
          className={[
            "w-full rounded-2xl border bg-card/30 backdrop-blur-sm px-6 py-5",
            "text-[15px] font-light leading-[1.85] text-foreground",
            "placeholder:text-muted-foreground/30",
            "outline-none resize-none",
            "border-border/30 focus:border-border/60",
            "transition-colors duration-200",
          ].join(" ")}
        />

        <div className="flex items-center justify-between mt-3">
          <div>
            {error && (
              <p className="text-xs text-destructive">{error}</p>
            )}
            {saved && (
              <p className="flex items-center gap-1.5 text-xs text-emerald-600">
                <Check className="size-3.5" />
                Entry saved
              </p>
            )}
          </div>
          <button
            onClick={handleSave}
            disabled={!draft.trim() || isPending}
            className={[
              "flex items-center gap-2 rounded-full px-5 py-2 text-sm font-medium transition-all",
              draft.trim() && !isPending
                ? "bg-foreground text-background hover:opacity-90"
                : "bg-muted text-muted-foreground cursor-not-allowed",
            ].join(" ")}
          >
            <PenLine className="size-3.5" />
            {isPending ? "Saving…" : "Save entry"}
          </button>
        </div>
      </div>

      {/* Past entries */}
      {entries.length > 0 && (
        <div className="mt-14 space-y-8">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/40">
            Past entries
          </p>
          {entries.map((entry) => (
            <article key={entry.id} className="space-y-2">
              <time className="block text-xs text-muted-foreground/50">
                {formatDate(entry.createdAt)}
              </time>
              <p className="text-[15px] font-light leading-[1.85] text-foreground/80 whitespace-pre-line">
                {entry.content}
              </p>
              <div className="h-px bg-border/20 mt-6" />
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
