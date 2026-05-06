import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Sparkles,
  Check,
  ArrowLeft,
  Infinity as InfinityIcon,
  ShieldCheck,
  Mic,
  Video,
  Mail,
  Zap,
  Crown,
  Shield,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { resolveUser, hasProAccess } from "@/lib/auth/user";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import BillingCheckoutButtons from "@/components/billing/BillingCheckoutButtons";
import { cn } from "@/lib/utils";

export const metadata = { title: "Billing — ARCA" };

const COMPARISON = [
  {
    feature: "Message Packs (Arcas)",
    free: "1 Arca",
    pro: "Unlimited",
    proHighlight: true,
  },
  { feature: "Media storage", free: "50 MB", pro: "5 GB", proHighlight: true },
  { feature: "Text editor", free: true, pro: true },
  { feature: "Delivery triggers", free: true, pro: true },
  { feature: "Trusted Guardians", free: true, pro: true },
  { feature: "Smart Heartbeat webhook", free: true, pro: true },
  {
    feature: "Zero-Knowledge Encryption",
    free: false,
    pro: true,
    proHighlight: true,
  },
  { feature: "Voice & Video recording", free: false, pro: true },
  { feature: "Drip chapter delivery", free: false, pro: true },
  { feature: "Physical letter delivery", free: false, pro: true },
  { feature: "Grief journal for recipients", free: false, pro: true },
  { feature: "Priority support", free: false, pro: true },
];

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; canceled?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) redirect("/login");

  const user = await resolveUser(authUser);
  const isPro = hasProAccess(user);
  const { success, canceled } = await searchParams;

  return (
    <div className="min-h-screen">

      {/* Top bar */}
      <header className="sticky top-0 z-20 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="mx-auto max-w-5xl px-6 md:px-8 py-3.5 flex items-center justify-between">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="size-4" />
            Dashboard
          </Link>
          <ThemeSwitcher />
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-12 md:px-8 space-y-14">

        {/* Success / cancelled banners */}
        {success && (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-6 py-4 text-center">
            <p className="text-sm font-medium text-emerald-300">
              Welcome to ARCA Pro! Your account has been upgraded.
            </p>
          </div>
        )}
        {canceled && (
          <div className="rounded-2xl border border-border/40 bg-muted/20 px-6 py-4 text-center">
            <p className="text-sm text-muted-foreground">
              Checkout was cancelled. Your plan hasn't changed.
            </p>
          </div>
        )}

        {/* Hero */}
        <div className="text-center space-y-4">
          {isPro ? (
            <>
              <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-1.5">
                <Crown className="size-3.5 text-violet-400" />
                <span className="text-xs font-semibold tracking-widest uppercase text-violet-300">
                  {user.role === "ADMIN" ? "Admin · All features unlocked" : "Pro Member"}
                </span>
              </div>
              <h1 className="font-serif text-4xl text-foreground">
                You have full access.
              </h1>
              <p className="text-muted-foreground text-sm max-w-md mx-auto">
                Every feature is unlocked. Use ARCA without limits.
              </p>
            </>
          ) : (
            <>
              <div className="inline-flex items-center gap-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1">
                <Sparkles className="size-3 text-violet-400" />
                <span className="text-[11px] font-semibold tracking-widest uppercase text-violet-300">
                  ARCA Pro
                </span>
              </div>
              <h1 className="font-serif text-4xl text-foreground leading-tight">
                Your words deserve<br />no limits.
              </h1>
              <p className="text-muted-foreground text-sm max-w-md mx-auto leading-relaxed">
                Upgrade once. Preserve everything — with encryption, video,
                unlimited Arcas, and physical delivery.
              </p>
            </>
          )}
        </div>

        {/* Pricing cards — only shown when not pro */}
        {!isPro && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

            {/* Free card */}
            <div className="rounded-3xl border border-border/50 bg-card/40 backdrop-blur-md px-7 py-7 space-y-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">Free</p>
                <p className="text-3xl font-semibold text-foreground">$0</p>
                <p className="text-xs text-muted-foreground mt-1">Forever</p>
              </div>
              <ul className="space-y-2.5">
                {["1 Arca", "50 MB storage", "Text editor", "Email delivery"].map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                    <span className="size-4 shrink-0 rounded-full border border-border/60 flex items-center justify-center">
                      <span className="size-1.5 rounded-full bg-muted-foreground/30" />
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
              <div className="pt-2">
                <div className="w-full rounded-xl border border-border/40 bg-muted/10 py-2.5 text-center text-sm font-medium text-muted-foreground">
                  Current plan
                </div>
              </div>
            </div>

            {/* Pro card */}
            <div className="relative rounded-3xl border border-violet-500/30 bg-gradient-to-br from-violet-950/30 to-zinc-950/60 backdrop-blur-md px-7 py-7 space-y-5 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 via-transparent to-transparent pointer-events-none" />
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500/50 to-transparent" />

              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-violet-400 mb-2">Pro</p>
                <div className="flex items-baseline gap-1">
                  <p className="text-3xl font-semibold text-foreground">$9.99</p>
                  <p className="text-sm text-muted-foreground">/ month</p>
                </div>
                <p className="text-xs text-muted-foreground mt-1">or $99 one-time · lifetime access</p>
              </div>

              <ul className="space-y-2.5">
                {[
                  { icon: <InfinityIcon className="size-3.5" />, text: "Unlimited Arcas" },
                  { icon: <Zap className="size-3.5" />, text: "5 GB media storage" },
                  { icon: <ShieldCheck className="size-3.5" />, text: "Zero-Knowledge Encryption" },
                  { icon: <Mic className="size-3.5" />, text: "Voice & Video recording" },
                  { icon: <Video className="size-3.5" />, text: "Drip chapter delivery" },
                  { icon: <Mail className="size-3.5" />, text: "Physical letter delivery" },
                  { icon: <Shield className="size-3.5" />, text: "Trusted Guardians + Heartbeat" },
                ].map((f) => (
                  <li key={f.text} className="flex items-center gap-2.5 text-sm text-zinc-200">
                    <span className="size-4 shrink-0 rounded-full bg-violet-500/20 border border-violet-500/30 flex items-center justify-center text-violet-400">
                      <Check className="size-2.5" strokeWidth={3} />
                    </span>
                    {f.text}
                  </li>
                ))}
              </ul>

              <BillingCheckoutButtons />
            </div>

          </div>
        )}

        {/* Feature comparison table */}
        <div className="space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/50">
            Full comparison
          </h2>
          <div className="rounded-2xl border border-border/50 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50 bg-muted/20">
                  <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground/60 w-1/2">
                    Feature
                  </th>
                  <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground/60 w-1/4">
                    Free
                  </th>
                  <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wider text-violet-400 w-1/4">
                    Pro
                  </th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map((row, i) => (
                  <tr
                    key={row.feature}
                    className={cn(
                      "border-b border-border/30 last:border-0 transition-colors",
                      i % 2 === 0 ? "bg-transparent" : "bg-muted/[0.03]"
                    )}
                  >
                    <td className="px-5 py-3 text-muted-foreground">{row.feature}</td>
                    <td className="px-4 py-3 text-center">
                      {row.free === false ? (
                        <span className="text-muted-foreground/30">—</span>
                      ) : row.free === true ? (
                        <Check className="size-3.5 text-muted-foreground/50 mx-auto" />
                      ) : (
                        <span className="text-xs text-muted-foreground">{row.free}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {row.pro === false ? (
                        <span className="text-muted-foreground/30">—</span>
                      ) : row.pro === true ? (
                        <Check className={cn("size-3.5 mx-auto", row.proHighlight ? "text-violet-400" : "text-muted-foreground/50")} />
                      ) : (
                        <span className={cn("text-xs font-medium", row.proHighlight ? "text-violet-300" : "text-muted-foreground")}>
                          {row.pro}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </main>
    </div>
  );
}
