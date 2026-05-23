"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import type { CalEvent } from "@/app/api/arca/calendar-events/route";

// ── Types ─────────────────────────────────────────────────────────────────────

type UpcomingItem = {
  id: string;
  title: string;
  recipientName: string | null;
  date: string;
  packType: string;
};

interface Props {
  initialYear: number;
  initialMonth: number;
  initialEvents: Record<number, CalEvent[]>;
  initialUpcoming: UpcomingItem[];
}

// ── Constants ─────────────────────────────────────────────────────────────────

const WEEKDAYS = ["Po", "Út", "St", "Čt", "Pá", "So", "Ne"];
const MONTHS = [
  "Leden","Únor","Březen","Duben","Květen","Červen",
  "Červenec","Srpen","Září","Říjen","Listopad","Prosinec",
];
const MONTHS_GEN = [
  "ledna","února","března","dubna","května","června",
  "července","srpna","září","října","listopadu","prosince",
];
const MONTHS_SHORT = ["Led","Úno","Bře","Dub","Kvě","Čvn","Čvc","Srp","Zář","Říj","Lis","Pro"];
const WEEKDAY_FULL = ["neděle","pondělí","úterý","středa","čtvrtek","pátek","sobota"];

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildGrid(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay();
  const offset = firstDay === 0 ? 6 : firstDay - 1;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrev  = new Date(year, month, 0).getDate();
  const cells: { day: number; muted: boolean }[] = [];
  for (let i = offset - 1; i >= 0; i--) cells.push({ day: daysInPrev - i, muted: true });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, muted: false });
  while (cells.length < 42) cells.push({ day: cells.length - offset - daysInMonth + 1, muted: true });
  return cells;
}

