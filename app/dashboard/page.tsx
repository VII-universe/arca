import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";
export const metadata = { title: "Přehled — ARCA" };

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

function StatCard({ label, value, hint, tone }: { label: string; value: number | string; hint: string; tone?: "clay" | "sage" | "sky" }) {
  const color = tone === "clay" ? "var(--accent)" : tone === "sage" ? "var(--sage)" : tone === "sky" ? "var(--sky)" : "var(--ink)";
  return (
    <div className="arca-card" style={{ padding: "20px 22px", minHeight: 120, display: "flex", flexDirection: "column", justifyContent: "space-between", alignItems: "center", textAlign: "center" }}>
      <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 500 }}>{label}</span>
      <span style={{ fontFamily: "var(--f-serif)", fontSize: 42, lineHeight: 1, fontWeight: 400, color }}>{value}</span>
      <span style={{ fontSize: 11, color: "var(--muted)", fontFamily: "var(--f-mono)" }}>{hint}</span>
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
        id: true, title: true, type: true, status: true,
        updatedAt: true, createdAt: true,
        recipients: { select: { id: true, name: true, email: true }, take: 3 },
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
  const deliveredPacks = packs.filter((p) => p.status === "DELIVERED" || p.status === "TRIGGERED").length;
  const totalRecipients = new Set(packs.flatMap((p) => p.recipients.map((r) => r.email ?? r.name))).size;

  const gracePacks = packs.filter((p) => p.status === "GRACE_PERIOD" || p.status === "PENDING_GUARDIAN_APPROVAL");

  // Upcoming — packs with specific date trigger
  const upcoming = packs
    .filter((p) => p.triggerCondition?.type === "SPECIFIC_DATE" && p.triggerCondition.executeAtDate)
    .sort((a, b) => (a.triggerCondition!.executeAtDate!.getTime()) - (b.triggerCondition!.executeAtDate!.getTime()))
    .slice(0, 4);

  // Recent
  const recent = packs.slice(0, 4);

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

  const kindIcon = (type: "EMOTIONAL" | "PRACTICAL") =>
    type === "EMOTIONAL" ? "✦" : "⬡";
  const kindColor = (type: "EMOTIONAL" | "PRACTICAL") =>
    type === "EMOTIONAL" ? "var(--accent)" : "var(--sky)";

  return (
    <>
      <Topbar crumbs={["Přehled"]} />
      <div className="arca-inner arca-fade-in">

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
          <h1 className="arca-h1" style={{ fontSize: 52 }}>
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
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", minHeight: 200 }}>
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
            <div style={{ background: "linear-gradient(160deg, var(--accent-tint) 0%, var(--accent-soft) 60%, color-mix(in srgb, var(--accent) 50%, var(--accent-soft)) 100%)", position: "relative", overflow: "hidden" }}>
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

        {/* ── Stats row ───────────────────────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 36 }}>
          <StatCard label="Ve schránce" value={packs.length} hint={`pro ${totalRecipients} ${totalRecipients === 1 ? "člověka" : "lidí"}`} />
          <StatCard label="Aktivní" value={activePacks} hint="připraveny k doručení" tone="clay" />
          <StatCard label="Doručené" value={deliveredPacks} hint="úspěšně doručeno" tone="sage" />
          <StatCard label="Strážci" value={guardians.length} hint={guardians.length > 0 ? "aktivní ochrana" : "žádní zatím"} tone="sky" />
        </div>

        {/* ── Two columns ─────────────────────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 22 }}>
          {/* Upcoming */}
          <div>
            <div className="arca-row arca-between" style={{ marginBottom: 14 }}>
              <h3 className="arca-h3">Nejbližší okamžiky</h3>
              <Link href="/dashboard/calendar" className="arca-btn sm arca-btn--ghost">
                Otevřít kalendář
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}><path d="M9 6l6 6-6 6"/></svg>
              </Link>
            </div>

            {upcoming.length === 0 ? (
              <div className="arca-card" style={{ padding: "28px 24px", textAlign: "center" }}>
                <p className="arca-sub" style={{ fontSize: 13 }}>Žádné naplánované zprávy. <Link href="/dashboard/arca/new" style={{ color: "var(--accent)" }}>Vytvoř první →</Link></p>
              </div>
            ) : (
              <div className="arca-stack-3">
                {upcoming.map((pack) => {
                  const d = pack.triggerCondition!.executeAtDate!;
                  const dayLabel = d.toLocaleDateString("cs-CZ", { weekday: "short" });
                  const dateLabel = d.toLocaleDateString("cs-CZ", { day: "numeric", month: "numeric" });
                  const recipientName = pack.recipients[0]?.name ?? "—";
                  return (
                    <Link key={pack.id} href={`/dashboard/arca/${pack.id}/edit`} style={{ textDecoration: "none" }}>
                      <div className="arca-card" style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: 16, cursor: "pointer" }}>
                        <div style={{ width: 54, textAlign: "center", borderRight: "1px solid var(--hairline)", paddingRight: 16 }}>
                          <div className="arca-mono" style={{ fontSize: 11, color: "var(--muted)" }}>{dayLabel}</div>
                          <div style={{ fontFamily: "var(--f-serif)", fontSize: 20, lineHeight: 1.1 }}>{dateLabel}</div>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 550, fontSize: 14 }}>{pack.title}</div>
                          <div className="arca-sub" style={{ fontSize: 12.5 }}>pro {recipientName}</div>
                        </div>
                        <span style={{ color: kindColor(pack.type), fontSize: 16 }}>{kindIcon(pack.type)}</span>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} style={{ color: "var(--muted)" }}><path d="M9 6l6 6-6 6"/></svg>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right column */}
          <div className="arca-stack-4">
            {/* Tichý strážce */}
            <div className="arca-card">
              <div style={{ padding: "20px 22px" }}>
                <div className="arca-row arca-between" style={{ marginBottom: 12 }}>
                  <h3 className="arca-h3">Tichý strážce</h3>
                  <span className="arca-chip sage"><span className="dot" /> Aktivní</span>
                </div>
                <p className="arca-sub" style={{ fontSize: 12.5, marginBottom: 14 }}>
                  ARCA bdí jemně na pozadí. Pokud se po dlouhou dobu neozveš, zeptá se tvých strážců, než cokoli odešle.
                </p>
                <div className="arca-row arca-between" style={{ marginBottom: 8 }}>
                  <span className="arca-mono" style={{ color: "var(--muted)" }}>Naposledy zde</span>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>
                    {daysSinceActive === 0 ? "právě teď" : `před ${daysSinceActive} ${daysSinceActive === 1 ? "dnem" : "dny"}`}
                  </span>
                </div>
                <div className="arca-row arca-between">
                  <span className="arca-mono" style={{ color: "var(--muted)" }}>Strážci</span>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{guardians.length} aktivních</span>
                </div>
                <hr className="arca-divider" />
                <div className="arca-row" style={{ gap: 8 }}>
                  {guardians.slice(0, 3).map((g) => (
                    <span key={g.id} className="arca-avatar sm sage" title={g.name}>
                      {g.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
                    </span>
                  ))}
                  {guardians.length === 0 && (
                    <span className="arca-sub" style={{ fontSize: 12 }}>Žádní strážci</span>
                  )}
                  <Link href="/dashboard/guardians" className="arca-btn sm arca-btn--ghost" style={{ marginLeft: "auto" }}>
                    Spravovat
                  </Link>
                </div>
              </div>
            </div>

            {/* Weekly ritual */}
            <div className="arca-card flat" style={{ background: "var(--ink)", color: "var(--bg)", border: "none" }}>
              <div style={{ padding: "20px 22px" }}>
                <div className="arca-row arca-between" style={{ marginBottom: 10 }}>
                  <span className="arca-kicker" style={{ color: "rgba(255,255,255,0.5)" }}>Týdenní rituál</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth={1.6}><path d="M12 4v4M12 16v4M4 12h4M16 12h4M6.5 6.5l2.8 2.8M14.7 14.7l2.8 2.8M17.5 6.5l-2.8 2.8M9.3 14.7L6.5 17.5"/></svg>
                </div>
                <p style={{ fontFamily: "var(--f-serif)", fontSize: 22, lineHeight: 1.2, margin: "0 0 18px" }}>
                  Co bys chtěl, aby si dnes <em style={{ color: "var(--accent)" }}>někdo</em> pamatoval?
                </p>
                <Link href="/dashboard/arca/new" className="arca-btn" style={{ background: "rgba(255,255,255,0.08)", color: "var(--bg)", borderColor: "rgba(255,255,255,0.12)" }}>
                  Tříminutové psaní
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}><path d="M5 12h14M13 6l6 6-6 6"/></svg>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* ── Recent ──────────────────────────────────────────────── */}
        {recent.length > 0 && (
          <div style={{ marginTop: 44 }}>
            <div className="arca-row arca-between" style={{ marginBottom: 14 }}>
              <h3 className="arca-h3">Naposledy uložené</h3>
              <Link href="/dashboard/vault" className="arca-btn sm arca-btn--ghost">
                Vše ve schránce
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}><path d="M9 6l6 6-6 6"/></svg>
              </Link>
            </div>
            <div className="arca-card">
              {recent.map((pack, i) => (
                <div key={pack.id}>
                  {i > 0 && <hr style={{ height: 1, background: "var(--hairline)", border: 0, margin: 0 }} />}
                  <Link href={`/dashboard/arca/${pack.id}/edit`} style={{ textDecoration: "none" }}>
                    <div style={{ padding: "14px 22px", display: "flex", alignItems: "center", gap: 14 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 9, background: "var(--bg-tint)", display: "grid", placeItems: "center", color: "var(--ink-2)", fontSize: 16 }}>
                        {kindIcon(pack.type)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 500, fontSize: 14 }}>{pack.title}</div>
                        <div className="arca-sub" style={{ fontSize: 12 }}>
                          {pack.recipients.map((r) => r.name).join(", ") || "bez příjemce"} · {pack.updatedAt.toLocaleDateString("cs-CZ")}
                        </div>
                      </div>
                      <span className={`arca-chip ${pack.type === "EMOTIONAL" ? "clay" : "sky"}`}>
                        {pack.type === "EMOTIONAL" ? "Emocionální" : "Praktická"}
                      </span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} style={{ color: "var(--muted)" }}><path d="M9 6l6 6-6 6"/></svg>
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

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
