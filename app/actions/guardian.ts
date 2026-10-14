"use server";

import { redirect } from "next/navigation";
import { render } from "@react-email/render";
import { prisma } from "@/lib/prisma/client";
import { PackStatus, TriggerStatus } from "@/lib/prisma/generated";
import { resend, FROM_EMAIL, APP_URL } from "@/lib/resend";
import { ArcaDeliveryEmail } from "@/emails/ArcaDeliveryEmail";

// ─── Guardian auth model ────────────────────────────────────────────────────
// Guardians are never logged-in app users — the single-use, time-limited,
// unguessable GuardianToken.token IS the authentication. Nothing here calls
// Supabase auth.

export type GuardianActionPreview =
  | { status: "invalid" | "already_used" | "expired" }
  | {
      status: "valid";
      action: "CONFIRM_ALIVE" | "RELEASE";
      ownerName: string;
      packTitle: string;
      recipientNames: string[];
    };

// Read-only lookup — safe to call from a GET page render, including from
// automated email-link prefetch/scanners. Never marks the token used and
// never executes the action. See confirmGuardianAction for the mutating,
// POST-only half of this flow.
export async function getGuardianActionPreview(token: string): Promise<GuardianActionPreview> {
  const guardianToken = await prisma.guardianToken.findUnique({
    where: { token },
    include: {
      messagePack: {
        select: {
          title: true,
          owner: { select: { name: true } },
          recipients: { select: { name: true } },
        },
      },
    },
  });

  if (!guardianToken) return { status: "invalid" };
  if (guardianToken.usedAt) return { status: "already_used" };
  if (guardianToken.expiresAt < new Date()) return { status: "expired" };

  return {
    status: "valid",
    action: guardianToken.action,
    ownerName: guardianToken.messagePack.owner.name,
    packTitle: guardianToken.messagePack.title,
    recipientNames: guardianToken.messagePack.recipients.map((r) => r.name),
  };
}

// The actual, irreversible mutation — only ever called from the confirm
// button's form action on /guardian/action, a real user gesture via a
// Next.js Server Action (POST-only, origin-checked by the framework), never
// from a GET request. Re-validates the token fresh rather than trusting
// the page's earlier preview.
export async function confirmGuardianAction(token: string): Promise<void> {
  const guardianToken = await prisma.guardianToken.findUnique({
    where: { token },
    include: {
      messagePack: {
        select: {
          id: true,
          status: true,
          livingLinkHash: true,
          owner: { select: { id: true, name: true } },
          triggerCondition: { select: { id: true } },
          recipients: { select: { name: true, email: true } },
        },
      },
    },
  });

  if (!guardianToken) redirect(`${APP_URL}/guardian/confirmed?status=invalid`);
  if (guardianToken.usedAt) redirect(`${APP_URL}/guardian/confirmed?status=already_used`);
  if (guardianToken.expiresAt < new Date()) redirect(`${APP_URL}/guardian/confirmed?status=expired`);

  const pack = guardianToken.messagePack;

  // Mark the token as used regardless of outcome
  await prisma.guardianToken.update({
    where: { id: guardianToken.id },
    data: { usedAt: new Date() },
  });

  if (guardianToken.action === "CONFIRM_ALIVE") {
    if (pack.status === PackStatus.PENDING_GUARDIAN_APPROVAL) {
      await prisma.$transaction(async (tx) => {
        await tx.messagePack.update({
          where: { id: pack.id },
          data: { status: PackStatus.ACTIVE },
        });
        if (pack.triggerCondition?.id) {
          await tx.triggerCondition.update({
            where: { id: pack.triggerCondition.id },
            data: { status: TriggerStatus.PENDING, triggeredAt: null },
          });
        }
        await tx.user.update({
          where: { id: pack.owner.id },
          data: { lastActiveAt: new Date() },
        });
      });
    }
    redirect(`${APP_URL}/guardian/confirmed?status=confirmed_alive`);
  }

  if (guardianToken.action === "RELEASE") {
    if (
      pack.status === PackStatus.PENDING_GUARDIAN_APPROVAL ||
      pack.status === PackStatus.GRACE_PERIOD
    ) {
      await prisma.$transaction(async (tx) => {
        await tx.messagePack.update({
          where: { id: pack.id },
          data: { status: PackStatus.TRIGGERED },
        });
        if (pack.triggerCondition?.id) {
          await tx.triggerCondition.update({
            where: { id: pack.triggerCondition.id },
            data: { status: TriggerStatus.EXECUTED },
          });
        }
      });

      for (const recipient of pack.recipients) {
        if (!recipient.email) continue;
        try {
          const html = await render(
            ArcaDeliveryEmail({
              recipientName: recipient.name,
              ownerName: pack.owner.name ?? "Someone",
              livingLinkUrl: `${APP_URL}/arca/${pack.livingLinkHash}`,
            })
          );
          await resend.emails.send({
            from: FROM_EMAIL,
            to: recipient.email,
            subject: `${pack.owner.name ?? "Someone"} has entrusted you with an Arca`,
            html,
          });
        } catch (err) {
          console.error("[guardian/release] Failed to send delivery email:", err);
        }
      }
    }
    redirect(`${APP_URL}/guardian/confirmed?status=released`);
  }

  redirect(`${APP_URL}/guardian/confirmed?status=invalid`);
}