function isoDate(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

const toneBg = (t: CalEvent["tone"]) =>
  t === "clay" ? "var(--accent-tint)" : t === "sage" ? "var(--sage-soft)" : "var(--sky-soft)";
const toneText = (t: CalEvent["tone"]) =>
  t === "clay" ? "var(--accent-deep)" : t === "sage" ? "#4E5B3F" : "#3E5A7E";
const toneColor = (t: CalEvent["tone"]) =>
  t === "clay" ? "var(--accent)" : t === "sage" ? "var(--sage)" : "var(--sky)";
const pillClass = (t: CalEvent["tone"]) =>
  t === "sage" ? "sage" : t === "sky" ? "sky" : "";

// ── Icons ─────────────────────────────────────────────────────────────────────

const IcChev = ({ dir }: { dir: "left" | "right" }) => (
  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth={1.6} strokeLinecap="round"
    style={{ transform: dir === "left" ? "rotate(180deg)" : undefined }}>
    <path d="M9 6l6 6-6 6"/>
  </svg>
);
const IcPlus = () => (
  <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round">
    <path d="M12 5v14M5 12h14"/>
  </svg>
);
const IcCal = () => (
  <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round">
    <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
  </svg>
);
const IcRepeat = () => (
  <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round">
    <path d="M17 2l4 4-4 4M3 11V9a4 4 0 0 1 4-4h14M7 22l-4-4 4-4M21 13v2a4 4 0 0 1-4 4H3"/>
  </svg>
);
const IcSpin = () => (
  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
    style={{ animation: "arca-spin .8s linear infinite" }}>
    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
  </svg>
);

// ── MonthYearPicker ───────────────────────────────────────────────────────────

function MonthYearPicker({
  currentYear, currentMonth, onSelect, onClose,
}: {
  currentYear: number;
  currentMonth: number;
  onSelect: (year: number, month: number) => void;
  onClose: () => void;
}) {
  const [pYear, setPYear] = useState(currentYear);
  const ref = useRef<HTMLDivElement>(null);
  const today = new Date();

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const t = setTimeout(() => document.addEventListener("mousedown", h), 30);
    return () => { clearTimeout(t); document.removeEventListener("mousedown", h); };
  }, [onClose]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  return (
    <div
      ref={ref}
      data-arca-theme=""
      style={{
        position: "absolute", top: "calc(100% + 10px)", left: "50%",
        transform: "translateX(-50%)", zIndex: 300,
        background: "var(--surface-2)", border: "1px solid var(--hairline-2)",
        borderRadius: "var(--r-xl)", boxShadow: "var(--sh-3)",
        padding: "20px 22px", minWidth: 296,
        animation: "calPickerIn .18s cubic-bezier(.22,1,.36,1) both",
      }}
    >
      {/* Year navigation */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: 16, paddingBottom: 16, borderBottom: "1px solid var(--hairline)",
      }}>
        <button
          type="button"
          className="arca-btn icon-btn arca-btn--ghost"
          onClick={() => setPYear(y => y - 1)}
          title="Předchozí rok"
        >
          <IcChev dir="left" />
        </button>
        <span style={{ fontFamily: "var(--f-serif)", fontSize: 26, lineHeight: 1 }}>{pYear}</span>
        <button
          type="button"
          className="arca-btn icon-btn arca-btn--ghost"
          onClick={() => setPYear(y => y + 1)}
          title="Další rok"
        >
          <IcChev dir="right" />
        </button>
      </div>

      {/* Month 3×4 grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 5 }}>
        {MONTHS.map((_, i) => {
          const isSel  = pYear === currentYear && i === currentMonth;
          const isNow  = pYear === today.getFullYear() && i === today.getMonth();
          return (
            <button
              key={i}
              type="button"
              onClick={() => { onSelect(pYear, i); onClose(); }}
              style={{
                padding: "10px 6px", borderRadius: "var(--r-md)", border: "none",
                cursor: "pointer", fontFamily: "var(--f-sans)", fontSize: 13,
                fontWeight: isSel ? 600 : 450, textAlign: "center",
                background: isSel ? "var(--ink)" : isNow ? "var(--accent-tint)" : "transparent",
                color: isSel ? "var(--bg)" : isNow ? "var(--accent-deep)" : "var(--ink-2)",
                transition: "background .1s, color .1s",
                position: "relative",
              }}
            >
              {MONTHS_SHORT[i]}
              {/* dot under today's month */}
              {isNow && !isSel && (
                <span style={{
                  position: "absolute", bottom: 3, left: "50%",
                  transform: "translateX(-50%)",
                  width: 3, height: 3, borderRadius: "50%",
                  background: "var(--accent)",
                }} />
              )}
            </button>
          );
        })}
      </div>

      {/* Quick jump hint */}
      <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--hairline)", display: "flex", justifyContent: "center" }}>
        <button
          type="button"
          className="arca-btn sm arca-btn--ghost"
          onClick={() => { onSelect(today.getFullYear(), today.getMonth()); onClose(); }}
          style={{ fontSize: 11.5 }}
        >
          Skočit na dnes
        </button>
      </div>
    </div>
  );
}

// ── DayModal ─────────────────────────────────────────────────────────────────

