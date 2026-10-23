"use client";

import { useState, useTransition } from "react";
import { verifyChallengeAnswer } from "@/app/actions/unlock";

interface Props {
  packId: string;
  livingLinkHash: string;
  question: string;
}

export default function ChallengeGate({ packId, livingLinkHash, question }: Props) {
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!answer.trim()) return;
    setError(null);

    startTransition(async () => {
      const result = await verifyChallengeAnswer(packId, livingLinkHash, answer);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 py-20">
      <div className="w-full max-w-md space-y-10">

        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="relative flex h-14 w-14 items-center justify-center">
              <div className="absolute inset-0 rounded-full border border-border" />
              <span className="text-lg text-muted-foreground/50 select-none">◈</span>
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-base font-semibold text-foreground">
              Before you open this Arca
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              The person who created this message added a security question to
              ensure it reaches the right person.
            </p>
          </div>
        </div>

        {/* Challenge question */}
        <div className="rounded-2xl border border-border bg-muted/40 px-6 py-5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-3">
            Security question
          </p>
          <p className="text-sm text-foreground/80 leading-relaxed italic">
            &ldquo;{question}&rdquo;
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label
              htmlFor="answer"
              className="block text-xs font-medium text-muted-foreground"
            >
              Your answer
            </label>
            <input
              id="answer"
              type="text"
              value={answer}
              onChange={(e) => {
                setAnswer(e.target.value);
                if (error) setError(null);
              }}
              placeholder="Enter your answer…"
              autoFocus
              autoComplete="off"
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-border/80 focus:ring-1 focus:ring-ring transition-colors"
            />
          </div>

          {error && (
            <div className="flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3">
              <span className="shrink-0 text-destructive mt-0.5 text-sm">◦</span>
              <p className="text-sm text-destructive leading-snug">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={!answer.trim() || isPending}
            className={[
              "w-full rounded-xl py-3.5 text-sm font-semibold transition-all duration-200",
              answer.trim() && !isPending
                ? "bg-foreground text-background hover:opacity-90"
                : "bg-muted text-muted-foreground cursor-not-allowed",
            ].join(" ")}
          >
            {isPending ? "Verifying…" : "Open this Arca →"}
          </button>

          <p className="text-[11px] text-muted-foreground/50 text-center leading-relaxed">
            Your answer is verified securely against a one-way hash and is
            never stored or logged in plain text.
          </p>
        </form>
      </div>
    </div>
  );
}
