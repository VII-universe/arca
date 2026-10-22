import { render } from "@react-email/render";
import { prisma } from "@/lib/prisma/client";
import { resend, FROM_EMAIL, APP_URL } from "@/lib/resend";
import { PackStatus, TriggerStatus } from "@/lib/prisma/generated";
import { GracePeriodWarningEmail } from "@/emails/GracePeriodWarningEmail";
import { GuardianAlertEmail } from "@/emails/GuardianAlertEmail";

// One path for every "deliver after a long silence" pack — per-pack
// INACTIVITY triggers, "sealed" (MANUAL_EMERGENCY) packs from the composer,
// and the global inactivity switch (cron/pulse) all go through here, so
// guardians are always asked first and the owner is always warned.

// Fallback when neither the trigger nor the user's settings say how long a
// silence counts as "gone" — matches the UserSettings.inactivityDays default.
export const DEFAULT_INACTIVITY_DAYS = 90;
const GUARDIAN_LINK_HOURS = 72;

export interface InactivityPack {
  id: string;
  title: string;
  triggerConditionId: string;
  gracePeriodDays: number;
  owner: {
    email: string;
    name: string | null;
    guardians: { id: string; name: string; email: string }[];
  };
}

export interface InactivityStartResult {
  /** false when the pack was no longer ACTIVE (another cron got there first). */
  started: boolean;
  mode: "guardians" | "grace" | null;
  emailsSent: number;
}

export async function startInactivityDelivery(pack: InactivityPack, now: Date): Promise<InactivityStartResult> {
  const hasGuardians = pack.owner.guardians.length > 0;
  const nextStatus = hasGuardians ? PackStatus.PENDING_GUARDIAN_APPROVAL : PackStatus.GRACE_PERIOD;

  // Claim the pack atomically: only an ACTIVE pack moves on. process-triggers
  // and pulse both run at the top of the hour and can see the same pack —
  // whichever claims it first sends the emails, the other does nothing.
  const claimed = await prisma.$transaction(async (tx) => {
    const { count } = await tx.messagePack.updateMany({
      where: { id: pack.id, status: PackStatus.ACTIVE },
      data: { status: nextStatus },
    });
    if (count === 0) return false;
    await tx.triggerCondition.update({
      where: { id: pack.triggerConditionId },
      data: { status: TriggerStatus.IN_GRACE_PERIOD, triggeredAt: now },
    });
    return true;
  });
  if (!claimed) return { started: false, mode: null, emailsSent: 0 };

  let emailsSent = 0;
  const ownerName = pack.owner.name ?? "Someone";

  if (hasGuardians) {
    const expiresAt = new Date(now.getTime() + GUARDIAN_LINK_HOURS * 60 * 60 * 1000);
    for (const guardian of pack.owner.guardians) {
      try {
        const [confirmToken, releaseToken] = await prisma.$transaction([
          prisma.guardianToken.create({
            data: { guardianId: guardian.id, packId: pack.id, action: "CONFIRM_ALIVE", expiresAt },
          }),
          prisma.guardianToken.create({
            data: { guardianId: guardian.id, packId: pack.id, action: "RELEASE", expiresAt },
          }),
        ]);
        const html = await render(
          GuardianAlertEmail({
            guardianName: guardian.name,
            ownerName: pack.owner.name ?? "the owner",
            packTitle: pack.title,
            confirmAliveUrl: `${APP_URL}/guardian/action?token=${confirmToken.token}`,
            releaseUrl: `${APP_URL}/guardian/action?token=${releaseToken.token}`,
            expiresInHours: GUARDIAN_LINK_HOURS,
          })
        );
        const { error } = await resend.emails.send({
          from: FROM_EMAIL,
          to: guardian.email,
          subject: `${ownerName} may need your help — Guardian action required`,
          html,
        });
        if (error) throw new Error(error.message);
        emailsSent++;
      } catch (err) {
        console.error(`[inactivity] Failed to send guardian email to ${guardian.email} for pack ${pack.id}:`, err);
      }
    }
    return { started: true, mode: "guardians", emailsSent };
  }

  if (pack.owner.email) {
    try {
      const html = await render(
        GracePeriodWarningEmail({
          userName: pack.owner.name ?? "there",
          packTitle: pack.title,
          daysLeft: pack.gracePeriodDays,
          cancelUrl: `${APP_URL}/dashboard`,
        })
      );
      const { error } = await resend.emails.send({
        from: FROM_EMAIL,
        to: pack.owner.email,
        subject: `Your Arca "${pack.title}" will be delivered in ${pack.gracePeriodDays} days`,
        html,
      });
      if (error) throw new Error(`Resend error: ${error.message}`);
      emailsSent++;
    } catch (err) {
      console.error(`[inactivity] Failed to send grace period email to ${pack.owner.email} for pack ${pack.id}:`, err);
    }
  }
  return { started: true, mode: "grace", emailsSent };
}
