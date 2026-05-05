import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArchiveX,
  ChevronRight,
  Plus,
  Shield,
  Zap,
  Clock,
  Fingerprint,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";
import { signOut } from "@/app/actions/auth";
import CheckInButton from "@/components/dashboard/CheckInButton";
import GracePeriodBanner, {
  type GracePack,
} from "@/components/dashboard/GracePeriodBanner";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const metadata = { title: "Dashboard — ARCA" };

// ── Status config ─────────────────────────────────────────────────────────────

type PackStatus = "DRAFT" | "ACTIVE" | "GRACE_PERIOD" | "TRIGGERED" | "DELIVERED" | "ARCHIVED";

const STATUS_CONFIG: Record<PackStatus, {
  label: string;
  dot: string;
  badge: string;
  pulse?: boolean;
}> = {
  DRAFT: {
    label: "Draft",
    dot: "bg-zinc-600",
    badge: "border-zinc-800 bg-zinc-900/60 text-zinc-500",
  },
  ACTIVE: {
    label: "Active",
    dot: "bg-emerald-500",
    badge: "border-emerald-900/60 bg-emerald-950/40 text-emerald-400",
    pulse: true,
  },
  GRACE_PERIOD: {
    label: "Grace Period",
    dot: "bg-amber-500",
    badge: "border-amber-900/60 bg-amber-950/40 text-amber-400",
    pulse: true,
  },
  TRIGGERED: {
    label: "Triggered",
    dot: "bg-orange-500",
    badge: "border-orange-900/60 bg-orange-950/40 text-orange-400",
  },
  DELIVERED: {
    label: "Delivered",
    dot: "bg-blue-500",
    badge: "border-blue-900/60 bg-blue-950/40 text-blue-400",
  },
  ARCHIVED: {
    label: "Archived",
    dot: "bg-zinc-700",
    badge: "border-zinc-800 bg-zinc-900/40 text-zinc-600",
  },
};

