"use client";

import { useRef, useState, useTransition } from "react";
import { Shield, Plus, Trash2, Loader2, UserCheck } from "lucide-react";
import { addGuardian, removeGuardian } from "@/app/actions/guardians";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Guardian {
  id: string;
  name: string;
  email: string;
}

export default function GuardianManager({
  initialGuardians,
}: {
  initialGuardians: Guardian[];
}) {
  const [guardians, setGuardians] = useState<Guardian[]>(initialGuardians);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function handleAdd(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        await addGuardian(formData);
        // Optimistic: re-fetch by just reading back form values
        const name = (formData.get("name") as string).trim();
        const email = (formData.get("email") as string).trim().toLowerCase();
        setGuardians((prev) => [
          ...prev,
          { id: `temp-${Date.now()}`, name, email },
        ]);
        setShowForm(false);
        formRef.current?.reset();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  function handleRemove(id: string) {
    startTransition(async () => {
      await removeGuardian(id);
      setGuardians((prev) => prev.filter((g) => g.id !== id));
    });
  }

  return (
    <div className="rounded-2xl border border-border/60 bg-card/50 backdrop-blur-md px-6 py-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-violet-500/10 border border-violet-500/20">
            <Shield className="size-4 text-violet-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Trusted Guardians</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Up to 3 people consulted before your Arca is delivered.
            </p>
          </div>
        </div>

        {guardians.length < 3 && !showForm && (
          <Button
            variant="ghost"
            size="xs"
            onClick={() => setShowForm(true)}
            className="gap-1.5 text-muted-foreground hover:text-foreground"
          >
            <Plus className="size-3.5" />
            Add
          </Button>
        )}
      </div>

      {/* Guardian list */}
      {guardians.length > 0 && (
        <ul className="space-y-2">
          {guardians.map((g) => (
            <li
              key={g.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-border/40 bg-muted/20 px-4 py-2.5"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <UserCheck className="size-3.5 shrink-0 text-violet-400" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{g.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{g.email}</p>
                </div>
              </div>
              <button
                onClick={() => handleRemove(g.id)}
                disabled={isPending}
                className="shrink-0 p-1.5 rounded-lg text-muted-foreground/50 hover:text-rose-400 hover:bg-rose-400/10 transition-colors disabled:opacity-40"
                aria-label="Remove guardian"
              >
                <Trash2 className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {guardians.length === 0 && !showForm && (
        <p className="text-xs text-muted-foreground/50 italic">
          No guardians yet. Add trusted contacts who can confirm you're okay.
        </p>
      )}

      {/* Add form */}
      {showForm && (
        <form
          ref={formRef}
          action={handleAdd}
          className="space-y-3 pt-1"
        >
          {error && (
            <p className="text-xs text-rose-400 bg-rose-400/10 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          <div className="grid grid-cols-2 gap-2">
            <input
              name="name"
              required
              placeholder="Full name"
              className={cn(
                "text-sm rounded-xl border border-border/60 bg-muted/30 px-3 py-2",
                "placeholder:text-muted-foreground/40 text-foreground",
                "focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30",
                "transition-colors"
              )}
            />
            <input
              name="email"
              type="email"
              required
              placeholder="email@example.com"
              className={cn(
                "text-sm rounded-xl border border-border/60 bg-muted/30 px-3 py-2",
                "placeholder:text-muted-foreground/40 text-foreground",
                "focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30",
                "transition-colors"
              )}
            />
          </div>
          <div className="flex gap-2">
            <Button
              type="submit"
              size="xs"
              disabled={isPending}
              className="gap-1.5"
            >
              {isPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Plus className="size-3.5" />
              )}
              Add guardian
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={() => { setShowForm(false); setError(null); }}
              className="text-muted-foreground"
            >
              Cancel
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
