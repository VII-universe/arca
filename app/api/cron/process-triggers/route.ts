import { NextRequest, NextResponse } from "next/server";
import { render } from "@react-email/render";
import { prisma } from "@/lib/prisma/client";
import { resend, FROM_EMAIL, APP_URL } from "@/lib/resend";
import { PackStatus, TriggerStatus } from "@/lib/prisma/generated";
import { GracePeriodWarningEmail } from "@/emails/GracePeriodWarningEmail";
import { ArcaDeliveryEmail } from "@/emails/ArcaDeliveryEmail";

// ─── Auth guard ───────────────────────────────────────────────────────────────

function isAuthorized(request: NextRequest): boolean {
  const header = request.headers.get("Authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  const secret = process.env.CRON_SECRET;
  if (!secret || !token || token.length !== secret.length) return false;
  let mismatch = 0;
  for (let i = 0; i < token.length; i++) {
    mismatch |= token.charCodeAt(i) ^ secret.charCodeAt(i);
  }
  return mismatch === 0;
}

// ─── Date math helper ─────────────────────────────────────────────────────────

function daysSince(date: Date, now: Date): number {
  return (now.getTime() - date.getTime()) / 86_400_000;
}

// ─── Email helpers ────────────────────────────────────────────────────────────

async function sendGracePeriodWarning(params: {
  toEmail: string;
  userName: string;
  packTitle: string;
  packId: string;
  daysLeft: number;
}) {
  const cancelUrl = `${APP_URL}/dashboard`;
  const html = await render(
    GracePeriodWarningEmail({
      userName: params.userName,
      packTitle: params.packTitle,
      daysLeft: params.daysLeft,
      cancelUrl,
    })
  );
  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: params.toEmail,
    subject: `Your Arca "${params.packTitle}" will be delivered in ${params.daysLeft} days`,
    html,
  });
  if (error) throw new Error(`Resend error: ${error.message}`);
}

async function sendArcaDelivery(params: {
  toEmail: string;
  recipientName: string;
  ownerName: string;
  livingLinkHash: string;
}) {
  const livingLinkUrl = `${APP_URL}/arca/${params.livingLinkHash}`;
  const html = await render(
    ArcaDeliveryEmail({
      recipientName: params.recipientName,
      ownerName: params.ownerName,
      livingLinkUrl,
    })
  );
  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: params.toEmail,
    subject: `${params.ownerName} has entrusted you with an Arca`,
    html,
  });
  if (error) throw new Error(`Resend error: ${error.message}`);
}