function DayModal({
  year, month, day, events, onClose,
}: {
  year: number; month: number; day: number;
  events: CalEvent[];
  onClose: () => void;
}) {
  const weekday = WEEKDAY_FULL[new Date(year, month, day).getDay()];
  const dateStr = isoDate(year, month, day);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 500,
        background: "rgba(28,26,22,.5)", backdropFilter: "blur(7px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        data-arca-theme=""
        style={{
          background: "var(--surface)", borderRadius: "var(--r-xl)",
          boxShadow: "var(--sh-3)", width: "100%", maxWidth: 410,
          overflow: "hidden",
          animation: "calModalIn .22s cubic-bezier(.22,1,.36,1) both",
        }}
      >
        {/* Date header */}
        <div style={{
          padding: "22px 24px 18px",
          background: "linear-gradient(135deg, var(--accent-tint) 0%, var(--bg-tint) 100%)",
          borderBottom: "1px solid var(--hairline)",
          display: "flex", alignItems: "flex-start", justifyContent: "space-between",
        }}>
          <div>
            <div className="arca-mono" style={{ color: "var(--muted)", fontSize: 11, marginBottom: 5, textTransform: "capitalize" }}>
              {weekday}
            </div>
            <div style={{ fontFamily: "var(--f-serif)", fontSize: 38, lineHeight: 1, fontWeight: 400 }}>
              {day}.
            </div>
            <div style={{ fontFamily: "var(--f-serif)", fontSize: 20, lineHeight: 1.2, color: "var(--ink-2)", marginTop: 2 }}>
              {MONTHS_GEN[month]} {year}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="arca-btn icon-btn arca-btn--ghost"
            style={{ marginTop: -4, flexShrink: 0 }}
          >
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "18px 22px 22px" }}>

          {/* Existing events */}
          {events.length > 0 && (
            <div style={{ marginBottom: 18, display: "flex", flexDirection: "column", gap: 8 }}>
              {events.map(ev => (
                <div
                  key={ev.id}
                  style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "10px 14px", borderRadius: "var(--r-md)",
                    background: toneBg(ev.tone),
                    border: `1px solid color-mix(in srgb, ${toneColor(ev.tone)} 18%, transparent)`,
                  }}
                >
                  <span style={{ fontSize: 16, flexShrink: 0 }}>
                    {ev.type === "birthday" ? "🎂" : ev.type === "anniversary" ? "❤️" : "✦"}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 13, fontWeight: 550, color: toneText(ev.tone),
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {ev.label}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 1 }}>
                      {ev.type === "birthday" ? "Narozeniny" : ev.type === "anniversary" ? "Výročí" : "Naplánovaná zpráva"}
                      {ev.recurring && " · každý rok"}
                    </div>
                  </div>
                  {ev.packId && (
                    <Link
                      href={`/dashboard/arca/${ev.packId}/edit`}
                      onClick={onClose}
                      className="arca-btn sm arca-btn--ghost"
                      style={{ fontSize: 11, flexShrink: 0, color: toneText(ev.tone) }}
                    >
                      Otevřít →
                    </Link>
                  )}
                </div>
              ))}
            </div>
          )}

          {events.length === 0 && (
            <p className="arca-sub" style={{ fontSize: 13, marginBottom: 18 }}>
              Tento den je prázdný — zanech tu zprávu, která jednou přistane.
            </p>
          )}

          {/* Divider */}
          <div style={{ height: 1, background: "var(--hairline)", marginBottom: 14 }} />

          {/* Actions */}
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            <Link
              href={`/dashboard/arca/new?date=${dateStr}`}
              onClick={onClose}
              className="arca-btn arca-btn--primary"
              style={{ justifyContent: "center" }}
            >
              <IcCal /> Nová zpráva pro tento den
            </Link>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <Link
                href={`/dashboard/arca/new?date=${dateStr}&occasion=birthday`}
                onClick={onClose}
                className="arca-btn arca-btn--outline"
                style={{ justifyContent: "center", fontSize: 12.5 }}
              >
                🎂 Narozeninová
              </Link>
              <Link
                href={`/dashboard/arca/new?date=${dateStr}&occasion=anniversary`}
                onClick={onClose}
                className="arca-btn arca-btn--outline"
                style={{ justifyContent: "center", fontSize: 12.5 }}
              >
                <IcRepeat /> Každý rok
              </Link>
            </div>
          </div>

          <p className="arca-sub" style={{ fontSize: 11, marginTop: 12, textAlign: "center" }}>
            Zprávy navázané na datum se doručí ve stanovenou chvíli.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── CalendarGrid — separate component so `key` triggers animation ─────────────

