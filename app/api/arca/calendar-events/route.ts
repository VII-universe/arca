import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";

export type CalEvent = {
  id: string;
  label: string;
  type: "pack" | "birthday" | "anniversary";
  packId?: string;
  recipientId?: string;
  tone: "clay" | "sage" | "sky";
  recurring: boolean;
};

export type CalendarPayload = {
  eventsByDay: Record<number, CalEvent[]>;
  upcoming: { id: string; title: string; recipientName: string | null; date: string; packType: string }[];
};

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sp = new URL(req.url).searchParams;
  const year  = parseInt(sp.get("year")  ?? String(new Date().getFullYear()));
  const month = parseInt(sp.get("month") ?? String(new Date().getMonth())); // 0-indexed

  if (isNaN(year) || isNaN(month) || month < 0 || month > 11) {
    return NextResponse.json({ error: "Invalid params" }, { status: 400 });
  }

  const rangeStart = new Date(year, month, 1);
  const rangeEnd   = new Date(year, month + 1, 0, 23, 59, 59);

  const [packs, recipients, upcomingPacks] = await Promise.all([
    // Packs with a SPECIFIC_DATE trigger falling in this month
    prisma.messagePack.findMany({
      where: {
        ownerId: user.id,
        triggerCondition: { type: "SPECIFIC_DATE", executeAtDate: { gte: rangeStart, lte: rangeEnd } },
      },
      select: {
        id: true, title: true, type: true,
        recipients: { select: { id: true, name: true }, take: 1 },
        triggerCondition: { select: { executeAtDate: true } },
      },
      orderBy: { triggerCondition: { executeAtDate: "asc" } },
    }),

    // All recipients with birthday/anniversary (deduplicate in JS)
    prisma.recipient.findMany({
      where: {
        messagePack: { ownerId: user.id },
        OR: [{ birthday: { not: null } }, { anniversary: { not: null } }],
      },
      select: { id: true, name: true, email: true, relationship: true, birthday: true, anniversary: true },
    }),

    // Next 6 upcoming packs from today (for sidebar)
    prisma.messagePack.findMany({
      where: {
        ownerId: user.id,
        triggerCondition: { type: "SPECIFIC_DATE", executeAtDate: { gte: new Date() } },
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

  const eventsByDay: Record<number, CalEvent[]> = {};

  const push = (day: number, ev: CalEvent) => {
    if (!eventsByDay[day]) eventsByDay[day] = [];
    eventsByDay[day].push(ev);
  };

  // Pack events
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

  // Birthday / anniversary events — dedupe in JS, safe Date coercion
  const apiSeen = new Set<string>();
  for (const r of recipients) {
    const personKey = r.email ?? r.name;
    if (apiSeen.has(personKey)) continue;
    apiSeen.add(personKey);
    if (r.birthday && new Date(r.birthday).getMonth() === month) {
      push(new Date(r.birthday).getDate(), {
        id: `bday-${r.id}`,
        label: r.name + (r.relationship ? ` (${r.relationship})` : ""),
        type: "birthday",
        recipientId: r.id,
        tone: "clay",
        recurring: true,
      });
    }
    if (r.anniversary && new Date(r.anniversary).getMonth() === month) {
      push(new Date(r.anniversary).getDate(), {
        id: `anniv-${r.id}`,
        label: r.name + (r.relationship ? ` (${r.relationship})` : ""),
        type: "anniversary",
        recipientId: r.id,
        tone: "sage",
        recurring: true,
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

  return NextResponse.json({ eventsByDay, upcoming } satisfies CalendarPayload);
}
