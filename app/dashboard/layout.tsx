import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";
import { resolveUser } from "@/lib/auth/user";
import ArcaSidebar from "@/components/layout/ArcaSidebar";

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

  // All DB queries wrapped in try/catch — a DB hiccup must never crash the whole layout
  let user: Awaited<ReturnType<typeof resolveUser>> | null = null;
  let packCount = 0;
  let guardianCount = 0;
  let recentRecipients: { id: string; name: string; initials: string; tone: string; messageCount: number }[] = [];
  let contactGroups: { id: string; name: string; color: string; emoji: string | null }[] = [];

  try {
    [user, packCount, guardianCount, contactGroups] = await Promise.all([
      resolveUser(authUser),
      prisma.messagePack.count({ where: { ownerId: authUser.id } }),
      prisma.guardian.count({ where: { userId: authUser.id } }),
      prisma.contactGroup.findMany({
        where: { userId: authUser.id },
        orderBy: { createdAt: "asc" },
        select: { id: true, name: true, color: true, emoji: true },
      }),
    ]);
  } catch (err) {
    console.error("[dashboard/layout] DB error:", err);
    // Keep going with defaults — children will handle their own data
  }

  // Recipients separately so a failure here doesn't block the rest
  try {
    const rawRecipients = await prisma.recipient.findMany({
      where: { messagePack: { ownerId: authUser.id } },
      orderBy: { createdAt: "asc" },
      take: 30,
      select: { id: true, name: true, email: true },
    });
    const seen = new Set<string>();
    for (const r of rawRecipients) {
      if (recentRecipients.length >= 5) break;
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
  } catch (err) {
    console.error("[dashboard/layout] recipients error:", err);
  }

  // If user is still null (DB totally unreachable), create a minimal shell
  if (!user) {
    return (
      <div className="arca-app" data-arca-theme="">
        <aside className="arca-side" style={{ display: "flex", flexDirection: "column", padding: "22px 18px" }}>
          <div className="arca-brand">
            <div className="mark">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M5 18c0-7 3-12 7-12s7 5 7 12" stroke="rgba(255,255,255,0.5)" strokeWidth="1.8" strokeLinecap="round"/>
                <circle cx="12" cy="19" r="1.5" fill="var(--accent)"/>
              </svg>
            </div>
            <div className="name">arc<em>a</em></div>
          </div>
        </aside>
        <main className="arca-main">{children}</main>
      </div>
    );
  }

  return (
    <div className="arca-app" data-arca-theme="">
      <ArcaSidebar
        user={user}
        packCount={packCount}
        guardianCount={guardianCount}
        recentRecipients={recentRecipients}
        contactGroups={contactGroups}
      />
      <main className="arca-main">
        {children}
      </main>
    </div>
  );
}
