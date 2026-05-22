import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";
import VaultClient from "@/components/arca/VaultClient";
import type { VaultPerson, VaultGroup } from "@/components/arca/VaultClient";

export const metadata = { title: "Schránka — ARCA" };

const IcPlus = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 5v14M5 12h14"/>
  </svg>
);
const IcSparkle = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 4v4M12 16v4M4 12h4M16 12h4M6.5 6.5l2.8 2.8M14.7 14.7l2.8 2.8M17.5 6.5l-2.8 2.8M9.3 14.7L6.5 17.5"/>
  </svg>
);

function Topbar() {
  return (
    <div className="arca-topbar">
      <div className="arca-topbar__crumbs">
        <span style={{ fontFamily: "var(--f-serif)", fontStyle: "italic", color: "var(--accent)" }}>arca</span>
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}><path d="M9 6l6 6-6 6"/></svg>
          <span className="here">Schránka</span>
        </span>
      </div>
    </div>
  );
}

export default async function VaultPage({
  searchParams,
}: {
  searchParams: Promise<{ group?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) redirect("/login");

  const { group: initialGroupId } = await searchParams;

  const [allRecipients, groups] = await Promise.all([
    prisma.recipient.findMany({
      where: { messagePack: { ownerId: authUser.id } },
      select: {
        id: true, name: true, email: true, phone: true,
        groupId: true,
        group: { select: { id: true, name: true, color: true, emoji: true } },
        messagePack: {
          select: {
            id: true, type: true, status: true,
            triggerCondition: { select: { executeAtDate: true } },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.contactGroup.findMany({
      where: { userId: authUser.id },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, color: true, emoji: true },
    }),
  ]);

  // Deduplicate recipients → persons
  const personMap = new Map<string, VaultPerson>();
  for (const r of allRecipients) {
    const key = r.email ?? r.name;
    if (!personMap.has(key)) {
      personMap.set(key, {
        id: r.id,
        name: r.name,
        email: r.email,
        packs: [],
        groupId: r.groupId,
        group: r.group,
      });
    }
    const person = personMap.get(key)!;
    if (!person.packs.find(p => p.id === r.messagePack.id)) {
      person.packs.push({
        id: r.messagePack.id,
        type: r.messagePack.type,
        status: r.messagePack.status,
        executeAtDate: r.messagePack.triggerCondition?.executeAtDate ?? null,
      });
    }
  }

  const people = Array.from(personMap.values()).sort((a, b) => a.name.localeCompare(b.name, "cs"));

  return (
    <>
      <Topbar />
      <div className="arca-inner arca-fade-in" style={{ color: "var(--ink)" }}>
        <div className="arca-row arca-between" style={{ marginBottom: 8 }}>
          <div>
            <div className="arca-kicker">Schránka</div>
            <h1 className="arca-h1" style={{ marginTop: 8 }}>Komu zanecháváš <em>stopu.</em></h1>
          </div>
          <Link href="/dashboard/arca/new" className="arca-btn arca-btn--primary">
            <IcPlus /> Nová zpráva
          </Link>
        </div>

        <p className="arca-sub" style={{ maxWidth: 540, marginBottom: 24 }}>
          Každý člověk má vlastní schránku. Otevři kohokoli a uvidíš zprávy, fotky a vzpomínky, které ho jednou najdou.
        </p>

        <VaultClient
          initialPeople={people}
          initialGroups={groups as VaultGroup[]}
          initialGroupId={initialGroupId}
        />

        {/* Tip */}
        <div className="arca-card flat" style={{ background: "var(--bg-tint)", border: "none", marginTop: 32, padding: "20px 24px", display: "flex", alignItems: "center", gap: 16 }}>
          <IcSparkle />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 550, fontSize: 14 }}>Tip pro psaní</div>
            <p className="arca-sub" style={{ fontSize: 12.5, margin: "2px 0 0" }}>
              Nemusíš psát nic velkého. Často stačí jedna věta a vůně okamžiku.
            </p>
          </div>
          <Link href="/dashboard/arca/new" className="arca-btn sm arca-btn--outline">Začít psát</Link>
        </div>
      </div>
    </>
  );
}
