import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";

export const metadata = { title: "Kalendář — ARCA" };

const IcPlus = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 5v14M5 12h14"/>
  </svg>
);
const IcChevron = ({ dir }: { dir: "left" | "right" }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"
    style={{ transform: dir === "left" ? "rotate(180deg)" : undefined }}>
    <path d="M9 6l6 6-6 6"/>
  </svg>
);

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

const WEEKDAYS = ["Po", "Út", "St", "Čt", "Pá", "So", "Ne"];
const MONTH_NAMES = ["Leden", "Únor", "Březen", "Duben", "Květen", "Červen", "Červenec", "Srpen", "Září", "Říjen", "Listopad", "Prosinec"];

export default async function CalendarPage() {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) redirect("/login");

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const today = now.getDate();

  // All packs with date triggers this month and next 3 months
  const rangeStart = new Date(year, month, 1);
  const rangeEnd = new Date(year, month + 3, 0);

  const packs = await prisma.messagePack.findMany({
    where: {
      ownerId: authUser.id,
      triggerCondition: {
        type: "SPECIFIC_DATE",
        executeAtDate: { gte: rangeStart, lte: rangeEnd },
      },
    },
    select: {
      id: true, title: true, type: true, status: true,
      recipients: { select: { name: true }, take: 1 },
      triggerCondition: { select: { executeAtDate: true } },
    },
    orderBy: { triggerCondition: { executeAtDate: "asc" } },
  });

  // Build calendar grid for current month
  // First day of month (0=Sun..6=Sat) → convert to Mon=0..Sun=6
  const firstDay = new Date(year, month, 1).getDay();
  const startOffset = firstDay === 0 ? 6 : firstDay - 1; // Mon-based
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const cells: { day: number; muted: boolean }[] = [];
  for (let i = startOffset - 1; i >= 0; i--) cells.push({ day: daysInPrevMonth - i, muted: true });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, muted: false });
  while (cells.length < 42) cells.push({ day: cells.length - startOffset - daysInMonth + 1, muted: true });

  // Events by day
  const eventsByDay = new Map<number, { id: string; title: string; type: string; tone: string }[]>();
  for (const pack of packs) {
    const d = pack.triggerCondition?.executeAtDate;
    if (!d) continue;
    const packYear = d.getFullYear();
    const packMonth = d.getMonth();
    if (packYear !== year || packMonth !== month) continue;
    const day = d.getDate();
    if (!eventsByDay.has(day)) eventsByDay.set(day, []);
    eventsByDay.get(day)!.push({
      id: pack.id,
      title: pack.recipients[0]?.name ? `${pack.recipients[0].name} — ${pack.title}` : pack.title,
      type: pack.type,
      tone: pack.type === "EMOTIONAL" ? "clay" : "sky",
    });
  }

  // Upcoming events for the sidebar
  const upcoming = packs.slice(0, 5);

  return (
    <>
      <Topbar />
      <div className="arca-inner arca-fade-in">
        <div className="arca-row arca-between" style={{ marginBottom: 8 }}>
          <div>
            <div className="arca-kicker">Kalendář</div>
            <h1 className="arca-h1" style={{ marginTop: 8 }}>Okamžiky, které <em>se vrátí.</em></h1>
          </div>
          <div className="arca-row" style={{ gap: 8 }}>
            <Link href="/dashboard/arca/new" className="arca-btn arca-btn--primary"><IcPlus /> Nová zpráva</Link>
          </div>
        </div>

        <p className="arca-sub" style={{ maxWidth: 540, marginBottom: 24 }}>
          Narozeniny, výročí, dny, kdy chceš, aby tě někdo slyšel. Klikni na den a přidej zprávu, která tam jednou přistane.
        </p>

        {/* Month navigation */}
        <div className="arca-row arca-between" style={{ marginBottom: 18 }}>
          <div className="arca-row" style={{ gap: 12 }}>
            <button className="arca-btn icon-btn arca-btn--outline"><IcChevron dir="left" /></button>
            <h2 className="arca-h2" style={{ margin: 0 }}>{MONTH_NAMES[month]} {year}</h2>
            <button className="arca-btn icon-btn arca-btn--outline"><IcChevron dir="right" /></button>
            <button className="arca-btn sm arca-btn--ghost">Dnes</button>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 28 }}>
          {/* Calendar */}
          <div>
            <div className="arca-cal">
              <div className="arca-cal__row arca-cal__head">
                {WEEKDAYS.map((d) => <div key={d} className="cell">{d}</div>)}
              </div>
              {Array.from({ length: 6 }).map((_, w) => (
                <div key={w} className="arca-cal__row">
                  {cells.slice(w * 7, w * 7 + 7).map((c, i) => {
                    const evs = !c.muted ? eventsByDay.get(c.day) ?? [] : [];
                    const isToday = !c.muted && c.day === today;
                    return (
                      <div key={i} className={`arca-cal__cell ${c.muted ? "muted" : ""} ${isToday ? "today" : ""}`}>
                        <span className="num">{c.day}</span>
                        {evs.map((ev, j) => (
                          <Link key={j} href={`/dashboard/arca/${ev.id}/edit`} style={{ textDecoration: "none" }}>
                            <div className={`arca-cal__pill ${ev.tone}`}>{ev.title}</div>
                          </Link>
                        ))}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Sidebar */}
          <div className="arca-stack-4">
            <div className="arca-card">
              <div style={{ padding: "20px 22px" }}>
                <div className="arca-row arca-between" style={{ marginBottom: 14 }}>
                  <h3 className="arca-h3">Dnes · {today}. {MONTH_NAMES[month].toLowerCase()}</h3>
                </div>
                {(eventsByDay.get(today) ?? []).length === 0 ? (
                  <p className="arca-sub" style={{ fontSize: 13 }}>Dnes žádné naplánované zprávy.</p>
                ) : (
                  <div className="arca-stack-3">
                    {(eventsByDay.get(today) ?? []).map((ev) => (
                      <Link key={ev.id} href={`/dashboard/arca/${ev.id}/edit`} style={{ textDecoration: "none" }}>
                        <div style={{ padding: "10px 14px", borderRadius: "var(--r-md)", background: "var(--bg-tint)", display: "flex", gap: 10, alignItems: "center" }}>
                          <span style={{ fontSize: 16, color: ev.tone === "clay" ? "var(--accent)" : "var(--sky)" }}>
                            {ev.type === "EMOTIONAL" ? "✦" : "⬡"}
                          </span>
                          <span style={{ fontSize: 13, fontWeight: 500 }}>{ev.title}</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="arca-card flat" style={{ background: "var(--bg-tint)", border: "none" }}>
              <div style={{ padding: "20px 22px" }}>
                <h3 className="arca-h3" style={{ marginBottom: 14 }}>Nadcházející okamžiky</h3>
                {upcoming.length === 0 ? (
                  <p className="arca-sub" style={{ fontSize: 13 }}>Žádné naplánované zprávy v nejbližší době.</p>
                ) : (
                  <div className="arca-stack-3">
                    {upcoming.map((pack) => {
                      const d = pack.triggerCondition!.executeAtDate!;
                      return (
                        <Link key={pack.id} href={`/dashboard/arca/${pack.id}/edit`} style={{ textDecoration: "none" }}>
                          <div className="arca-row" style={{ gap: 10 }}>
                            <div style={{ width: 40, textAlign: "center", flexShrink: 0 }}>
                              <div className="arca-mono" style={{ fontSize: 10, color: "var(--muted)" }}>
                                {d.toLocaleDateString("cs-CZ", { month: "short" }).toUpperCase()}
                              </div>
                              <div style={{ fontFamily: "var(--f-serif)", fontSize: 20, lineHeight: 1 }}>{d.getDate()}</div>
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontWeight: 500, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{pack.title}</div>
                              <div className="arca-sub" style={{ fontSize: 12 }}>{pack.recipients[0]?.name ?? "—"}</div>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
                <Link href="/dashboard/arca/new" className="arca-btn arca-btn--clay" style={{ marginTop: 16, width: "100%", justifyContent: "center" }}>
                  <IcPlus /> Naplánovat zprávu
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
