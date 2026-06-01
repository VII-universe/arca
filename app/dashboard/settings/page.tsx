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
      settings: true,
    },
  });

  return (
    <SettingsClient
      user={{
        name: dbUser?.name ?? "",
        email: dbUser?.email ?? user.email ?? "",
        lastActiveAt: (dbUser?.lastActiveAt ?? new Date()).toISOString(),
        isPremium: dbUser?.isPremium ?? false,
        webhookSecret: dbUser?.webhookSecret ?? "",
        settings: dbUser?.settings
          ? {
              switchEnabled: dbUser.settings.switchEnabled,
              switchType: dbUser.settings.switchType as "INACTIVITY" | "SPECIFIC_DATE",
              inactivityDays: dbUser.settings.inactivityDays,
              executeAt: dbUser.settings.executeAt?.toISOString() ?? null,
              gracePeriodDays: dbUser.settings.gracePeriodDays,
            }
          : null,
      }}
    />
  );
}
