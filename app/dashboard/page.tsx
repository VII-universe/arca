import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Shield,
  Zap,
  Fingerprint,
  Sparkles,
  Crown,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";
import { resolveUser, hasProAccess, FREE_LIMITS } from "@/lib/auth/user";
import { signOut } from "@/app/actions/auth";
import CheckInButton from "@/components/dashboard/CheckInButton";
import GracePeriodBanner, {
  type GracePack,
} from "@/components/dashboard/GracePeriodBanner";
import GuardianManager from "@/components/dashboard/GuardianManager";
import HeartbeatWidget from "@/components/dashboard/HeartbeatWidget";
import ArcasDashboard from "@/components/dashboard/arcas/ArcasDashboard";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { PackSummary } from "@/components/dashboard/arcas/shared";

export const metadata = { title: "Dashboard — ARCA" };

// ── Status config ─────────────────────────────────────────────────────────────

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) redirect("/login");

  const [prismaUser, packs, categories] = await Promise.all([
    resolveUser(authUser),
    prisma.messagePack.findMany({
      where: { ownerId: authUser.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        type: true,
        status: true,
        createdAt: true,
        categoryId: true,
        category: { select: { id: true, name: true, color: true } },
        recipients: {
          select: { id: true, name: true, email: true },
          orderBy: { createdAt: "asc" },
        },
        triggerCondition: {
          select: {
            type: true,
            triggeredAt: true,
            gracePeriodDays: true,
            executeAtDate: true,
            inactivityDaysLimit: true,
          },
        },
      },
    }),
    prisma.category.findMany({
      where: { userId: authUser.id },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, color: true },
    }),
  ]);

  // ── Grace period packs ───────────────────────────────────────────────────
  const now = Date.now();
  const gracePacks: GracePack[] = packs
    .filter((p) => p.status === "GRACE_PERIOD")
    .map((p) => {
      const { triggeredAt, gracePeriodDays } = p.triggerCondition ?? {};
      if (!triggeredAt || gracePeriodDays == null)
        return { id: p.id, title: p.title, daysRemaining: 0 };
      const elapsed = (now - triggeredAt.getTime()) / 86_400_000;
      const remaining = Math.max(0, Math.ceil(gracePeriodDays - elapsed));
      return { id: p.id, title: p.title, daysRemaining: remaining };
    });

  const firstName = prismaUser.name?.split(" ")[0] ?? "there";
  const activePacks = packs.filter((p) => p.status === "ACTIVE").length;
  const isPro = hasProAccess(prismaUser);
  const atPackLimit = !isPro && packs.length >= FREE_LIMITS.maxPacks;

  return (
    <div className="min-h-screen">

      {/* ── Top bar ────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-20 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="mx-auto max-w-5xl px-6 md:px-8 py-3.5 flex items-center justify-between">
          <Link
            href="/"
            className="text-sm font-semibold tracking-[0.18em] uppercase text-muted-foreground hover:text-foreground transition-colors duration-300"
          >
            ARCA
          </Link>
          <div className="flex items-center gap-2">
            <span className="hidden sm:block text-xs text-muted-foreground/50">
              {prismaUser.email}
            </span>
            {isPro ? (
              <Link
                href="/dashboard/billing"
                className="hidden sm:inline-flex items-center gap-1 rounded-full border border-violet-500/30 bg-violet-500/10 px-2.5 py-1 text-[10px] font-semibold tracking-wide text-violet-300 hover:bg-violet-500/20 transition-colors"
              >
                <Crown className="size-3" />
                {prismaUser.role === "ADMIN" ? "ADMIN" : "PRO"}
              </Link>
            ) : (
              <Link
                href="/dashboard/billing"
                className="hidden sm:inline-flex items-center gap-1 rounded-full border border-border/50 bg-muted/30 px-2.5 py-1 text-[10px] font-semibold tracking-wide text-muted-foreground hover:border-violet-500/40 hover:text-violet-300 hover:bg-violet-500/10 transition-all"
              >
                <Sparkles className="size-3" />
                Upgrade
              </Link>
            )}
            <ThemeSwitcher />
            <form action={signOut}>
              <Button
                type="submit"
                variant="ghost"
                size="xs"
                className="rounded-full text-muted-foreground hover:text-foreground"
              >
                Sign out
              </Button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10 md:px-8 space-y-8">

        {/* ── Grace period alerts ────────────────────────────────────── */}
        {gracePacks.length > 0 && <GracePeriodBanner packs={gracePacks} />}

        {/* ── Greeting ───────────────────────────────────────────────── */}
        <div>
          <h1 className="font-serif text-3xl text-foreground">
            Good to see you, {firstName}.
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            {activePacks > 0
              ? `${activePacks} ${activePacks === 1 ? "Arca" : "Arcas"} sealed and monitoring.`
              : "Nothing sealed yet — create your first Arca below."}
          </p>
        </div>

        {/* ── Stats row ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-4">
          <StatCard
            icon={<Shield className="size-4 text-emerald-500" />}
            value={packs.filter((p) => p.status === "ACTIVE").length}
            label="Active"
            accent="text-emerald-500"
          />
          <StatCard
            icon={<Fingerprint className="size-4 text-muted-foreground" />}
            value={packs.length}
            label="Total"
            accent="text-foreground"
          />
          <StatCard
            icon={<Zap className="size-4 text-sky-500" />}
            value={packs.filter((p) => p.status === "TRIGGERED" || p.status === "DELIVERED").length}
            label="Delivered"
            accent="text-sky-500"
          />
        </div>

        {/* ── Presence monitoring banner ─────────────────────────────── */}
        <div className="rounded-2xl border border-border/60 bg-card/50 backdrop-blur-md px-6 py-5 flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <span className="relative flex size-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-50" />
                <span className="relative inline-flex rounded-full size-2 bg-emerald-500" />
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">Presence monitoring</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                Confirm you're here to reset all inactivity timers and keep your Arcas sealed.
              </p>
            </div>
          </div>
          <CheckInButton lastActiveAt={prismaUser.lastActiveAt} />
        </div>

        {/* ── Guardians + Heartbeat ──────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <GuardianManager initialGuardians={prismaUser.guardians} />
          <HeartbeatWidget
            webhookSecret={prismaUser.webhookSecret ?? ""}
            appUrl={process.env.NEXT_PUBLIC_SITE_URL ?? "https://arca-navy.vercel.app"}
          />
        </div>

        {/* ── Arcas (tabbed: By Person / By Category) ─────────────── */}
        <ArcasDashboard
          packs={packs as PackSummary[]}
          categories={categories}
          atPackLimit={atPackLimit}
          isPro={isPro}
        />
      </main>
    </div>
  );
}

// ── Small components ──────────────────────────────────────────────────────────

function StatCard({
  icon,
  value,
  label,
  accent,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
  accent: string;
}) {
  return (
    <Card className="border-border/50 bg-card/40 backdrop-blur-sm">
      <CardContent className="px-5 py-4 space-y-3">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-xs text-muted-foreground font-medium">{label}</span>
        </div>
        <p className={cn("text-3xl font-semibold tabular-nums", accent)}>{value}</p>
      </CardContent>
    </Card>
  );
}
