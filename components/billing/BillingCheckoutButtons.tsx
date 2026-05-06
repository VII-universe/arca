"use client";

import { useState, useTransition } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function BillingCheckoutButtons() {
  const [plan, setPlan] = useState<"monthly" | "lifetime">("lifetime");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleCheckout() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/stripe/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Checkout failed");
        if (data.url) window.location.href = data.url;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  return (
    <div className="space-y-3 pt-1">
      {/* Plan toggle */}
      <div className="flex rounded-xl bg-black/20 border border-white/5 p-1 gap-1">
        {(["monthly", "lifetime"] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPlan(p)}
            className={cn(
              "flex-1 rounded-lg px-3 py-2 text-xs font-medium transition-all duration-200",
              plan === p
                ? "bg-violet-600 text-white shadow-md shadow-violet-900/40"
                : "text-zinc-400 hover:text-zinc-200"
            )}
          >
            {p === "monthly" ? "$9.99 / mo" : (
              <span className="flex items-center justify-center gap-1.5">
                $99 once
                <span className="text-[9px] bg-amber-400/20 text-amber-300 rounded-full px-1.5 py-0.5 border border-amber-400/20">
                  BEST VALUE
                </span>
              </span>
            )}
          </button>
        ))}
      </div>

      {error && (
        <p className="text-xs text-rose-400 bg-rose-400/10 border border-rose-400/20 rounded-xl px-3 py-2 text-center">
          {error}
        </p>
      )}

      <button
        onClick={handleCheckout}
        disabled={isPending}
        className={cn(
          "w-full rounded-xl py-3 text-sm font-semibold transition-all duration-200",
          "bg-violet-600 hover:bg-violet-500 text-white",
          "shadow-lg shadow-violet-900/40 hover:shadow-violet-800/60",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          "flex items-center justify-center gap-2"
        )}
      >
        {isPending ? (
          <><Loader2 className="size-4 animate-spin" /> Redirecting…</>
        ) : (
          <><Sparkles className="size-4" /> Upgrade to Pro</>
        )}
      </button>

      <p className="text-center text-[10px] text-zinc-600">
        Secure checkout via Stripe · Cancel anytime
      </p>
    </div>
  );
}
