import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";
import { getSignedAvatarUrl } from "@/app/actions/recipients";
import { Avatar } from "@/components/arca/Avatar";
import ModeFilterSection from "@/components/dashboard/ModeFilterSection";
import { APP_URL } from "@/lib/resend";

export async function generateMetadata() {
  const t = await getTranslations("Nav");
  return { title: `${t("overview")} — ARCA` };
}

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
function Topbar({ crumbs, dateLocale, syncedLabel }: { crumbs: string[]; dateLocale: string; syncedLabel: string }) {
  const now = new Date();
  const timeStr = now.toLocaleTimeString(dateLocale, { hour: "2-digit", minute: "2-digit" });
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
        {syncedLabel} · {timeStr}
      </span>
    </div>
  );
}

// ── Completeness score ───────────────────────────────────────────────────────
const CheckIc = () => <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l4 4 10-10"/></svg>;

function CompletenessCard({
  score, items, labels, title, subtitle, doneSubtitle,
}: {
  score: number;
  items: { key: string; done: boolean; href: string }[];
  labels: Record<string, string>;
  title: string;
  subtitle: string;
  doneSubtitle: string;
}) {
  const ringColor = score === 100 ? "var(--sage)" : "var(--accent)";
  // Circular progress ring via conic-gradient — no SVG math needed, and it
  // reads correctly in both themes since it's built from the same tokens
  // the rest of the card uses.
  const ringStyle: React.CSSProperties = {
    width: 92, height: 92, borderRadius: "50%", flexShrink: 0,
    background: `conic-gradient(${ringColor} ${score * 3.6}deg, var(--hairline-2) 0deg)`,
    display: "grid", placeItems: "center",
  };
  return (
    <div className="arca-card elev" style={{ padding: "26px 28px", marginBottom: 36, display: "flex", alignItems: "center", gap: 28, flexWrap: "wrap" }}>
      <div style={ringStyle}>
        <div style={{ width: 74, height: 74, borderRadius: "50%", background: "var(--surface)", display: "grid", placeItems: "center" }}>
          <span style={{ fontFamily: "var(--f-serif)", fontSize: 26, color: ringColor }}>{score}%</span>
        </div>
      </div>
      <div style={{ flex: "1 1 260px", minWidth: 220 }}>
        <h3 className="arca-h3" style={{ marginBottom: 3 }}>{title}</h3>
        <p className="arca-sub" style={{ fontSize: 12.5 }}>{score === 100 ? doneSubtitle : subtitle}</p>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, flex: "2 1 340px" }}>
        {items.map((item) => (
          <Link
            key={item.key}
            href={item.href}
            style={{
              display: "inline-flex", alignItems: "center", gap: 7,
              padding: "6px 13px", borderRadius: "var(--r-pill)",
              background: item.done ? "var(--sage-soft)" : "var(--surface-2)",
              border: `1px solid ${item.done ? "transparent" : "var(--hairline-2)"}`,
              fontSize: 12.5, fontWeight: 500, textDecoration: "none",
              color: item.done ? "#3E5A3A" : "var(--ink-2)",
            }}
          >
            <span style={{
              width: 16, height: 16, borderRadius: "50%", flexShrink: 0,
              display: "grid", placeItems: "center",
              background: item.done ? "var(--sage)" : "transparent",
              border: item.done ? "none" : "1.5px solid var(--muted)",
              color: "#fff",
            }}>
              {item.done && <CheckIc />}
            </span>
            {labels[item.key]}
          </Link>
        ))}
      </div>
    </div>
  );
}

// ── Unified attention panel ──────────────────────────────────────────────────
// Replaces three separate full-width cards (ready-to-open, grace period,
// smart reminders) that used to stack on top of each other — one panel,
// one consistent row shape, ordered by urgency.
//
// Icons are small stroke SVGs, not emoji — matches the stroke-icon language
// used everywhere else in the app (sidebar nav, Blueprint category icons,
// AppearanceButton), rather than introducing a visually inconsistent,
// platform-dependent emoji set just for this one panel.
type AttentionIcon = "mail" | "delivered" | "warning" | "cake" | "heart";

const ATTENTION_ICONS: Record<AttentionIcon, React.ReactNode> = {
  mail: <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>,
  delivered: <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l8 3v5c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-3Z"/><path d="M9 12l2 2 4-4"/></svg>,
  warning: <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M12 9v4M12 17h.01"/><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg>,
  cake: <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round"><path d="M4 21v-6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v6"/><path d="M4 21h16"/><path d="M4 17h16"/><path d="M8 13V9M12 13V9M16 13V9"/><path d="M12 6V3M9.5 4.5c0-1 2.5-1 2.5-2.5 0 1.5 2.5 1.5 2.5 2.5"/></svg>,
  heart: <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round"><path d="M12 20s-7-4.4-9.5-9A5.5 5.5 0 0 1 12 6a5.5 5.5 0 0 1 9.5 5c-2.5 4.6-9.5 9-9.5 9Z"/></svg>,
};

