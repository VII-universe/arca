import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";
import { getSignedAvatarUrl } from "@/app/actions/recipients";
import { Avatar } from "@/components/arca/Avatar";
import ModeFilterSection from "@/components/dashboard/ModeFilterSection";
import { APP_URL } from "@/lib/resend";
export const metadata = { title: "Přehled — ARCA" };

function initialsFor(name: string): string {
  return name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");
}
const TONES = ["clay", "sage", "sky", "ink"];
function toneFor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return TONES[Math.abs(h) % TONES.length];
}

// ── Reminder helpers ──────────────────────────────────────────────────────────
function daysUntilNextOccurrence(date: Date): number {
  const now = new Date();
  const next = new Date(now.getFullYear(), date.getMonth(), date.getDate());
  const todayMs = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  if (next.getTime() < todayMs) next.setFullYear(next.getFullYear() + 1);
  return Math.ceil((next.getTime() - todayMs) / 86_400_000);
}

// ── Topbar ────────────────────────────────────────────────────────────────────
function Topbar({ crumbs }: { crumbs: string[] }) {
  const now = new Date();
  const dateStr = now.toLocaleDateString("cs-CZ", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const timeStr = now.toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" });
  return (
    <div className="arca-topbar">
      <div className="arca-topbar__crumbs">
        <span style={{ fontFamily: "var(--f-serif)", fontStyle: "italic", color: "var(--accent)" }}>arca</span>
        {crumbs.map((c, i) => (
          <span key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}><path d="M9 6l6 6-6 6"/></svg>
            <span className={i === crumbs.length - 1 ? "here" : ""}>{c}</span>
          </span>
        ))}
      </div>
      <div className="arca-grow" />
      <span className="arca-mono" style={{ color: "var(--muted)", fontSize: 11 }}>
        Vše synchronizováno · {timeStr}
      </span>
    </div>
  );
}


