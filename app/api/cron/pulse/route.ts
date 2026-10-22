// Hourly heartbeat — checks UserSettings global dead-man's switch.
// Complements /api/cron/process-triggers (hourly) which handles per-pack triggers.
//
// Logic:
//  1. Find users whose GLOBAL switch has fired (inactivity OR specific date)
//  2. Take their ACTIVE packs — except packs with their own SPECIFIC_DATE
//     trigger (time capsules, age milestones): those wait for their own date
//     and are delivered by process-triggers sweep A, never early just because
//     the owner went quiet.
//  3. Upsert a TriggerCondition so the hourly cron can finish the job, then:
//     - INACTIVITY switch: the same guardian-first path as per-pack inactivity
//       (lib/triggers/inactivity.ts) — guardians are asked, or the owner is
//       warned, before anything is delivered.
//     - SPECIFIC_DATE switch: a date the owner chose — straight to
//       GRACE_PERIOD, as before.
//
// Auth: Authorization: Bearer <CRON_SECRET>

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { PackStatus, TriggerStatus, ActivitySource } from "@/lib/prisma/generated";
import { startInactivityDelivery, DEFAULT_INACTIVITY_DAYS } from "@/lib/triggers/inactivity";

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
      guardians: { select: { id: true, name: true, email: true } },
      settings: {
        select: {
          switchType: true,
          inactivityDays: true,
          executeAt: true,
          gracePeriodDays: true,
        },
      },
      messagePacks: {
        where: {
          status: PackStatus.ACTIVE,
          // Explicit null branch: a pack with no trigger yet is still swept
          // (the upsert below creates one), only SPECIFIC_DATE is excluded.
          OR: [
            { triggerCondition: null },
            { triggerCondition: { type: { not: "SPECIFIC_DATE" } } },
          ],
        },
        select: { id: true, title: true },
      },
    },
  });

  // 2. Filter: only users whose switch condition has actually fired
  const triggered = candidates.filter(u => {
    const sw = u.settings!;
    if (sw.switchType === "INACTIVITY") {
      const days = (now.getTime() - u.lastActiveAt.getTime()) / 86_400_000;
      return days >= (sw.inactivityDays ?? DEFAULT_INACTIVITY_DAYS);
    }
    if (sw.switchType === "SPECIFIC_DATE" && sw.executeAt) {
      return sw.executeAt <= now;
    }
    return false;
  });

  let usersProcessed = 0;
  let packsEnteredGrace = 0;
  let packsToGuardians = 0;
  let emailsSent = 0;
  const errors: string[] = [];

  for (const u of triggered) {
    const packIds = u.messagePacks.map(p => p.id);
    if (packIds.length === 0) continue;

    const grace = u.settings?.gracePeriodDays ?? 14;
    const trigType = u.settings?.switchType === "SPECIFIC_DATE" ? "SPECIFIC_DATE" : "INACTIVITY";

    try {
      if (trigType === "INACTIVITY") {
        for (const pack of u.messagePacks) {
          const trigger = await prisma.triggerCondition.upsert({
            where: { messagePackId: pack.id },
            update: { gracePeriodDays: grace },
            create: {
              messagePackId: pack.id,
              type: "INACTIVITY",
              status: TriggerStatus.PENDING,
              gracePeriodDays: grace,
            },
            select: { id: true },
          });
          const started = await startInactivityDelivery(
            {
              id: pack.id,
              title: pack.title,
              triggerConditionId: trigger.id,
              gracePeriodDays: grace,
              owner: { email: u.email, name: u.name, guardians: u.guardians },
            },
            now
          );
          if (started.mode === "guardians") packsToGuardians++;
          if (started.mode === "grace") packsEnteredGrace++;
          emailsSent += started.emailsSent;
        }
      } else {
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
                ...(u.settings?.executeAt ? { executeAtDate: u.settings.executeAt } : {}),
              },
            });
          }
        });
        packsEnteredGrace += packIds.length;
      }

      // Audit
      await prisma.activityLog.create({
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

      usersProcessed++;
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
      packsToGuardians,
      emailsSent,
      ...(errors.length ? { errors } : {}),
    },
    { status: errors.length ? 207 : 200 }
  );
}
