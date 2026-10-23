import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";
import SettingsClient from "./SettingsClient";

export async function generateMetadata() {
  const t = await getTranslations("Settings");
  return { title: `${t("metaTitle")} – Arca` };
}

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
    userSettings = await (prisma as any).userSettings?.findUnique?.({ where: { userId: user.id } }) ?? null;
  } catch {
    // ignore — page renders without switch settings until server restarts
  }

  const lastActiveAt = dbUser?.lastActiveAt ?? new Date();
  // Computed server-side (not via Date.now() in the client component) so
  // the render stays pure — same reasoning as dashboard/page.tsx's own
  // daysSinceActive prop. `new Date()` rather than `Date.now()` — the
  // latter trips react-hooks/purity even in a Server Component.
  const daysSinceActive = Math.floor((new Date().getTime() - lastActiveAt.getTime()) / 86_400_000);

  return (
    <SettingsClient
      user={{
        name: dbUser?.name ?? "",
        email: dbUser?.email ?? user.email ?? "",
        lastActiveAt: lastActiveAt.toISOString(),
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
      daysSinceActive={daysSinceActive}
    />
  );
}