// ─── GET handler ─────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const runAt = now.toISOString();

  const results = {
    sweepA: { found: 0, triggered: 0, emails_sent: 0, error: null as string | null },
    sweepB: { found: 0, entered_grace: 0, emails_sent: 0, error: null as string | null },
    sweepC: { found: 0, triggered: 0, emails_sent: 0, error: null as string | null },
  };

  // ── Sweep A: SPECIFIC_DATE time capsules past their delivery date ─────────

  try {
    const datePacks = await prisma.messagePack.findMany({
      where: {
        status: PackStatus.ACTIVE,
        triggerCondition: {
          type: "SPECIFIC_DATE",
          status: TriggerStatus.PENDING,
          executeAtDate: { lte: now },
        },
      },
      select: {
        id: true,
        title: true,
        livingLinkHash: true,
        owner: { select: { name: true } },
        triggerCondition: { select: { id: true } },
        recipients: { select: { name: true, email: true } },
      },
    });

    results.sweepA.found = datePacks.length;

    if (datePacks.length > 0) {
      const packIds = datePacks.map((p) => p.id);
      const triggerIds = datePacks
        .map((p) => p.triggerCondition?.id)
        .filter((id): id is string => !!id);

      await prisma.$transaction(async (tx) => {
        await tx.messagePack.updateMany({
          where: { id: { in: packIds } },
          data: { status: PackStatus.TRIGGERED },
        });
        await tx.triggerCondition.updateMany({
          where: { id: { in: triggerIds } },
          data: { status: TriggerStatus.EXECUTED },
        });
      });

      results.sweepA.triggered = packIds.length;

      // Send delivery emails to recipients — failures do not affect DB state
      for (const pack of datePacks) {
        const ownerName = pack.owner?.name ?? "Someone";
        for (const recipient of pack.recipients) {
          if (!recipient.email) continue;
          try {
            await sendArcaDelivery({
              toEmail: recipient.email,
              recipientName: recipient.name,
              ownerName,
              livingLinkHash: pack.livingLinkHash,
            });
            results.sweepA.emails_sent++;
          } catch (emailErr) {
            console.error(
              `[cron/sweepA] Failed to send delivery email to ${recipient.email} for pack ${pack.id}:`,
              emailErr
            );
          }
        }
      }
    }
  } catch (err) {
    results.sweepA.error = err instanceof Error ? err.message : "Unknown error";
    console.error("[cron/sweepA]", err);
  }

  // ── Sweep B: INACTIVITY dead-man switch → GRACE_PERIOD ───────────────────

  try {
    const inactivityPacks = await prisma.messagePack.findMany({
      where: {
        status: PackStatus.ACTIVE,
        triggerCondition: {
          type: "INACTIVITY",
          status: TriggerStatus.PENDING,
        },
      },
      select: {
        id: true,
        title: true,
        owner: { select: { email: true, name: true, lastActiveAt: true } },
        triggerCondition: {
          select: { id: true, inactivityDaysLimit: true, gracePeriodDays: true },
        },
      },
    });

    results.sweepB.found = inactivityPacks.length;

    const toEnterGrace = inactivityPacks.filter((pack) => {
      const limit = pack.triggerCondition?.inactivityDaysLimit;
      if (!limit || !pack.owner) return false;
      return daysSince(pack.owner.lastActiveAt, now) >= limit;
    });

    if (toEnterGrace.length > 0) {
      const packIds = toEnterGrace.map((p) => p.id);
      const triggerIds = toEnterGrace
        .map((p) => p.triggerCondition?.id)
        .filter((id): id is string => !!id);

      await prisma.$transaction(async (tx) => {
        await tx.messagePack.updateMany({
          where: { id: { in: packIds } },
          data: { status: PackStatus.GRACE_PERIOD },
        });
        await tx.triggerCondition.updateMany({
          where: { id: { in: triggerIds } },
          data: {
            status: TriggerStatus.IN_GRACE_PERIOD,
            triggeredAt: now,
          },
        });
      });

      results.sweepB.entered_grace = toEnterGrace.length;

      // Send grace period warning to each pack owner — failures do not affect DB state
      for (const pack of toEnterGrace) {
        if (!pack.owner?.email) continue;
        const daysLeft = pack.triggerCondition?.gracePeriodDays ?? 14;
        try {
          await sendGracePeriodWarning({
            toEmail: pack.owner.email,
            userName: pack.owner.name ?? "there",
            packTitle: pack.title,
            packId: pack.id,
            daysLeft,
          });
          results.sweepB.emails_sent++;
        } catch (emailErr) {
          console.error(
            `[cron/sweepB] Failed to send grace period email to ${pack.owner.email} for pack ${pack.id}:`,
            emailErr
          );
        }
      }
    }
  } catch (err) {
    results.sweepB.error = err instanceof Error ? err.message : "Unknown error";
    console.error("[cron/sweepB]", err);
  }

  // ── Sweep C: Grace period expiration → TRIGGERED ──────────────────────────

  try {
    const gracePacks = await prisma.messagePack.findMany({
      where: {
        status: PackStatus.GRACE_PERIOD,
        triggerCondition: { status: TriggerStatus.IN_GRACE_PERIOD },
      },
      select: {
        id: true,
        livingLinkHash: true,
        owner: { select: { name: true } },
        triggerCondition: {
          select: { id: true, triggeredAt: true, gracePeriodDays: true },
        },
        recipients: { select: { name: true, email: true } },
      },
    });

    results.sweepC.found = gracePacks.length;

    const expired = gracePacks.filter((pack) => {
      const { triggeredAt, gracePeriodDays } = pack.triggerCondition ?? {};
      if (!triggeredAt || gracePeriodDays == null) return false;
      return daysSince(triggeredAt, now) >= gracePeriodDays;
    });

    if (expired.length > 0) {
      const packIds = expired.map((p) => p.id);
      const triggerIds = expired
        .map((p) => p.triggerCondition?.id)
        .filter((id): id is string => !!id);

      await prisma.$transaction(async (tx) => {
        await tx.messagePack.updateMany({
          where: { id: { in: packIds } },
          data: { status: PackStatus.TRIGGERED },
        });
        await tx.triggerCondition.updateMany({
          where: { id: { in: triggerIds } },
          data: { status: TriggerStatus.EXECUTED },
        });
      });

      results.sweepC.triggered = expired.length;

      // Send delivery emails to recipients — failures do not affect DB state
      for (const pack of expired) {
        const ownerName = pack.owner?.name ?? "Someone";
        for (const recipient of pack.recipients) {
          if (!recipient.email) continue;
          try {
            await sendArcaDelivery({
              toEmail: recipient.email,
              recipientName: recipient.name,
              ownerName,
              livingLinkHash: pack.livingLinkHash,
            });
            results.sweepC.emails_sent++;
          } catch (emailErr) {
            console.error(
              `[cron/sweepC] Failed to send delivery email to ${recipient.email} for pack ${pack.id}:`,
              emailErr
            );
          }
        }
      }
    }
  } catch (err) {
    results.sweepC.error = err instanceof Error ? err.message : "Unknown error";
    console.error("[cron/sweepC]", err);
  }

  const hasErrors = Object.values(results).some((s) => s.error);

  return NextResponse.json(
    { ok: !hasErrors, runAt, results },
    { status: hasErrors ? 207 : 200 }
  );
}
