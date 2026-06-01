import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";
import SettingsClient from "./SettingsClient";

export const metadata = { title: "Nastavení – Arca" };

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [dbUser, userSettings] = await Promise.all([
    prisma.user.findUnique({
      where: { id: user.id },
      select: {
        name: true,
        email: true,
        lastActiveAt: true,
        isPremium: true,
        webhookSecret: true,
      },
    }),
    prisma.userSettings.findUnique({ where: { userId: user.id } }),
  ]);

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
              switchEnabled: userSettings.switchEnabled,
              switchType: userSettings.switchType as "INACTIVITY" | "SPECIFIC_DATE",
              inactivityDays: userSettings.inactivityDays,
              executeAt: userSettings.executeAt?.toISOString() ?? null,
              gracePeriodDays: userSettings.gracePeriodDays,
            }
          : null,
      }}
    />
  );
}
