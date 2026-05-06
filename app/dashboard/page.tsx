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
import GuardianManager from "@/components/dashboard/GuardianManager";
import HeartbeatWidget from "@/components/dashboard/HeartbeatWidget";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const metadata = { title: "Dashboard — ARCA" };

// ── Status config ─────────────────────────────────────────────────────────────

type PackStatus = "DRAFT" | "ACTIVE" | "GRACE_PERIOD" | "PENDING_GUARDIAN_APPROVAL" | "TRIGGERED" | "DELIVERED" | "ARCHIVED";

const STATUS_CONFIG: Record<PackStatus, {
  label: string;
  dot: string;
  badge: string;
  pulse?: boolean;
}> = {
  DRAFT: {
    label: "Draft",
    dot: "bg-zinc-500",
    badge: "border-zinc-700/60 bg-zinc-800/40 text-zinc-400",
  },
  ACTIVE: {
    label: "Active",
    dot: "bg-emerald-500",
    badge: "border-emerald-800/60 bg-emerald-950/40 text-emerald-400",
    pulse: true,
  },
  GRACE_PERIOD: {
    label: "Grace Period",
    dot: "bg-amber-500",
    badge: "border-amber-800/60 bg-amber-950/40 text-amber-400",
    pulse: true,
  },
  PENDING_GUARDIAN_APPROVAL: {
    label: "Awaiting Guardians",
    dot: "bg-violet-500",
    badge: "border-violet-800/60 bg-violet-950/40 text-violet-400",
    pulse: true,
  },
  TRIGGERED: {
    label: "Triggered",
    dot: "bg-orange-500",
    badge: "border-orange-800/60 bg-orange-950/40 text-orange-400",
  },
  DELIVERED: {
    label: "Delivered",
    dot: "bg-blue-500",
    badge: "border-blue-800/60 bg-blue-950/40 text-blue-400",
  },
  ARCHIVED: {
    label: "Archived",
    dot: "bg-zinc-600",
    badge: "border-zinc-700/40 bg-zinc-800/30 text-zinc-500",
  },
};

const TYPE_CONFIG = {
  EMOTIONAL: { icon: "✦", color: "text-rose-400/80", label: "Emotional" },
  PRACTICAL: { icon: "⬡", color: "text-sky-400/80", label: "Practical" },
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
      select: {
        id: true,
        email: true,
        name: true,
        lastActiveAt: true,
        webhookSecret: true,
        guardians: { select: { id: true, name: true, email: true }, orderBy: { createdAt: "asc" } },
      },
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

        {/* ── Pack grid — "Create New" always first ───────────────────── */}
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/40">
            Your Arcas
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* ── Create New card (always first, most prominent) ────── */}
            <Link href="/dashboard/arca/new" className="group">
              <div className={cn(
                "h-full min-h-[160px] rounded-2xl border-2 border-dashed transition-all duration-300 cursor-pointer",
                "flex flex-col items-center justify-center gap-3 p-6 text-center",
                "border-border/30 hover:border-primary/40",
                "bg-transparent hover:bg-primary/[0.03]",
                "hover:shadow-lg hover:shadow-primary/5",
                "hover:scale-[1.015]",
              )}>
                <div className={cn(
                  "rounded-full p-3 transition-all duration-300",
                  "bg-muted/60 group-hover:bg-primary/10",
                )}>
                  <Plus className="size-5 text-muted-foreground/50 group-hover:text-primary transition-colors duration-300" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors duration-200">
                    Write a new message
                  </p>
                  <p className="text-xs text-muted-foreground/50 mt-0.5">
                    Time capsule or legacy vault
                  </p>
                </div>
              </div>
            </Link>

            {packs.map((pack) => {
                const status = pack.status as PackStatus;
                const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.DRAFT;
                const type = TYPE_CONFIG[pack.type as keyof typeof TYPE_CONFIG];
                const triggerSummary = getTriggerSummary(pack.triggerCondition);

                return (
                  <Link key={pack.id} href={`/dashboard/arca/${pack.id}/edit`}>
                    <Card className="group h-full border-border/50 bg-card/40 backdrop-blur-md hover:bg-card/70 hover:border-border/80 transition-all duration-300 cursor-pointer">
                      <CardContent className="flex flex-col gap-4 px-6 py-5 h-full">

                        {/* Top row: type icon + status badge */}
                        <div className="flex items-start justify-between gap-3">
                          <span className={cn("text-xl shrink-0 mt-0.5", type.color)}>
                            {type.icon}
                          </span>
                          <Badge
                            variant="outline"
                            className={cn(
                              "shrink-0 gap-1.5 rounded-full text-[10px] font-semibold uppercase tracking-wide px-2.5 py-0.5",
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
                        </div>

                        {/* Title + meta */}
                        <div className="flex-1 space-y-1.5">
                          <p className="text-sm font-semibold text-foreground leading-snug group-hover:text-foreground/90 transition-colors">
                            {pack.title}
                          </p>
                          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                            <span className="text-[11px] text-muted-foreground">
                              {pack._count.recipients}{" "}
                              {pack._count.recipients === 1 ? "recipient" : "recipients"}
                            </span>
                            {triggerSummary && (
                              <>
                                <span className="text-border select-none">·</span>
                                <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                  <Clock className="size-2.5 shrink-0" />
                                  {triggerSummary}
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-between pt-3 border-t border-border/40">
                          <span className="text-[11px] text-muted-foreground/60 uppercase tracking-widest font-medium">
                            {type.label}
                          </span>
                          <ChevronRight className="size-4 text-muted-foreground/40 group-hover:text-muted-foreground group-hover:translate-x-0.5 transition-all duration-200 shrink-0" />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
          </div>
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

function EmptyState() {
  return (
    <Card className="border-border/40 border-dashed bg-card/20">
      <CardContent className="flex flex-col items-center justify-center py-20 px-8 text-center space-y-5">
        <div className="flex size-14 items-center justify-center rounded-full border border-border/60 bg-muted/20">
          <ArchiveX className="size-6 text-muted-foreground/50" />
        </div>
        <div className="space-y-1.5">
          <p className="font-serif text-xl italic text-muted-foreground">
            Nothing sealed yet.
          </p>
          <p className="text-sm text-muted-foreground/60 max-w-xs">
            Create your first Arca — a message sealed until the moment it matters.
          </p>
        </div>
        <Button asChild size="sm" className="rounded-full gap-2">
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
