"use client";

import {
  createContext,
  useContext,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import {
  Sparkles,
  Infinity as InfinityIcon,
  ShieldCheck,
  Mic,
  Video,
  Mail,
  X,
  Check,
  Loader2,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

// ─── Context ──────────────────────────────────────────────────────────────────

interface UpgradeModalCtx {
  open: (feature?: string) => void;
}

const UpgradeModalContext = createContext<UpgradeModalCtx>({ open: () => {} });

export function useUpgradeModal() {
  return useContext(UpgradeModalContext);
}

// ─── Plan data ────────────────────────────────────────────────────────────────

const PRO_FEATURES = [
  { icon: <InfinityIcon className="size-3.5" />, text: "Unlimited Arcas" },
  { icon: <ShieldCheck className="size-3.5" />, text: "Zero-Knowledge Encryption" },
  { icon: <Mic className="size-3.5" />, text: "Voice & Video recording" },
  { icon: <Video className="size-3.5" />, text: "Drip chapter delivery" },
  { icon: <Mail className="size-3.5" />, text: "Physical letter delivery" },
  { icon: <Zap className="size-3.5" />, text: "5 GB media storage" },
  { icon: <ShieldCheck className="size-3.5" />, text: "Trusted Guardians system" },
  { icon: <Sparkles className="size-3.5" />, text: "Priority support" },
];

const FREE_LIMITS = [
  "1 Arca maximum",
  "50 MB storage",
  "Standard text editor",
  "Email delivery only",
];

// ─── Provider ─────────────────────────────────────────────────────────────────

export function UpgradeModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [featureHint, setFeatureHint] = useState<string | undefined>();
  const [plan, setPlan] = useState<"monthly" | "lifetime">("monthly");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function open(feature?: string) {
    setFeatureHint(feature);
    setIsOpen(true);
    setError(null);
  }

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
    <UpgradeModalContext.Provider value={{ open }}>
      {children}

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div
              className={cn(
                "pointer-events-auto w-full max-w-lg",
                "rounded-3xl border border-white/10 bg-zinc-950 shadow-2xl shadow-black/60",
                "overflow-hidden"
              )}
            >
              {/* Header gradient bar */}
              <div className="h-px w-full bg-gradient-to-r from-transparent via-violet-500/60 to-transparent" />

              <div className="px-8 pt-8 pb-7 space-y-6">

                {/* Close */}
                <button
                  onClick={() => setIsOpen(false)}
                  className="absolute top-5 right-5 p-1.5 rounded-full text-zinc-500 hover:text-zinc-200 hover:bg-white/5 transition-colors"
                >
                  <X className="size-4" />
                </button>

                {/* Badge + headline */}
                <div className="space-y-3 text-center">
                  <div className="inline-flex items-center gap-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1">
                    <Sparkles className="size-3 text-violet-400" />
                    <span className="text-[11px] font-semibold tracking-widest uppercase text-violet-300">
                      ARCA Pro
                    </span>
                  </div>

                  <h2 className="font-serif text-2xl text-white leading-snug">
                    Your words deserve<br />no limits.
                  </h2>

                  {featureHint && (
                    <p className="text-sm text-zinc-400">
                      <span className="text-violet-300">{featureHint}</span> is a Pro feature.
                    </p>
                  )}
                </div>

                {/* Comparison */}
                <div className="grid grid-cols-2 gap-3">

                  {/* Free */}
                  <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Free</p>
                    <ul className="space-y-2">
                      {FREE_LIMITS.map((f) => (
                        <li key={f} className="flex items-start gap-2 text-xs text-zinc-500">
                          <span className="mt-0.5 size-3.5 shrink-0 rounded-full border border-zinc-700 flex items-center justify-center">
                            <span className="size-1 rounded-full bg-zinc-600" />
                          </span>
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Pro */}
                  <div className="rounded-2xl border border-violet-500/25 bg-violet-500/[0.06] p-4 space-y-3 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-transparent pointer-events-none" />
                    <p className="text-xs font-semibold uppercase tracking-widest text-violet-400">Pro</p>
                    <ul className="space-y-2">
                      {PRO_FEATURES.map((f) => (
                        <li key={f.text} className="flex items-start gap-2 text-xs text-zinc-300">
                          <span className="mt-0.5 size-3.5 shrink-0 rounded-full bg-violet-500/20 border border-violet-500/30 flex items-center justify-center text-violet-400">
                            <Check className="size-2.5" strokeWidth={3} />
                          </span>
                          {f.text}
                        </li>
                      ))}
                    </ul>
                  </div>

                </div>

                {/* Plan toggle */}
                <div className="flex items-center justify-center">
                  <div className="inline-flex rounded-xl bg-white/[0.04] border border-white/5 p-1 gap-1">
                    {(["monthly", "lifetime"] as const).map((p) => (
                      <button
                        key={p}
                        onClick={() => setPlan(p)}
                        className={cn(
                          "relative rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200",
                          plan === p
                            ? "bg-violet-600 text-white shadow-lg shadow-violet-900/40"
                            : "text-zinc-400 hover:text-zinc-200"
                        )}
                      >
                        {p === "monthly" ? (
                          <span>$9.99 <span className="text-xs font-normal opacity-70">/ mo</span></span>
                        ) : (
                          <span className="flex items-center gap-1.5">
                            $99
                            <span className="text-[10px] font-semibold bg-amber-400/20 text-amber-300 border border-amber-400/20 rounded-full px-1.5 py-0.5">
                              BEST VALUE
                            </span>
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <p className="text-xs text-rose-400 bg-rose-400/10 border border-rose-400/20 rounded-xl px-3 py-2 text-center">
                    {error}
                  </p>
                )}

                {/* CTA */}
                <button
                  onClick={handleCheckout}
                  disabled={isPending}
                  className={cn(
                    "w-full rounded-2xl py-3.5 text-sm font-semibold transition-all duration-200",
                    "bg-violet-600 hover:bg-violet-500 text-white",
                    "shadow-lg shadow-violet-900/30 hover:shadow-violet-900/50",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                    "flex items-center justify-center gap-2"
                  )}
                >
                  {isPending ? (
                    <><Loader2 className="size-4 animate-spin" /> Redirecting to checkout…</>
                  ) : (
                    <><Sparkles className="size-4" /> Unlock Pro — {plan === "monthly" ? "$9.99/mo" : "$99 once"}</>
                  )}
                </button>

                <p className="text-center text-[11px] text-zinc-600">
                  Secure payment via Stripe. Cancel anytime.
                </p>

              </div>

              {/* Footer gradient bar */}
              <div className="h-px w-full bg-gradient-to-r from-transparent via-violet-500/30 to-transparent" />
            </div>
          </div>
        </>
      )}
    </UpgradeModalContext.Provider>
  );
}