interface AttentionItem {
  key: string;
  icon: AttentionIcon;
  title: React.ReactNode;
  subtitle: string;
  href: string;
  btnLabel: string;
  external?: boolean;
  urgent?: boolean;
}

function AttentionRow({ icon, title, subtitle, href, btnLabel, external, urgent }: Omit<AttentionItem, "key">) {
  return (
    <div
      style={{
        display: "flex", alignItems: "center", gap: 14,
        background: urgent ? "var(--accent-tint)" : "var(--bg-tint)",
        borderRadius: "var(--r-lg)", padding: "12px 18px",
        border: `1px solid ${urgent ? "var(--accent-soft)" : "var(--hairline)"}`,
        position: "relative", overflow: "hidden",
      }}
    >
      {urgent && (
        <span style={{
          position: "absolute", left: 0, top: 0, bottom: 0, width: 3,
          background: "var(--accent)", borderRadius: "var(--r-lg) 0 0 var(--r-lg)",
        }} />
      )}
      <span style={{ display: "grid", placeItems: "center", width: 22, flexShrink: 0, paddingLeft: urgent ? 3 : 0, color: urgent ? "var(--accent-deep)" : "var(--muted)" }}>
        {ATTENTION_ICONS[icon]}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 550 }}>{title}</div>
        <div className="arca-sub" style={{ fontSize: 12.5, marginTop: 1 }}>{subtitle}</div>
      </div>
      {urgent && (
        <span style={{
          width: 8, height: 8, borderRadius: "50%", background: "var(--accent)",
          flexShrink: 0, boxShadow: "0 0 0 3px var(--accent-tint)",
          animation: "arca-reminder-pulse 2s ease-in-out infinite",
        }} />
      )}
      <Link href={href} target={external ? "_blank" : undefined} rel={external ? "noopener noreferrer" : undefined} className="arca-btn arca-btn--clay sm">
        {btnLabel}
      </Link>
    </div>
  );
}

const IcAttention = () => <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M12 9v4M12 17h.01"/><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg>;

