import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { APP_URL } from "@/lib/resend";
import { PackStatus, TriggerStatus } from "@/lib/prisma/generated";
import { render } from "@react-email/render";
import { resend, FROM_EMAIL } from "@/lib/resend";
import { ArcaDeliveryEmail } from "@/emails/ArcaDeliveryEmail";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.redirect(`${APP_URL}/guardian/confirmed?status=invalid`);
  }

  const guardianToken = await prisma.guardianToken.findUnique({
    where: { token },
    include: {
      guardian: { select: { name: true, userId: true } },
      messagePack: {
        select: {
          id: true,
          title: true,
          status: true,
          livingLinkHash: true,
          owner: { select: { id: true, name: true, email: true } },
          triggerCondition: { select: { id: true, gracePeriodDays: true } },
          recipients: { select: { name: true, email: true } },
        },
      },
    },
  });

  if (!guardianToken) {
    return NextResponse.redirect(`${APP_URL}/guardian/confirmed?status=invalid`);
  }

  if (guardianToken.usedAt) {
    return NextResponse.redirect(`${APP_URL}/guardian/confirmed?status=already_used`);
  }

  if (guardianToken.expiresAt < new Date()) {
    return NextResponse.redirect(`${APP_URL}/guardian/confirmed?status=expired`);
  }

  const pack = guardianToken.messagePack;

  // Mark the token as used regardless of outcome
  await prisma.guardianToken.update({
    where: { id: guardianToken.id },
    data: { usedAt: new Date() },
  });

  if (guardianToken.action === "CONFIRM_ALIVE") {
    // Guardian says the owner is fine — reset inactivity timer and revert pack to ACTIVE
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
        // Reset the owner's lastActiveAt so inactivity clock restarts
        await tx.user.update({
          where: { id: pack.owner.id },
          data: { lastActiveAt: new Date() },
        });
      });
    }
    return NextResponse.redirect(`${APP_URL}/guardian/confirmed?status=confirmed_alive`);
  }

  if (guardianToken.action === "RELEASE") {
    // Guardian authorises immediate delivery
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

      // Send delivery emails to all recipients
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
          console.error(`[guardian/release] Failed to send delivery email:`, err);
        }
      }
    }
    return NextResponse.redirect(`${APP_URL}/guardian/confirmed?status=released`);
  }

  return NextResponse.redirect(`${APP_URL}/guardian/confirmed?status=invalid`);
}