const TYPE_CONFIG = {
  EMOTIONAL: { icon: "✦", color: "text-rose-500/70", label: "Emotional" },
  PRACTICAL: { icon: "⬡", color: "text-blue-500/70", label: "Practical" },
};

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) redirect("/login");

  const [prismaUser, packs] = await Promise.all([
    prisma.user.upsert({
      where: { id: authUser.id },
      update: {},
      create: {
        id: authUser.id,
        email: authUser.email ?? "",
        name:
          authUser.user_metadata?.full_name ??
          authUser.email?.split("@")[0] ??
          "User",
        lastActiveAt: new Date(),
      },
      select: { id: true, email: true, name: true, lastActiveAt: true },
    }),
    prisma.messagePack.findMany({
      where: { ownerId: authUser.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        type: true,
        status: true,
        createdAt: true,
        _count: { select: { contents: true, recipients: true } },
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

  return (
    <div className="min-h-screen bg-background">

      {/* ── Top bar ────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-20 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="mx-auto max-w-3xl px-6 md:px-8 py-3.5 flex items-center justify-between">
          <Link
            href="/"
            className="text-sm font-semibold tracking-[0.18em] uppercase text-muted-foreground hover:text-foreground transition-colors duration-300"
          >
            ARCA
          </Link>
          <div className="flex items-center gap-2">
            <span className="hidden sm:block text-xs text-muted-foreground/60">
              {prismaUser.email}
            </span>
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

      <main className="mx-auto max-w-3xl px-6 py-10 md:px-8 space-y-6">

        {/* ── Grace period alerts ────────────────────────────────────── */}
        {gracePacks.length > 0 && <GracePeriodBanner packs={gracePacks} />}

        {/* ── Greeting ───────────────────────────────────────────────── */}
        <div>
          <h1 className="font-serif text-2xl text-foreground">
            Good to see you, {firstName}.
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {activePacks > 0
              ? `${activePacks} ${activePacks === 1 ? "Arca" : "Arcas"} sealed and monitoring.`
              : "Everything is waiting for you."}
          </p>
        </div>

        {/* ── Stats row ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-3">
          <StatCard
            icon={<Shield className="size-3.5 text-emerald-500" />}
            value={packs.filter((p) => p.status === "ACTIVE").length}
            label="Active"
          />
          <StatCard
            icon={<Fingerprint className="size-3.5 text-zinc-500" />}
            value={packs.length}
            label="Total"
          />
          <StatCard
            icon={<Zap className="size-3.5 text-orange-500" />}
            value={packs.filter((p) => p.status === "TRIGGERED" || p.status === "DELIVERED").length}
            label="Delivered"
          />
        </div>

        {/* ── Check-in panel ─────────────────────────────────────────── */}
        <Card className="border-border/60 bg-card/40 backdrop-blur-md">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="relative flex size-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-40" />
                  <span className="relative inline-flex rounded-full size-2 bg-emerald-500" />
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">
                  Presence monitoring
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Confirming your presence resets all inactivity timers and keeps
              your Arcas sealed.
            </p>
            <CheckInButton lastActiveAt={prismaUser.lastActiveAt} />
          </CardContent>
        </Card>

        {/* ── Pack list ───────────────────────────────────────────────── */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-[10px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">
              Your Arcas
            </h2>
            <Button asChild variant="ghost" size="xs" className="rounded-full gap-1.5 text-muted-foreground hover:text-foreground">
              <Link href="/dashboard/arca/new">
                <Plus className="size-3" />
                New
              </Link>
            </Button>
          </div>

          {packs.length === 0 ? (
            <EmptyState />
          ) : (
            <ul className="space-y-2">
              {packs.map((pack) => {
                const status = pack.status as PackStatus;
                const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.DRAFT;
                const type = TYPE_CONFIG[pack.type as keyof typeof TYPE_CONFIG];
                const triggerSummary = getTriggerSummary(pack.triggerCondition);

                return (
                  <li key={pack.id}>
                    <Link href={`/dashboard/arca/${pack.id}/edit`}>
                      <Card className="group border-border/50 bg-white/[0.03] backdrop-blur-md hover:bg-white/[0.06] hover:border-border/80 transition-all duration-500 cursor-pointer">
                        <CardContent className="flex items-center gap-4 px-5 py-4">
                          {/* Type icon */}
                          <span className={cn("shrink-0 text-sm", type.color)}>
                            {type.icon}
                          </span>

                          {/* Info */}
                          <div className="flex-1 min-w-0 space-y-1">
                            <p className="text-sm font-medium text-foreground truncate group-hover:text-foreground/90 transition-colors">
                              {pack.title}
                            </p>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[11px] text-muted-foreground">
                                {pack._count.recipients}{" "}
                                {pack._count.recipients === 1 ? "recipient" : "recipients"}
                              </span>
                              {triggerSummary && (
                                <>
                                  <span className="text-border">·</span>
                                  <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                    <Clock className="size-2.5 shrink-0" />
                                    {triggerSummary}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Status badge */}
                          <Badge
                            variant="outline"
                            className={cn(
                              "shrink-0 gap-1.5 rounded-full text-[10px] font-semibold uppercase tracking-wide py-0.5",
                              cfg.badge
                            )}
                          >
                            <span
                              className={cn(
                                "inline-block size-1.5 rounded-full shrink-0",
                                cfg.dot,
                                cfg.pulse && "animate-pulse"
                              )}
                            />
                            {cfg.label}
                          </Badge>

                          <ChevronRight className="size-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors duration-300 shrink-0" />
                        </CardContent>
                      </Card>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}

// ── Small components ──────────────────────────────────────────────────────────

function StatCard({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
}) {
  return (
    <Card className="border-border/50 bg-white/[0.03] backdrop-blur-sm">
      <CardContent className="px-4 py-3 space-y-1.5">
        <div className="flex items-center gap-1.5">
          {icon}
          <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">
            {label}
          </span>
        </div>
        <p className="text-2xl font-semibold text-foreground tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}

function EmptyState() {
  return (
    <Card className="border-border/40 bg-white/[0.02] backdrop-blur-sm">
      <CardContent className="flex flex-col items-center justify-center py-16 px-8 text-center space-y-4">
        <div className="flex size-12 items-center justify-center rounded-full border border-border/60 bg-muted/20">
          <ArchiveX className="size-5 text-muted-foreground/60" />
        </div>
        <div className="space-y-1">
          <p className="font-serif text-lg italic text-muted-foreground">
            Nothing sealed yet.
          </p>
          <p className="text-xs text-muted-foreground/60">
            Create your first Arca — a message sealed until the moment it matters.
          </p>
        </div>
        <Button asChild size="sm" className="rounded-full mt-2 gap-2">
          <Link href="/dashboard/arca/new">
            <Plus className="size-3.5" />
            Create your first Arca
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getTriggerSummary(
  trigger: {
    type: string;
    executeAtDate: Date | null;
    inactivityDaysLimit: number | null;
  } | null
): string | null {
  if (!trigger) return null;
  if (trigger.type === "SPECIFIC_DATE" && trigger.executeAtDate) {
    return `Delivers ${trigger.executeAtDate.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })}`;
  }
  if (trigger.type === "INACTIVITY" && trigger.inactivityDaysLimit) {
    return `Triggers after ${trigger.inactivityDaysLimit}d of silence`;
  }
  if (trigger.type === "MANUAL_EMERGENCY") return "Manual trigger";
  return null;
}
