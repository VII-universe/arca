import { prisma } from "@/lib/prisma/client";

// Using the app counts as being here. Supabase sessions last a long time, so
// "signed in" alone (sync-user / auth callback) isn't enough: someone who
// opens the dashboard every week without ever re-entering a password would
// otherwise look inactive, and their "after a long silence" messages would
// start asking guardians while they're perfectly fine.
//
// Throttled to one write per TOUCH_INTERVAL — the WHERE clause makes this a
// no-op on almost every request.
const TOUCH_INTERVAL_MS = 12 * 60 * 60 * 1000;

export async function touchLastActive(userId: string): Promise<void> {
  const now = new Date();
  await prisma.user.updateMany({
    where: { id: userId, lastActiveAt: { lt: new Date(now.getTime() - TOUCH_INTERVAL_MS) } },
    data: { lastActiveAt: now },
  });
}