function CalendarGrid({
  year, month, events, todayY, todayM, todayD, slideDir, onDayClick,
}: {
  year: number; month: number;
  events: Record<number, CalEvent[]>;
  todayY: number; todayM: number; todayD: number;
  slideDir: "left" | "right" | null;
  onDayClick: (day: number) => void;
}) {
  const cells = buildGrid(year, month);
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <div style={{
      animation: slideDir
        ? `${slideDir === "left" ? "calSlideLeft" : "calSlideRight"} .22s cubic-bezier(.22,1,.36,1) both`
        : undefined,
    }}>
      <div className="arca-cal">
        {/* Weekday header */}
        <div className="arca-cal__row arca-cal__head">
          {WEEKDAYS.map(d => <div key={d} className="cell">{d}</div>)}
        </div>

        {/* Weeks */}
        {Array.from({ length: 6 }).map((_, w) => (
          <div key={w} className="arca-cal__row">
            {cells.slice(w * 7, w * 7 + 7).map((c, i) => {
              const isToday = !c.muted && year === todayY && month === todayM && c.day === todayD;
              const evs = !c.muted ? (events[c.day] ?? []) : [];
              const isHov = hovered === c.day && !c.muted;
              return (
                <div
                  key={i}
                  className={`arca-cal__cell ${c.muted ? "muted" : ""} ${isToday ? "today" : ""}`}
                  style={{
                    cursor: c.muted ? "default" : "pointer",
                    background: isHov
                      ? "linear-gradient(160deg, var(--accent-tint) 0%, color-mix(in srgb, var(--accent-tint) 60%, var(--surface)) 100%)"
                      : undefined,
                    boxShadow: isHov ? "inset 0 2px 0 var(--accent-soft)" : undefined,
                    transition: "background .14s ease, box-shadow .14s ease",
                    position: "relative",
                  }}
                  onClick={() => { if (!c.muted) onDayClick(c.day); }}
                  onMouseEnter={() => { if (!c.muted) setHovered(c.day); }}
                  onMouseLeave={() => setHovered(null)}
                >
                  <span
                    className="num"
                    style={
                      isHov && !isToday
                        ? { color: "var(--accent)", fontWeight: 600 }
                        : { transition: "color .14s, font-weight .14s" }
                    }
                  >
                    {c.day}
                  </span>
                  {/* "+" add indicator on hover when no events */}
                  {isHov && evs.length === 0 && (
                    <div style={{
                      position: "absolute", top: 6, right: 7,
                      width: 16, height: 16, borderRadius: "50%",
                      background: "var(--accent)", color: "var(--on-accent)",
                      display: "grid", placeItems: "center",
                      fontSize: 12, lineHeight: 1, fontWeight: 400,
                      opacity: 0.75,
                      animation: "calPlusIn .12s cubic-bezier(.22,1,.36,1) both",
                    }}>+</div>
                  )}

                  {/* Event pills — max 3, then overflow */}
                  {evs.slice(0, 3).map((ev, j) => (
                    <div
                      key={j}
                      className={`arca-cal__pill ${pillClass(ev.tone)}`}
                      style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 10 }}
                    >
                      <span style={{ fontSize: 9, lineHeight: 1, flexShrink: 0 }}>
                        {ev.type === "birthday" ? "🎂" : ev.type === "anniversary" ? "❤" : ""}
                      </span>
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {ev.label}
                      </span>
                    </div>
                  ))}
                  {evs.length > 3 && (
                    <div style={{ fontSize: 10, color: "var(--muted)", paddingLeft: 4, fontFamily: "var(--f-mono)" }}>
                      +{evs.length - 3}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Sidebar upcoming list ────────────────────────────────────────────────────

function SidebarUpcoming({ items }: { items: UpcomingItem[] }) {
  if (items.length === 0) {
    return <p className="arca-sub" style={{ fontSize: 13 }}>Žádné naplánované zprávy.</p>;
  }
  return (
    <div className="arca-stack-3">
      {items.map(item => {
        const d = new Date(item.date);
        return (
          <Link key={item.id} href={`/dashboard/arca/${item.id}/edit`} style={{ textDecoration: "none" }}>
            <div className="arca-row" style={{ gap: 10 }}>
              <div style={{ width: 40, textAlign: "center", flexShrink: 0, borderRight: "1px solid var(--hairline)", paddingRight: 10 }}>
                <div className="arca-mono" style={{ fontSize: 9, color: "var(--muted)", textTransform: "uppercase" }}>
                  {d.toLocaleDateString("cs-CZ", { month: "short" })}
                </div>
                <div style={{ fontFamily: "var(--f-serif)", fontSize: 20, lineHeight: 1.1 }}>{d.getDate()}</div>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 500, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {item.title}
                </div>
                <div className="arca-sub" style={{ fontSize: 12 }}>{item.recipientName ?? "—"}</div>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

// ── Main CalendarClient ───────────────────────────────────────────────────────

export default function CalendarClient({
  initialYear, initialMonth, initialEvents, initialUpcoming,
}: Props) {
  const today = new Date();
  const todayY = today.getFullYear();
  const todayM = today.getMonth();
  const todayD = today.getDate();

  const [year, setYear]         = useState(initialYear);
  const [month, setMonth]       = useState(initialMonth);
  const [events, setEvents]     = useState<Record<number, CalEvent[]>>(initialEvents);
  const [upcoming, setUpcoming] = useState<UpcomingItem[]>(initialUpcoming);
  const [loading, setLoading]   = useState(false);
  const [animKey, setAnimKey]   = useState(0);
  const [slideDir, setSlideDir] = useState<"left" | "right" | null>(null);
  const [pickerOpen, setPickerOpen]   = useState(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const loadEvents = useCallback(async (y: number, m: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/arca/calendar-events?year=${y}&month=${m}`);
      if (res.ok) {
        const data = await res.json();
        setEvents(data.eventsByDay ?? {});
        setUpcoming(data.upcoming ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  function navigate(dir: "prev" | "next") {
    setPickerOpen(false);
    let newY = year;
    let newM = dir === "next" ? month + 1 : month - 1;
    if (newM > 11) { newM = 0; newY++; }
    else if (newM < 0) { newM = 11; newY--; }
    const anim = dir === "next" ? "left" : "right";
    setSlideDir(anim);
    setAnimKey(k => k + 1);
    setYear(newY);
    setMonth(newM);
    loadEvents(newY, newM);
  }

  function goToToday() {
    setPickerOpen(false);
    if (year === todayY && month === todayM) return;
    const anim = (todayY > year || (todayY === year && todayM > month)) ? "left" : "right";
    setSlideDir(anim);
    setAnimKey(k => k + 1);
    setYear(todayY);
    setMonth(todayM);
    loadEvents(todayY, todayM);
  }

  function selectMonthYear(y: number, m: number) {
    if (y === year && m === month) return;
    const anim = (y > year || (y === year && m > month)) ? "left" : "right";
    setSlideDir(anim);
    setAnimKey(k => k + 1);
    setYear(y);
    setMonth(m);
    loadEvents(y, m);
  }

  const isCurrentMonth = year === todayY && month === todayM;
  const totalEventsThisMonth = Object.values(events).flat().length;

  return (
    <>
      {/* ── Navigation bar ─────────────────────────────────────── */}
      <div className="arca-row" style={{ marginBottom: 22, gap: 8 }}>

        <button
          type="button"
          className="arca-btn icon-btn arca-btn--outline"
          onClick={() => navigate("prev")}
          title="Předchozí měsíc"
        >
          <IcChev dir="left" />
        </button>

        {/* Month + year trigger */}
        <div style={{ position: "relative" }}>
          <button
            type="button"
            onClick={() => setPickerOpen(o => !o)}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "8px 18px", borderRadius: "var(--r-pill)",
              border: "1px solid",
              borderColor: pickerOpen ? "var(--accent-soft)" : "var(--hairline-2)",
              background: pickerOpen ? "var(--accent-tint)" : "var(--surface-2)",
              cursor: "pointer", transition: "all .15s",
              fontFamily: "var(--f-serif)", fontSize: 22, fontWeight: 400, color: "var(--ink)",
            }}
          >
            {MONTHS[month]}
            <span style={{ fontFamily: "var(--f-sans)", fontSize: 15, color: "var(--muted)", fontWeight: 400 }}>
              {year}
            </span>
            <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
              style={{ opacity: .5, transition: "transform .15s", transform: pickerOpen ? "rotate(180deg)" : undefined }}>
              <path d="M6 9l6 6 6-6"/>
            </svg>
          </button>

          {pickerOpen && (
            <MonthYearPicker
              currentYear={year}
              currentMonth={month}
              onSelect={selectMonthYear}
              onClose={() => setPickerOpen(false)}
            />
          )}
        </div>

        <button
          type="button"
          className="arca-btn icon-btn arca-btn--outline"
          onClick={() => navigate("next")}
          title="Další měsíc"
        >
          <IcChev dir="right" />
        </button>

        {!isCurrentMonth && (
          <button
            type="button"
            className="arca-btn sm arca-btn--ghost"
            onClick={goToToday}
          >
            Dnes
          </button>
        )}

        {loading && (
          <span style={{ marginLeft: 6, color: "var(--muted)" }}>
            <IcSpin />
          </span>
        )}
      </div>

      {/* ── Main grid + sidebar ────────────────────────────────── */}
      <div className="arca-split" style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 28 }}>

        {/* Calendar */}
        <div style={{ opacity: loading ? 0.55 : 1, transition: "opacity .2s" }}>
          <CalendarGrid
            key={animKey}
            year={year} month={month}
            events={events}
            todayY={todayY} todayM={todayM} todayD={todayD}
            slideDir={slideDir}
            onDayClick={day => setSelectedDay(day)}
          />
        </div>

        {/* Sidebar */}
        <div className="arca-stack-4">

          {/* Today / month summary card */}
          <div className="arca-card">
            <div style={{ padding: "20px 22px" }}>
              <h3 className="arca-h3" style={{ marginBottom: 12 }}>
                {isCurrentMonth
                  ? `Dnes · ${todayD}. ${MONTHS_GEN[todayM]}`
                  : `${MONTHS[month]} ${year}`
                }
              </h3>
              {isCurrentMonth ? (
                (events[todayD] ?? []).length === 0 ? (
                  <p className="arca-sub" style={{ fontSize: 13 }}>Dnes žádné události.</p>
                ) : (
                  <div className="arca-stack-2">
                    {(events[todayD] ?? []).map(ev => (
                      <div key={ev.id} style={{
                        display: "flex", alignItems: "center", gap: 8,
                        padding: "8px 12px", borderRadius: "var(--r-md)",
                        background: toneBg(ev.tone),
                      }}>
                        <span style={{ fontSize: 13 }}>
                          {ev.type === "birthday" ? "🎂" : ev.type === "anniversary" ? "❤️" : "✦"}
                        </span>
                        <span style={{ fontSize: 12.5, fontWeight: 500, color: toneText(ev.tone), overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {ev.label}
                        </span>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                <p className="arca-sub" style={{ fontSize: 13 }}>
                  {totalEventsThisMonth === 0
                    ? "Žádné události v tomto měsíci."
                    : `${totalEventsThisMonth} ${totalEventsThisMonth === 1 ? "událost" : totalEventsThisMonth < 5 ? "události" : "událostí"} v tomto měsíci.`}
                </p>
              )}
            </div>
          </div>

          {/* Upcoming events */}
          <div className="arca-card flat" style={{ background: "var(--bg-tint)", border: "none" }}>
            <div style={{ padding: "20px 22px" }}>
              <h3 className="arca-h3" style={{ marginBottom: 14 }}>Nadcházející okamžiky</h3>
              <SidebarUpcoming items={upcoming} />
              <Link
                href="/dashboard/arca/new"
                className="arca-btn arca-btn--clay"
                style={{ marginTop: 16, width: "100%", justifyContent: "center" }}
              >
                <IcPlus /> Naplánovat zprávu
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ── Day modal ──────────────────────────────────────────── */}
      {selectedDay !== null && (
        <DayModal
          year={year} month={month} day={selectedDay}
          events={events[selectedDay] ?? []}
          onClose={() => setSelectedDay(null)}
        />
      )}

      {/* ── Keyframes ──────────────────────────────────────────── */}
      <style>{`
        @keyframes calSlideLeft {
          from { opacity: 0; transform: translateX(28px); }
          to   { opacity: 1; transform: none; }
        }
        @keyframes calSlideRight {
          from { opacity: 0; transform: translateX(-28px); }
          to   { opacity: 1; transform: none; }
        }
        @keyframes calPickerIn {
          from { opacity: 0; transform: translateX(-50%) scale(0.93) translateY(-6px); }
          to   { opacity: 1; transform: translateX(-50%) scale(1) translateY(0); }
        }
        @keyframes calModalIn {
          from { opacity: 0; transform: scale(0.94) translateY(12px); }
          to   { opacity: 1; transform: none; }
        }
        @keyframes calPlusIn {
          from { opacity: 0; transform: scale(0.5); }
          to   { opacity: 0.75; transform: scale(1); }
        }
      `}</style>
    </>
  );
}
