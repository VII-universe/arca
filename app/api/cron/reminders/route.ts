// Weekly re-engagement reminder — nudges users who haven't touched their
// vault in a while. Unrelated to the dead-man switch (lib/cron/pulse and
// process-triggers handle that); this is a soft, occasional "come check in"
// email, not a security notice.
//
// Auth: Authorization: Bearer <CRON_SECRET>

import { NextRequest, NextResponse } from "next/server";
import { render } from "@react-email/render";
import { prisma } from "@/lib/prisma/client";
import { resend, FROM_EMAIL, APP_URL } from "@/lib/resend";
import { InactivityReminderEmail } from "@/emails/InactivityReminderEmail";
import { isAuthorizedCronRequest } from "@/lib/cron-auth";

const INACTIVITY_THRESHOLD_DAYS = 90;
const RESEND_COOLDOWN_DAYS = 30;

export async function GET(req: NextRequest) {
  if (!isAuthorizedCronRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const inactiveSince = new Date(now.getTime() - INACTIVITY_THRESHOLD_DAYS * 86_400_000);
  const cooldownSince = new Date(now.getTime() - RESEND_COOLDOWN_DAYS * 86_400_000);

  // Only users with at least one message pack — "review your vault" isn't
  // a meaningful nudge for someone who never created anything.
  const candidates = await prisma.user.findMany({
    where: {
      lastActiveAt: { lt: inactiveSince },
      OR: [{ lastReminderSentAt: null }, { lastReminderSentAt: { lt: cooldownSince } }],
      messagePacks: { some: {} },
    },
    select: { id: true, email: true, name: true, lastActiveAt: true },
  });

  let sent = 0;
  let failed = 0;

  for (const user of candidates) {
    const daysInactive = Math.floor((now.getTime() - user.lastActiveAt.getTime()) / 86_400_000);
    try {
      const html = await render(
        InactivityReminderEmail({
          userName: user.name,
          daysInactive,
          dashboardUrl: `${APP_URL}/dashboard`,
        })
      );
      const { error } = await resend.emails.send({
        from: FROM_EMAIL,
        to: user.email,
        subject: "A quick check-in on your Arca",
        html,
      });
      if (error) throw new Error(`Resend error: ${error.message}`);

      await prisma.user.update({ where: { id: user.id }, data: { lastReminderSentAt: now } });
      sent++;
    } catch (err) {
      console.error(`[cron/reminders] failed for user ${user.id}:`, err);
      failed++;
    }
  }

  return NextResponse.json({ candidates: candidates.length, sent, failed });
}
