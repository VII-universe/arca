import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";
import SettingsClient from "./SettingsClient";

export const metadata = { title: "Nastavení – Arca" };

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      name: true,
      email: true,
      lastActiveAt: true,
      isPremium: true,
      webhookSecret: true,
    },
  });

  // userSettings may not exist if Prisma client is stale (restart dev server to fix)
  let userSettings = null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    userSettings = await (prisma as any).userSettings?.findUnique?.({ where: { userId: user.id } }) ?? null;
  } catch {
    // ignore — page renders without switch settings until server restarts
  }

  return (
    <SettingsClient
      user={{
        name: dbUser?.name ?? "",
        email: dbUser?.email ?? user.email ?? "",
        lastActiveAt: (dbUser?.lastActiveAt ?? new Date()).toISOString(),
        isPremium: dbUser?.isPremium ?? false,
        webhookSecret: dbUser?.webhookSecret ?? "",
        settings: userSettings
          ? {
              switchEnabled: (userSettings as any).switchEnabled,
              switchType: (userSettings as any).switchType as "INACTIVITY" | "SPECIFIC_DATE",
              inactivityDays: (userSettings as any).inactivityDays,
              executeAt: (userSettings as any).executeAt?.toISOString() ?? null,
              gracePeriodDays: (userSettings as any).gracePeriodDays,
            }
          : null,
      }}
    />
  );
}