export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) redirect("/login");

  const ADMIN_EMAILS = new Set(["jakubfidler@centrum.cz", "fidlerjalub@gmail.com"]);
  const email = authUser.email ?? "";
  const isAdminEmail = ADMIN_EMAILS.has(email.toLowerCase());

  const [dbUser, packs, guardians, allRecipients] = await Promise.all([
    prisma.user.findUnique({
      where: { id: authUser.id },
      select: { name: true, isPremium: true, role: true, lastActiveAt: true },
    }),
    prisma.messagePack.findMany({
      where: { ownerId: authUser.id },
      orderBy: { updatedAt: "desc" },
      take: 20,
      select: {
        id: true, title: true, type: true, status: true, messageMode: true, livingLinkHash: true,
        updatedAt: true, createdAt: true,
        recipients: { select: { id: true, name: true, email: true, avatarUrl: true }, take: 3 },
        triggerCondition: { select: { type: true, executeAtDate: true, inactivityDaysLimit: true, triggeredAt: true, gracePeriodDays: true } },
      },
    }),
    prisma.guardian.findMany({
      where: { userId: authUser.id },
      select: { id: true, name: true, email: true },
    }),
    // Load recipients with birthday/anniversary for reminders
    prisma.recipient.findMany({
      where: {
        messagePack: { ownerId: authUser.id },
        OR: [{ birthday: { not: null } }, { anniversary: { not: null } }],
      },
      select: { id: true, name: true, email: true, relationship: true, birthday: true, anniversary: true },
    }),
  ]);

  const firstName = (dbUser?.name ?? email.split("@")[0] ?? "příteli").split(" ")[0];
  const isPro = isAdminEmail || dbUser?.isPremium === true || dbUser?.role === "ADMIN";

  const activePacks = packs.filter((p) => p.status === "ACTIVE").length;
  const totalRecipients = new Set(packs.flatMap((p) => p.recipients.map((r) => r.email ?? r.name))).size;

  const gracePacks = packs.filter((p) => p.status === "GRACE_PERIOD" || p.status === "PENDING_GUARDIAN_APPROVAL");

  // Packs that have actually fired AND where the logged-in user is themselves
  // a recipient — i.e. there's something of theirs waiting to be opened.
  // Mode-agnostic condition (a LEGACY pack can equally have the owner as
  // their own recipient, e.g. a Guardian-confirmed delivery) — but the copy
  // below still branches by messageMode so a LEGACY delivery in this state
  // doesn't read as a cheerful "your letter is ready" moment.
  const readyToOpenPacks = packs.filter(
    (p) => p.status === "TRIGGERED" && p.recipients.some((r) => r.email === email)
  );

  // People strip — every unique recipient across all packs, most messages first
  type PersonSummary = { id: string; name: string; avatarUrl: string | null; packCount: number };
  const peopleMap = new Map<string, PersonSummary>();
  for (const p of packs) {
    for (const r of p.recipients) {
      const key = r.email ?? r.name;
      const existing = peopleMap.get(key);
      if (existing) existing.packCount += 1;
      else peopleMap.set(key, { id: r.id, name: r.name, avatarUrl: r.avatarUrl, packCount: 1 });
    }
  }
  const people = [...peopleMap.values()].sort((a, b) => b.packCount - a.packCount);

  // Signed avatar URLs — primary recipient of every fetched pack (the client-
  // side mode filter can surface any of them, not just the top 4), plus
  // everyone in the people strip.
  const avatarPaths = new Set<string>();
  for (const p of packs) {
    const path = p.recipients[0]?.avatarUrl;
    if (path) avatarPaths.add(path);
  }
  for (const person of people) {
    if (person.avatarUrl) avatarPaths.add(person.avatarUrl);
  }
  const avatarEntries = await Promise.all(
    [...avatarPaths].map(async (path) => [path, await getSignedAvatarUrl(path)] as const)
  );
  const avatarUrlByPath = new Map(avatarEntries);
  // Plain object — Client Components can't receive a Map as a prop.
  const avatarUrlByPathObj = Object.fromEntries(avatarUrlByPath);

  // Smart reminders — dedupe by email/name, then build reminder items
  type ReminderItem = { recipientId: string; name: string; relationship: string | null; label: string; days: number; occasion: "birthday" | "anniversary"; urgent: boolean };
  const reminders: ReminderItem[] = [];
  const seen = new Set<string>();
  // Deduplicate in JS (same person may appear as recipient of multiple packs)
  const uniqueRecipients = allRecipients.filter(r => {
    const key = r.email ?? r.name;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const reminderSeen = new Set<string>();
  for (const r of uniqueRecipients) {
    if (r.birthday) {
      const days = daysUntilNextOccurrence(new Date(r.birthday));
      const key = `${r.id}-birthday`;
      if (days <= 30 && !reminderSeen.has(key)) {
        reminderSeen.add(key);
        reminders.push({ recipientId: r.id, name: r.name, relationship: r.relationship, label: "Narozeniny", days, occasion: "birthday", urgent: days <= 7 });
      }
    }
    if (r.anniversary) {
      const days = daysUntilNextOccurrence(new Date(r.anniversary));
      const key = `${r.id}-anniversary`;
      if (days <= 30 && !reminderSeen.has(key)) {
        reminderSeen.add(key);
        reminders.push({ recipientId: r.id, name: r.name, relationship: r.relationship, label: "Výročí", days, occasion: "anniversary", urgent: days <= 7 });
      }
    }
  }
  reminders.sort((a, b) => a.days - b.days);

  const now = new Date();
  const dayName = now.toLocaleDateString("cs-CZ", { weekday: "long" });
  const dayNameCap = dayName.charAt(0).toUpperCase() + dayName.slice(1);
  const shortDate = now.toLocaleDateString("cs-CZ", { day: "numeric", month: "long", year: "numeric" });

  const lastActive = dbUser?.lastActiveAt ?? new Date();
  const daysSinceActive = Math.floor((now.getTime() - lastActive.getTime()) / 86_400_000);

  return (
    <>
      <Topbar crumbs={["Přehled"]} />
      <div className="arca-inner arca-fade-in">

        {/* ── Ready-to-open alert — split by mode so a LEGACY delivery      ──
             (owner is their own recipient, e.g. Guardian-confirmed) never    ──
             reads as the cheerful "your letter is ready" SELF framing.   ──── */}
        {["SELF", "LEGACY"].map((mode) => {
          const modePacks = readyToOpenPacks.filter((p) => p.messageMode === mode);
          if (modePacks.length === 0) return null;
          const single = modePacks.length === 1 ? modePacks[0] : null;
          const href = single ? `${APP_URL}/arca/${single.livingLinkHash}` : "/dashboard/vault";
          return (
            <div key={mode} className="arca-card" style={{ background: "var(--accent-tint)", border: "1px solid var(--accent-soft)", padding: "16px 22px", marginBottom: 28, display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ fontSize: 20 }}>{mode === "SELF" ? "✉️" : "◈"}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 550, fontSize: 14 }}>
                  {mode === "SELF"
                    ? (single ? `Tvůj dopis „${single.title}" je připraven k otevření` : `${modePacks.length} dopisy jsou připravené k otevření`)
                    : (single ? "Jedna z tvých zpráv byla doručena" : `${modePacks.length} tvé zprávy byly doručeny`)}
                </div>
                <div className="arca-sub" style={{ fontSize: 12.5, marginTop: 2 }}>
                  {mode === "SELF" ? "Napsal(a) jsi ho sám(a) sobě — nastal čas si ho přečíst." : "Nastal čas doručení."}
                </div>
              </div>
              <Link href={href} target={single ? "_blank" : undefined} rel={single ? "noopener noreferrer" : undefined} className="arca-btn arca-btn--clay sm">
                {mode === "SELF" ? "Otevřít" : "Zobrazit"}
              </Link>
            </div>
          );
        })}

        {/* ── Grace period alert ─────────────────────────────────── */}
        {gracePacks.length > 0 && (
          <div className="arca-card" style={{ background: "var(--accent-tint)", border: "1px solid var(--accent-soft)", padding: "16px 22px", marginBottom: 28, display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ fontSize: 20 }}>⚠️</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 550, fontSize: 14 }}>
                {gracePacks.length === 1 ? "Jedna Arca" : `${gracePacks.length} Arcy`} čekají na potvrzení strážci
              </div>
              <div className="arca-sub" style={{ fontSize: 12.5, marginTop: 2 }}>
                Zkontroluj stav a případně zrušit doručení.
              </div>
            </div>
            <Link href="/dashboard/vault" className="arca-btn arca-btn--clay sm">Zobrazit</Link>
          </div>
        )}

        {/* ── Smart Reminders ────────────────────────────────────── */}
        {reminders.length > 0 && (
          <div style={{ marginBottom: 28, display: "flex", flexDirection: "column", gap: 8 }}>
            {reminders.map((r) => (
              <div
                key={`${r.recipientId}-${r.occasion}`}
                style={{
                  display: "flex", alignItems: "center", gap: 14,
                  background: "var(--bg-tint)", borderRadius: "var(--r-lg)",
                  padding: "12px 18px",
                  border: r.urgent ? "1px solid var(--accent-soft)" : "1px solid var(--hairline)",
                  position: "relative", overflow: "hidden",
                }}
              >
                {r.urgent && (
                  <span style={{
                    position: "absolute", left: 0, top: 0, bottom: 0, width: 3,
                    background: "var(--accent)", borderRadius: "var(--r-lg) 0 0 var(--r-lg)",
                    boxShadow: r.urgent ? "0 0 8px var(--accent)" : "none",
                  }} />
                )}
                <div style={{ flex: 1, paddingLeft: r.urgent ? 6 : 0 }}>
                  <span style={{ fontSize: 13.5, fontWeight: 550 }}>
                    {r.name.split(" ")[0]}{r.relationship ? ` (${r.relationship})` : ""} · {r.label}
                  </span>
                  {" "}
                  <span className="arca-sub" style={{ fontSize: 13 }}>
                    za {r.days} {r.days === 1 ? "den" : r.days < 5 ? "dny" : "dní"}
                  </span>
                </div>
                {r.urgent && (
                  <span style={{
                    width: 8, height: 8, borderRadius: "50%", background: "var(--accent)",
                    flexShrink: 0,
                    boxShadow: "0 0 0 3px var(--accent-tint)",
                    animation: "arca-reminder-pulse 2s ease-in-out infinite",
                  }} />
                )}
                <Link
                  href={`/dashboard/arca/new?recipientId=${r.recipientId}&occasion=${r.occasion}`}
                  className="arca-btn sm arca-btn--clay"
                >
                  Napsat zprávu
                </Link>
              </div>
            ))}
          </div>
        )}
        <style>{`
          @keyframes arca-reminder-pulse {
            0%, 100% { box-shadow: 0 0 0 3px var(--accent-tint); }
            50% { box-shadow: 0 0 0 7px transparent; }
          }
        `}</style>

        {/* ── Greeting ───────────────────────────────────────────── */}
        <div style={{ marginBottom: 36 }}>
          <div className="arca-kicker" style={{ marginBottom: 10 }}>{dayNameCap} · {shortDate}</div>
          <h1 className="arca-h1 arca-greeting-h1" style={{ fontSize: 52 }}>
            Dobrý den, {firstName}. <em>Co dnes uložíš?</em>
          </h1>
          <p className="arca-sub" style={{ maxWidth: 580, marginTop: 12, fontSize: 15 }}>
            Tvoje schránka nese{" "}
            <strong style={{ color: "var(--ink)", fontWeight: 550 }}>
              {packs.length} {packs.length === 1 ? "zprávu" : packs.length < 5 ? "zprávy" : "zpráv"}
            </strong>{" "}
            pro {totalRecipients} {totalRecipients === 1 ? "člověka" : "lidí"}.
            {activePacks > 0 && ` ${activePacks} ${activePacks === 1 ? "je připravena" : "jsou připraveny"} k doručení.`}
          </p>
        </div>

        {/* ── Hero CTA card ───────────────────────────────────────── */}
        <div className="arca-card elev" style={{ overflow: "hidden", marginBottom: 36 }}>
          <div className="arca-hero-split" style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", minHeight: 200 }}>
            <div style={{ padding: "32px 36px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div>
                <span className="arca-chip clay"><span className="dot" /> Navrhujeme dnes</span>
                <h2 className="arca-h1" style={{ marginTop: 14, marginBottom: 8, fontSize: 30, lineHeight: 1.25 }}>
                  Otevřít editor <em>a začít psát.</em>
                </h2>
                <p className="arca-sub" style={{ maxWidth: 360 }}>
                  I krátká věta zanechá stopu. Vrátíš se k ní, kdykoli budeš chtít.
                </p>
              </div>
              <div className="arca-row" style={{ gap: 10, marginTop: 24 }}>
                <Link href="/dashboard/arca/new" className="arca-btn arca-btn--primary lg">
                  Otevřít editor
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}><path d="M5 12h14M13 6l6 6-6 6"/></svg>
                </Link>
                <Link href="/dashboard/vault" className="arca-btn arca-btn--ghost lg">Schránka</Link>
              </div>
            </div>
            <div className="arca-hero-right" style={{ background: "linear-gradient(160deg, var(--accent-tint) 0%, var(--accent-soft) 60%, color-mix(in srgb, var(--accent) 50%, var(--accent-soft)) 100%)", position: "relative", overflow: "hidden" }}>
              <svg width="100%" height="100%" viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice" style={{ position: "absolute", inset: 0 }}>
                <defs>
                  <radialGradient id="glw" cx="0.7" cy="0.3" r="0.7">
                    <stop offset="0%" stopColor="#FFF7EC" stopOpacity="0.9"/>
                    <stop offset="100%" stopColor="#FFF7EC" stopOpacity="0"/>
                  </radialGradient>
                </defs>
                <rect width="400" height="200" fill="url(#glw)"/>
                {[0,1,2,3,4,5].map((i) => (
                  <path key={i} d={`M -20 ${240 - i*22} Q 200 ${80 - i*22} 420 ${240 - i*22}`}
                    fill="none" stroke="var(--accent)" strokeOpacity={0.22 - i*0.025} strokeWidth="1"/>
                ))}
                <circle cx="200" cy="180" r="6" fill="var(--accent)" />
              </svg>
            </div>
          </div>
        </div>

        {/* ── People strip — horizontally swipeable, esp. on mobile ── */}
        {people.length > 0 && (
          <div style={{ marginBottom: 36 }}>
            <h3 className="arca-h3" style={{ marginBottom: 12 }}>Podle koho</h3>
            <div
              className="arca-side__scroll"
              style={{
                display: "flex", gap: 18, overflowX: "auto",
                scrollSnapType: "x proximity",
                // Avatars scale up ~6% on hover; without this, the first/last
                // item has nowhere to grow into within the scroll container's
                // own clipping box and gets its edge cut off. The negative
                // margin cancels the padding out visually so the row still
                // lines up with the heading above it.
                padding: "8px 8px 10px",
                margin: "-8px -8px 0",
                WebkitOverflowScrolling: "touch",
              }}
            >
              {people.map((person) => (
                <Link
                  key={person.id}
                  href={`/dashboard/vault/${person.id}`}
                  style={{
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
                    textDecoration: "none", flexShrink: 0, width: 88,
                    scrollSnapAlign: "start",
                  }}
                >
                  <Avatar
                    src={person.avatarUrl ? avatarUrlByPath.get(person.avatarUrl) : null}
                    initials={initialsFor(person.name)}
                    tone={toneFor(person.name)}
                    size="xl"
                  />
                  <span style={{ fontSize: 12, fontWeight: 500, color: "var(--ink)", textAlign: "center", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 88 }}>
                    {person.name.split(" ")[0]}
                  </span>
                  <span className="arca-mono" style={{ fontSize: 10, color: "var(--muted)" }}>
                    {person.packCount} {person.packCount === 1 ? "zpráva" : person.packCount < 5 ? "zprávy" : "zpráv"}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* ── Stats, upcoming, recent — filterable by SELF/LEGACY ──── */}
        <ModeFilterSection
          packs={packs.map((p) => ({
            id: p.id,
            title: p.title,
            type: p.type,
            status: p.status,
            messageMode: p.messageMode,
            updatedAt: p.updatedAt.toISOString(),
            recipients: p.recipients,
            triggerCondition: p.triggerCondition
              ? { type: p.triggerCondition.type, executeAtDate: p.triggerCondition.executeAtDate?.toISOString() ?? null }
              : null,
          }))}
          guardians={guardians}
          avatarUrlByPath={avatarUrlByPathObj}
          daysSinceActive={daysSinceActive}
        />

        {/* ── Pro upsell (free users) ─────────────────────────────── */}
        {!isPro && (
          <div className="arca-card flat" style={{ background: "var(--accent-tint)", border: "none", marginTop: 36, padding: "20px 24px", display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 550, fontSize: 14 }}>ARCA Pro — bez hranic</div>
              <p className="arca-sub" style={{ fontSize: 12.5, margin: "2px 0 0" }}>
                Neomezené zprávy, hlasové a video nahrávky, šifrování end-to-end a fyzické dopisy.
              </p>
            </div>
            <Link href="/dashboard/billing" className="arca-btn arca-btn--clay sm">Upgradovat →</Link>
          </div>
        )}
      </div>
    </>
  );
}
