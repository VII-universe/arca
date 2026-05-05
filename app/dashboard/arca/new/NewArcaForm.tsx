"use client";

import { useActionState, useState } from "react";
import { createPack } from "@/app/actions/arca";

type PackTypeValue = "EMOTIONAL" | "PRACTICAL";

const TYPES: {
  value: PackTypeValue;
  label: string;
  tagline: string;
  description: string;
  icon: string;
  accent: string;
  selectedRing: string;
  selectedBg: string;
}[] = [
  {
    value: "EMOTIONAL",
    label: "Emotional Arca",
    tagline: "A letter from the heart.",
    description:
      "Messages of love, memory, and guidance. A time capsule meant to be read when you are no longer there to say the words yourself.",
    icon: "✦",
    accent: "text-rose-400",
    selectedRing: "ring-rose-800",
    selectedBg: "bg-rose-950/30",
  },
  {
    value: "PRACTICAL",
    label: "Practical Arca",
    tagline: "A vault of knowledge.",
    description:
      "Passwords, documents, instructions, and access. Everything your people will need to carry on without you.",
    icon: "⬡",
    accent: "text-blue-400",
    selectedRing: "ring-blue-800",
    selectedBg: "bg-blue-950/30",
  },
];

export default function NewArcaForm() {
  const [selected, setSelected] = useState<PackTypeValue | null>(null);
  const [state, formAction, isPending] = useActionState(createPack, null);

  return (
    <form action={formAction} className="space-y-8">
      {/* Type selector */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {TYPES.map((type) => {
          const isSelected = selected === type.value;
          return (
            <button
              key={type.value}
              type="button"
              onClick={() => setSelected(type.value)}
              className={[
                "relative text-left rounded-xl border p-6 transition-all duration-200 focus:outline-none",
                "focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                isSelected
                  ? `border-border ring-1 ${type.selectedRing} ${type.selectedBg}`
                  : "border-border bg-card/50 hover:border-border/80 hover:bg-card",
              ].join(" ")}
            >
              {isSelected && (
                <input type="hidden" name="type" value={type.value} />
              )}

              <div className="space-y-3">
                <div className={`text-2xl ${type.accent}`}>{type.icon}</div>
                <div>
                  <p className="font-semibold text-foreground">{type.label}</p>
                  <p className={`text-xs font-medium mt-0.5 ${type.accent}`}>
                    {type.tagline}
                  </p>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {type.description}
                </p>
              </div>

              {isSelected && (
                <div className="absolute top-4 right-4 h-2 w-2 rounded-full bg-foreground/60" />
              )}
            </button>
          );
        })}
      </div>

      {/* Title input — revealed once a type is chosen */}
      <div
        className={`transition-all duration-300 overflow-hidden ${
          selected ? "max-h-40 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="space-y-2">
          <label
            htmlFor="title"
            className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground"
          >
            Give it a name
          </label>
          <input
            id="title"
            name="title"
            type="text"
            autoComplete="off"
            placeholder={
              selected === "EMOTIONAL"
                ? "e.g. For my daughter, on her wedding day"
                : "e.g. Everything you need to know"
            }
            required
            className={[
              "w-full rounded-lg border bg-background px-4 py-3",
              "text-foreground text-sm placeholder:text-muted-foreground/40",
              "border-border outline-none",
              "focus:border-border/80 focus:ring-1 focus:ring-ring",
              "transition-colors",
            ].join(" ")}
          />
        </div>
      </div>

      {/* Error message */}
      {state?.error && (
        <p className="text-sm text-destructive rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2.5">
          {state.error}
        </p>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={!selected || isPending}
        className={[
          "w-full rounded-lg py-3 text-sm font-semibold transition-all duration-200",
          selected && !isPending
            ? "bg-foreground text-background hover:opacity-90"
            : "bg-muted text-muted-foreground cursor-not-allowed",
        ].join(" ")}
      >
        {isPending ? "Creating…" : "Create Arca →"}
      </button>
    </form>
  );
}
