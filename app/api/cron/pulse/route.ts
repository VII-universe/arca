// Hourly heartbeat — checks UserSettings global dead-man's switch.
// Complements /api/cron/process-triggers (daily) which handles per-pack triggers.
//
// Logic:
//  1. Find users whose GLOBAL switch has fired (inactivity OR specific date)
//  2. Move their ACTIVE packs to GRACE_PERIOD
//  3. Upsert a TriggerCondition so the daily cron can deliver after grace period
//
// Auth: Authorization: Bearer <CRON_SECRET>

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { PackStatus, TriggerStatus, ActivitySource } from "@/lib/prisma/generated";

// ── Auth (constant-time compare) ──────────────────────────────────────────────

function isAuthorized(req: NextRequest): boolean {
  const header = req.headers.get("Authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  const secret = process.env.CRON_SECRET;
  if (!secret || !token || token.length !== secret.length) return false;
  let diff = 0;
  for (let i = 0; i < token.length; i++) diff |= token.charCodeAt(i) ^ secret.charCodeAt(i);
  return diff === 0;
}

// ── GET ───────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  // 1. Candidates: users with the switch enabled
  const candidates = await prisma.user.findMany({
    where: {
      settings: {
        switchEnabled: true,
      },
    },
    select: {
      id: true,
      email: true,
      name: true,
      lastActiveAt: true,
      settings: {
        select: {
          switchType: true,
          inactivityDays: true,
          executeAt: true,
          gracePeriodDays: true,
        },
      },
      messagePacks: {
        where: { status: PackStatus.ACTIVE },
        select: { id: true },
      },
    },
  });

  // 2. Filter: only users whose switch condition has actually fired
  const triggered = candidates.filter(u => {
    const sw = u.settings!;
    if (sw.switchType === "INACTIVITY") {
      const days = (now.getTime() - u.lastActiveAt.getTime()) / 86_400_000;
      return days >= (sw.inactivityDays ?? 90);
    }
    if (sw.switchType === "SPECIFIC_DATE" && sw.executeAt) {
      return sw.executeAt <= now;
    }
    return false;
  });

  let usersProcessed = 0;
  let packsEnteredGrace = 0;
  const errors: string[] = [];

  for (const u of triggered) {
    const packIds = u.messagePacks.map(p => p.id);
    if (packIds.length === 0) continue;

    const grace = u.settings?.gracePeriodDays ?? 14;
    const trigType = u.settings?.switchType === "SPECIFIC_DATE" ? "SPECIFIC_DATE" : "INACTIVITY";

    try {
      await prisma.$transaction(async tx => {
        // Move ACTIVE packs to GRACE_PERIOD
        await tx.messagePack.updateMany({
          where: { id: { in: packIds }, status: PackStatus.ACTIVE },
          data: { status: PackStatus.GRACE_PERIOD },
        });

        // Upsert TriggerCondition so the delivery cron can finish the job
        for (const packId of packIds) {
          await tx.triggerCondition.upsert({
            where: { messagePackId: packId },
            update: {
              status: TriggerStatus.IN_GRACE_PERIOD,
              triggeredAt: now,
              gracePeriodDays: grace,
            },
            create: {
              messagePackId: packId,
              type: trigType,
              status: TriggerStatus.IN_GRACE_PERIOD,
              triggeredAt: now,
              gracePeriodDays: grace,
              ...(trigType === "SPECIFIC_DATE" && u.settings?.executeAt
                ? { executeAtDate: u.settings.executeAt }
                : {}),
            },
          });
        }

        // Audit
        await tx.activityLog.create({
          data: {
            userId: u.id,
            source: ActivitySource.PASSIVE_API_SYNC,
            timestamp: now,
            metadata: {
              event: "global_switch_fired",
              switchType: trigType,
              packCount: packIds.length,
            },
          },
        });
      });

      usersProcessed++;
      packsEnteredGrace += packIds.length;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "unknown";
      errors.push(`user:${u.id} – ${msg}`);
      console.error("[cron/pulse]", u.id, err);
    }
  }

  return NextResponse.json(
    {
      ok: errors.length === 0,
      runAt: now.toISOString(),
      candidates: candidates.length,
      usersTriggered: triggered.length,
      usersProcessed,
      packsEnteredGrace,
      ...(errors.length ? { errors } : {}),
    },
    { status: errors.length ? 207 : 200 }
  );
}
