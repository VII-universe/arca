import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";
import CalendarClient from "@/components/arca/CalendarClient";
import type { CalEvent } from "@/app/api/arca/calendar-events/route";

export const metadata = { title: "Kalendář — ARCA" };

function Topbar() {
  return (
    <div className="arca-topbar">
      <div className="arca-topbar__crumbs">
        <span style={{ fontFamily: "var(--f-serif)", fontStyle: "italic", color: "var(--accent)" }}>arca</span>
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}><path d="M9 6l6 6-6 6"/></svg>
          <span className="here">Kalendář</span>
        </span>
      </div>
    </div>
  );
}

export default async function CalendarPage() {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) redirect("/login");

  const now = new Date();
  const year  = now.getFullYear();
  const month = now.getMonth();

  const rangeStart = new Date(year, month, 1);
  const rangeEnd   = new Date(year, month + 1, 0, 23, 59, 59);

  const [packs, recipients, upcomingPacks] = await Promise.all([
    prisma.messagePack.findMany({
      where: {
        ownerId: authUser.id,
        triggerCondition: { type: "SPECIFIC_DATE", executeAtDate: { gte: rangeStart, lte: rangeEnd } },
      },
      select: {
        id: true, title: true, type: true,
        recipients: { select: { id: true, name: true }, take: 1 },
        triggerCondition: { select: { executeAtDate: true } },
      },
      orderBy: { triggerCondition: { executeAtDate: "asc" } },
    }),
    prisma.recipient.findMany({
      where: {
        messagePack: { ownerId: authUser.id },
        OR: [{ birthday: { not: null } }, { anniversary: { not: null } }],
      },
      select: { id: true, name: true, email: true, relationship: true, birthday: true, anniversary: true },
    }),
    prisma.messagePack.findMany({
      where: {
        ownerId: authUser.id,
        triggerCondition: { type: "SPECIFIC_DATE", executeAtDate: { gte: now } },
      },
      select: {
        id: true, title: true, type: true,
        recipients: { select: { name: true }, take: 1 },
        triggerCondition: { select: { executeAtDate: true } },
      },
      orderBy: { triggerCondition: { executeAtDate: "asc" } },
      take: 6,
    }),
  ]);

  // Build initial events map
  const eventsByDay: Record<number, CalEvent[]> = {};
  const push = (day: number, ev: CalEvent) => {
    if (!eventsByDay[day]) eventsByDay[day] = [];
    eventsByDay[day].push(ev);
  };

  for (const p of packs) {
    const d = p.triggerCondition?.executeAtDate;
    if (!d) continue;
    push(d.getDate(), {
      id: `pack-${p.id}`,
      label: p.recipients[0]?.name ? `${p.recipients[0].name} — ${p.title}` : p.title,
      type: "pack",
      packId: p.id,
      tone: p.type === "EMOTIONAL" ? "clay" : "sky",
      recurring: false,
    });
  }
  // In-memory dedup (same person may appear in multiple packs)
  const calSeen = new Set<string>();
  for (const r of recipients) {
    const personKey = r.email ?? r.name;
    if (calSeen.has(personKey)) continue;
    calSeen.add(personKey);
    if (r.birthday && new Date(r.birthday).getMonth() === month) {
      push(new Date(r.birthday).getDate(), {
        id: `bday-${r.id}`,
        label: r.name + (r.relationship ? ` (${r.relationship})` : ""),
        type: "birthday", recipientId: r.id, tone: "clay", recurring: true,
      });
    }
    if (r.anniversary && new Date(r.anniversary).getMonth() === month) {
      push(new Date(r.anniversary).getDate(), {
        id: `anniv-${r.id}`,
        label: r.name + (r.relationship ? ` (${r.relationship})` : ""),
        type: "anniversary", recipientId: r.id, tone: "sage", recurring: true,
      });
    }
  }

  const upcoming = upcomingPacks.map(p => ({
    id: p.id,
    title: p.title,
    recipientName: p.recipients[0]?.name ?? null,
    date: p.triggerCondition?.executeAtDate?.toISOString() ?? "",
    packType: p.type,
  }));

  return (
    <>
      <Topbar />
      <div className="arca-inner arca-fade-in">
        <div className="arca-row arca-between" style={{ marginBottom: 8 }}>
          <div>
            <div className="arca-kicker">Kalendář</div>
            <h1 className="arca-h1" style={{ marginTop: 8 }}>
              Okamžiky, které <em>se vrátí.</em>
            </h1>
          </div>
          <Link href="/dashboard/arca/new" className="arca-btn arca-btn--primary">
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
            Nová zpráva
          </Link>
        </div>

        <p className="arca-sub" style={{ maxWidth: 540, marginBottom: 28 }}>
          Narozeniny, výročí, dny, kdy chceš, aby tě někdo slyšel. Klikni na libovolný den a přidej zprávu, která tam jednou přistane.
        </p>

        <CalendarClient
          initialYear={year}
          initialMonth={month}
          initialEvents={eventsByDay}
          initialUpcoming={upcoming}
        />
      </div>
    </>
  );
}
