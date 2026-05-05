"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";
import { ActivitySource } from "@/lib/prisma/generated";

// ─── checkIn ─────────────────────────────────────────────────────────────────
// Resets all inactivity timers by updating lastActiveAt and logging the event.
export async function checkIn(): Promise<
  { ok: true; timestamp: string } | { error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const now = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: { lastActiveAt: now },
    });
    await tx.activityLog.create({
      data: {
        userId: user.id,
        source: ActivitySource.MANUAL_CHECK_IN,
        timestamp: now,
      },
    });
  });

  revalidatePath("/dashboard");
  return { ok: true, timestamp: now.toISOString() };
}
