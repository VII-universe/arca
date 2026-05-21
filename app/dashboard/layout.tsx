import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";
import { resolveUser } from "@/lib/auth/user";
import ArcaSidebar from "@/components/layout/ArcaSidebar";

// Colour assignments by initial-hash — same logic as design
const TONES = ["clay", "sage", "sky", "ink", "clay", "sage", "sky"];
function toneFor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return TONES[Math.abs(h) % TONES.length];
}
function initials(name: string): string {
  return name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) redirect("/login");

  const [user, packCount, guardianCount, recipients] = await Promise.all([
    resolveUser(authUser),
    prisma.messagePack.count({ where: { ownerId: authUser.id } }),
    prisma.guardian.count({ where: { userId: authUser.id } }),
    prisma.recipient.findMany({
      where: { messagePack: { ownerId: authUser.id } },
      distinct: ["email"],
      orderBy: { createdAt: "asc" },
      take: 6,
      select: { id: true, name: true, email: true, messagePackId: true },
    }),
  ]);

  // Deduplicate by name+email, build recent recipient list
  const seen = new Set<string>();
  const recentRecipients: { id: string; name: string; initials: string; tone: string; messageCount: number }[] = [];
  for (const r of recipients) {
    const key = r.email ?? r.name;
    if (seen.has(key)) continue;
    seen.add(key);
    recentRecipients.push({
      id: r.id,
      name: r.name,
      initials: initials(r.name),
      tone: toneFor(r.name),
      messageCount: 0,
    });
  }

  return (
    <div className="arca-app" data-arca-theme="">
      <ArcaSidebar
        user={user}
        packCount={packCount}
        guardianCount={guardianCount}
        recentRecipients={recentRecipients}
      />
      <main className="arca-main">
        {children}
      </main>
    </div>
  );
}