function AttentionPanel({ items, title }: { items: AttentionItem[]; title: string }) {
  if (items.length === 0) return null;
  return (
    <div className="arca-card" style={{ padding: "20px 22px", marginBottom: 36 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <span style={{ color: "var(--accent)" }}><IcAttention /></span>
        <h3 className="arca-h3">{title}</h3>
        <span className="arca-mono" style={{ fontSize: 11, color: "var(--muted)" }}>{items.length}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {items.map(({ key, ...row }) => <AttentionRow key={key} {...row} />)}
      </div>
      <style>{`
        @keyframes arca-reminder-pulse {
          0%, 100% { box-shadow: 0 0 0 3px var(--accent-tint); }
          50% { box-shadow: 0 0 0 7px transparent; }
        }
      `}</style>
    </div>
  );
}

export default async function DashboardPage() {
  const t = await getTranslations("Dashboard");
  const tNav = await getTranslations("Nav");
  const locale = await getLocale();
  const dateLocale = locale === "cs" ? "cs-CZ" : "en-GB";

  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) redirect("/login");

  const ADMIN_EMAILS = new Set(["jakubfidler@centrum.cz", "fidlerjalub@gmail.com"]);
  const email = authUser.email ?? "";
  const isAdminEmail = ADMIN_EMAILS.has(email.toLowerCase());

  const [dbUser, packs, guardians, allRecipients, unansweredSelfPack, userSettings, blueprintItemCount] = await Promise.all([
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
    // Fáze 2 — oldest delivered SELF message the owner hasn't replied to yet
    // (dedicated query, not derived from the `packs` list above, since that
    // one is capped at the 20 most recently updated — a reply-less delivery
    // could easily be older than that).
    prisma.messagePack.findFirst({
      where: {
        ownerId: authUser.id,
        messageMode: "SELF",
        status: "TRIGGERED",
        recipients: { some: { email } },
        replies: { none: {} },
      },
      orderBy: { createdAt: "asc" },
      // triggerCondition.triggeredAt is unreliable on this account (see
      // AUDIT.md — some already-TRIGGERED packs never got it set), so the
      // scheduled executeAtDate is the more trustworthy "delivered around"
      // date to show here.
      select: { id: true, title: true, triggerCondition: { select: { executeAtDate: true } } },
    }),
    prisma.userSettings.findUnique({
      where: { userId: authUser.id },
      select: { switchEnabled: true },
    }),
    prisma.blueprintItem.count({ where: { ownerId: authUser.id } }),
  ]);

  const firstName = (dbUser?.name ?? email.split("@")[0] ?? t("greeting.fallbackName")).split(" ")[0];
  const isPro = isAdminEmail || dbUser?.isPremium === true || dbUser?.role === "ADMIN";

  const activePacks = packs.filter((p) => p.status === "ACTIVE").length;
  const totalRecipients = new Set(packs.flatMap((p) => p.recipients.map((r) => r.email ?? r.name))).size;

  // ── Readiness checklist — how prepared is this account, end to end ──────
  const hasRecipientContact = packs.some((p) => p.recipients.some((r) => r.email));
  const completenessItems: { key: string; done: boolean; href: string }[] = [
    { key: "message",    done: packs.length > 0,                     href: "/dashboard/arca/new" },
    { key: "recipient",  done: hasRecipientContact,                  href: "/dashboard/vault" },
    { key: "guardian",   done: guardians.length > 0,                 href: "/dashboard/guardians" },
    { key: "switch",     done: userSettings?.switchEnabled === true, href: "/dashboard/settings" },
    { key: "blueprint",  done: blueprintItemCount > 0,                href: "/dashboard/blueprint" },
  ];
  const completenessScore = Math.round(
    (completenessItems.filter((i) => i.done).length / completenessItems.length) * 100
  );

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
        reminders.push({ recipientId: r.id, name: r.name, relationship: r.relationship, label: t("reminders.birthday"), days, occasion: "birthday", urgent: days <= 7 });
      }
    }
    if (r.anniversary) {
      const days = daysUntilNextOccurrence(new Date(r.anniversary));
      const key = `${r.id}-anniversary`;
      if (days <= 30 && !reminderSeen.has(key)) {
        reminderSeen.add(key);
        reminders.push({ recipientId: r.id, name: r.name, relationship: r.relationship, label: t("reminders.anniversary"), days, occasion: "anniversary", urgent: days <= 7 });
      }
    }
  }
  reminders.sort((a, b) => a.days - b.days);

  // ── Unified "needs attention" list — ready-to-open, grace period, then
  // reminders, in that priority order ──────────────────────────────────
  const attentionItems: AttentionItem[] = [];
  for (const mode of ["SELF", "LEGACY"] as const) {
    const modePacks = readyToOpenPacks.filter((p) => p.messageMode === mode);
    if (modePacks.length === 0) continue;
    const single = modePacks.length === 1 ? modePacks[0] : null;
    attentionItems.push({
      key: `ready-${mode}`,
      icon: mode === "SELF" ? "mail" : "delivered",
      title: mode === "SELF"
        ? (single ? t("readyToOpen.selfTitleSingle", { title: single.title }) : t("readyToOpen.selfTitleMultiple", { count: modePacks.length }))
        : (single ? t("readyToOpen.legacyTitleSingle") : t("readyToOpen.legacyTitleMultiple", { count: modePacks.length })),
      subtitle: mode === "SELF" ? t("readyToOpen.selfSubtitle") : t("readyToOpen.legacySubtitle"),
      href: single ? `${APP_URL}/arca/${single.livingLinkHash}` : "/dashboard/vault",
      btnLabel: mode === "SELF" ? t("readyToOpen.openBtn") : t("readyToOpen.viewBtn"),
      external: !!single,
      urgent: true,
    });
  }
  if (gracePacks.length > 0) {
    attentionItems.push({
      key: "grace",
      icon: "warning",
      title: gracePacks.length === 1 ? t("gracePeriod.titleSingle") : t("gracePeriod.titleMultiple", { count: gracePacks.length }),
      subtitle: t("gracePeriod.subtitle"),
      href: "/dashboard/vault",
      btnLabel: t("gracePeriod.viewBtn"),
      urgent: true,
    });
  }
  for (const r of reminders) {
    attentionItems.push({
      key: `reminder-${r.recipientId}-${r.occasion}`,
      icon: r.occasion === "birthday" ? "cake" : "heart",
      title: `${r.name.split(" ")[0]}${r.relationship ? ` (${r.relationship})` : ""} · ${r.label}`,
      subtitle: t("reminders.inDays", { days: r.days }),
      href: `/dashboard/arca/new?recipientId=${r.recipientId}&occasion=${r.occasion}`,
      btnLabel: t("reminders.writeMessageBtn"),
      urgent: r.urgent,
    });
  }

  const now = new Date();
  const dayName = now.toLocaleDateString(dateLocale, { weekday: "long" });
  const dayNameCap = dayName.charAt(0).toUpperCase() + dayName.slice(1);
  const shortDate = now.toLocaleDateString(dateLocale, { day: "numeric", month: "long", year: "numeric" });

  const lastActive = dbUser?.lastActiveAt ?? new Date();
  const daysSinceActive = Math.floor((now.getTime() - lastActive.getTime()) / 86_400_000);

  return (
    <>
      <Topbar crumbs={[tNav("overview")]} dateLocale={dateLocale} syncedLabel={t("topbar.synced")} />
      <div className="arca-inner arca-fade-in">

        {/* ── Needs attention — ready-to-open, grace period, reminders ── */}
        <AttentionPanel items={attentionItems} title={t("attention.title")} />

        {/* ── Greeting ───────────────────────────────────────────── */}
        <div style={{ marginBottom: 36 }}>
          <div className="arca-kicker" style={{ marginBottom: 10 }}>{dayNameCap} · {shortDate}</div>
          <h1 className="arca-h1 arca-greeting-h1" style={{ fontSize: 52 }}>
            {t.rich("greeting.title", { name: firstName, em: (chunks) => <em>{chunks}</em> })}
          </h1>
          <p className="arca-sub" style={{ maxWidth: 580, marginTop: 12, fontSize: 15 }}>
            {t("greeting.subtitlePrefix")}{" "}
            <strong style={{ color: "var(--ink)", fontWeight: 550 }}>
              {t("greeting.packsCount", { count: packs.length })}
            </strong>{" "}
            {t("greeting.subtitleFor")} {t("greeting.peopleCount", { count: totalRecipients })}.
            {activePacks > 0 && ` ${t("greeting.activeSuffix", { count: activePacks })}`}
          </p>
        </div>

        {/* ── Completeness / readiness score ─────────────────────── */}
        <CompletenessCard
          score={completenessScore}
          items={completenessItems}
          labels={{
            message: t("completeness.items.message"),
            recipient: t("completeness.items.recipient"),
            guardian: t("completeness.items.guardian"),
            switch: t("completeness.items.switch"),
            blueprint: t("completeness.items.blueprint"),
          }}
          title={t("completeness.title")}
          subtitle={t("completeness.subtitle")}
          doneSubtitle={t("completeness.doneSubtitle")}
        />

        {/* ── Hero CTA card ───────────────────────────────────────── */}
        <div className="arca-card elev" style={{ overflow: "hidden", marginBottom: 36 }}>
          <div className="arca-hero-split" style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", minHeight: 200 }}>
            <div style={{ padding: "32px 36px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div>
                <span className="arca-chip clay"><span className="dot" /> {t("hero.badge")}</span>
                <h2 className="arca-h1" style={{ marginTop: 14, marginBottom: 8, fontSize: 30, lineHeight: 1.25 }}>
                  {t.rich("hero.title", { em: (chunks) => <em>{chunks}</em> })}
                </h2>
                <p className="arca-sub" style={{ maxWidth: 360 }}>
                  {t("hero.subtitle")}
                </p>
              </div>
              <div className="arca-row" style={{ gap: 10, marginTop: 24 }}>
                <Link href="/dashboard/arca/new" className="arca-btn arca-btn--primary lg">
                  {t("hero.openEditorBtn")}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}><path d="M5 12h14M13 6l6 6-6 6"/></svg>
                </Link>
                <Link href="/dashboard/vault" className="arca-btn arca-btn--ghost lg">{t("hero.vaultBtn")}</Link>
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
            <h3 className="arca-h3" style={{ marginBottom: 12 }}>{t("peopleStrip.label")}</h3>
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
                    {t("peopleStrip.messageCount", { count: person.packCount })}
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
          unansweredSelfPack={unansweredSelfPack ? {
            id: unansweredSelfPack.id,
            title: unansweredSelfPack.title,
            deliveredAt: unansweredSelfPack.triggerCondition?.executeAtDate?.toISOString() ?? null,
          } : null}
          dateLocale={dateLocale}
        />

        {/* ── Pro upsell (free users) ─────────────────────────────── */}
        {!isPro && (
          <div className="arca-card flat" style={{ background: "var(--accent-tint)", border: "none", marginTop: 36, padding: "20px 24px", display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 550, fontSize: 14 }}>{t("proUpsell.title")}</div>
              <p className="arca-sub" style={{ fontSize: 12.5, margin: "2px 0 0" }}>
                {t("proUpsell.subtitle")}
              </p>
            </div>
            <Link href="/dashboard/billing" className="arca-btn arca-btn--clay sm">{t("proUpsell.upgradeBtn")}</Link>
          </div>
        )}
      </div>
    </>
  );
}
