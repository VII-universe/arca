"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/app/actions/auth";
import AppearanceButton from "./AppearanceButton";
import type { ResolvedUser } from "@/lib/auth/user";

// ── Props ─────────────────────────────────────────────────────────────────────

export interface SidebarContentProps {
  user: ResolvedUser;
  packCount: number;
  guardianCount: number;
  recentRecipients: { id: string; name: string; initials: string; tone: string; messageCount: number }[];
  contactGroups: { id: string; name: string; color: string; emoji: string | null }[];
  onClose?: () => void; // called by ✕ button + nav link clicks (for Sheet context)
}

// ── SVG icon helpers ──────────────────────────────────────────────────────────

const Ic = ({ children, size = 17 }: { children: React.ReactNode; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
);
const IcHome      = () => <Ic><path d="M3 11.5L12 4l9 7.5"/><path d="M5 10.5V20h14V10.5"/><path d="M10 20v-6h4v6"/></Ic>;
const IcVault     = () => <Ic><path d="M4 7c0-1.1.9-2 2-2h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7Z"/><path d="M4 10h16"/></Ic>;
const IcCompose   = () => <Ic><path d="M4 20l4-1 10.5-10.5a1.6 1.6 0 0 0 0-2.3l-.7-.7a1.6 1.6 0 0 0-2.3 0L5 16l-1 4Z"/><path d="M13.5 6.5l3.5 3.5"/></Ic>;
const IcCalendar  = () => <Ic><rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 9.5h17"/><path d="M8 3.5v3M16 3.5v3"/></Ic>;
const IcGuardians = () => <Ic><path d="M12 3l8 3v5c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-3Z"/><path d="M9 12l2 2 4-4"/></Ic>;
const IcSettings  = () => <Ic><circle cx="12" cy="12" r="3"/><path d="M19.4 14.2l1.4 1.2-1.7 3-1.8-.4a7.6 7.6 0 0 1-2 1.2L15 21h-3.4l-.3-1.8a7.6 7.6 0 0 1-2-1.2l-1.8.4-1.7-3 1.4-1.2a7.7 7.7 0 0 1 0-2.3L4.8 10.5l1.7-3 1.8.4a7.6 7.6 0 0 1 2-1.2L10.6 5H14l.3 1.7a7.6 7.6 0 0 1 2 1.2l1.8-.4 1.7 3-1.4 1.2a7.7 7.7 0 0 1 0 2.3Z"/></Ic>;
const IcSearch    = () => <Ic><circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.3-4.3"/></Ic>;
const IcPlus      = () => <Ic><path d="M12 5v14M5 12h14"/></Ic>;
const IcSparkle   = () => <Ic><path d="M12 4v4M12 16v4M4 12h4M16 12h4M6.5 6.5l2.8 2.8M14.7 14.7l2.8 2.8M17.5 6.5l-2.8 2.8M9.3 14.7L6.5 17.5"/></Ic>;
const IcClose     = () => <Ic size={16}><path d="M18 6L6 18M6 6l12 12"/></Ic>;
const IcBlueprint = () => <Ic><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/></Ic>;

const TONE_COLORS: Record<string, string> = {
  clay: "linear-gradient(135deg, #B6754A, #8B5430)",
  sage: "linear-gradient(135deg, #7C8A6B, #5C6B4D)",
  sky:  "linear-gradient(135deg, #6F8AA8, #4B6685)",
  ink:  "linear-gradient(135deg, #3D3830, #1C1A16)",
};

const GROUP_COLOR_DOT: Record<string, string> = {
  clay: "#B6754A",
  sage: "#7C8A6B",
  sky:  "#6F8AA8",
  ink:  "#4A4540",
};

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  count?: number;
  exact?: boolean;
}

// ── SidebarContent ────────────────────────────────────────────────────────────
// Renders inside both the desktop <aside> and the mobile Sheet drawer.

export default function SidebarContent({
  user, packCount, guardianCount, recentRecipients, contactGroups, onClose,
}: SidebarContentProps) {
  const pathname = usePathname();

  const navItems: NavItem[] = [
    { href: "/dashboard",           label: "Přehled",    icon: <IcHome />,      exact: true },
    { href: "/dashboard/vault",     label: "Schránka",   icon: <IcVault />,     count: packCount },
    { href: "/dashboard/arca/new",  label: "Nová zpráva",icon: <IcCompose /> },
    { href: "/dashboard/calendar",  label: "Kalendář",   icon: <IcCalendar /> },
    { href: "/dashboard/guardians", label: "Strážci",    icon: <IcGuardians />, count: guardianCount },
    { href: "/dashboard/blueprint", label: "Manuál k životu", icon: <IcBlueprint /> },
  ];

  function isActive(item: NavItem) {
    if (item.exact) return pathname === item.href;
    return pathname.startsWith(item.href);
  }

  const initials = user.name
    .split(" ").filter(Boolean).slice(0, 2)
    .map((w) => w[0].toUpperCase()).join("");

  return (
    <>
      {/* ── Brand ──────────────────────────────────────────────── */}
      <div className="arca-brand">
        <div className="mark">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M5 18c0-7 3-12 7-12s7 5 7 12" stroke="rgba(255,255,255,0.5)" strokeWidth="1.8" strokeLinecap="round"/>
            <circle cx="12" cy="19" r="1.5" fill="var(--accent)"/>
          </svg>
        </div>
        <div className="name">arc<em>a</em></div>
        {onClose && (
          <button className="arca-side__close" onClick={onClose} aria-label="Zavřít menu">
            <IcClose />
          </button>
        )}
      </div>

      {/* ── Search ─────────────────────────────────────────────── */}
      <div className="arca-search">
        <IcSearch />
        <input placeholder="Hledat ve schránce…" />
        <span className="arca-mono" style={{ fontSize: 10, color: "var(--muted-2)" }}>⌘K</span>
      </div>

      {/* ── Main nav ───────────────────────────────────────────── */}
      <div className="arca-nav-group">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={onClose}
            className={`arca-nav-item ${isActive(item) ? "active" : ""}`}
          >
            <span className="ic">{item.icon}</span>
            <span>{item.label}</span>
            {item.count != null && <span className="count">{item.count}</span>}
          </Link>
        ))}
      </div>

      {/* ── Recipients + groups ────────────────────────────────── */}
      <>
        <div className="arca-nav-label">Příjemci</div>
        <div className="arca-nav-group" style={{ paddingTop: 0 }}>
          <Link
            href="/dashboard/vault"
            onClick={onClose}
            className={`arca-nav-item ${pathname === "/dashboard/vault" && !pathname.includes("?") ? "active" : ""}`}
          >
            <span className="ic">
              <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round">
                <circle cx="9" cy="9" r="3.5"/><path d="M3 19c0-3 2.7-5 6-5s6 2 6 5"/>
                <circle cx="17" cy="8" r="2.5"/><path d="M15 14.5c2.7 0 6 1.4 6 4.5"/>
              </svg>
            </span>
            <span>Všichni</span>
            <span className="count">{recentRecipients.length}</span>
          </Link>

          {contactGroups.map((g) => (
            <Link
              key={g.id}
              href={`/dashboard/vault?group=${g.id}`}
              onClick={onClose}
              className="arca-nav-item"
            >
              <span className="ic" style={{ width: 15, height: 15, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {g.emoji
                  ? <span style={{ fontSize: 13, lineHeight: 1 }}>{g.emoji}</span>
                  : <span style={{ width: 8, height: 8, borderRadius: "50%", background: GROUP_COLOR_DOT[g.color] ?? "#B6754A", flexShrink: 0 }} />
                }
              </span>
              <span>{g.name}</span>
            </Link>
          ))}

          {recentRecipients.slice(0, 3).map((r) => (
            <Link
              key={r.id}
              href={`/dashboard/vault/${r.id}`}
              onClick={onClose}
              className={`arca-nav-item ${pathname === `/dashboard/vault/${r.id}` ? "active" : ""}`}
            >
              <span
                className="arca-avatar sm"
                style={TONE_COLORS[r.tone] ? { background: TONE_COLORS[r.tone] } : {}}
              >
                {r.initials}
              </span>
              <span>{r.name}</span>
            </Link>
          ))}

          <Link href="/dashboard/vault" onClick={onClose} className="arca-nav-item" style={{ color: "var(--muted)" }}>
            <span className="ic"><IcPlus /></span>
            <span>Přidat příjemce</span>
          </Link>
        </div>
      </>

      {/* ── Bottom: inspiration + appearance + user ────────────── */}
      <div style={{ marginTop: "auto" }}>
        <div className="arca-card flat" style={{ background: "var(--bg-tint)", border: "none", padding: 14, borderRadius: 12, marginBottom: 14 }}>
          <div className="arca-row" style={{ gap: 8, marginBottom: 6 }}>
            <IcSparkle />
            <span style={{ fontSize: 12, fontWeight: 550, whiteSpace: "nowrap", color: "var(--accent)" }}>Tichá inspirace</span>
          </div>
          <p className="arca-sub" style={{ fontSize: 12, margin: 0, lineHeight: 1.4 }}>
            {`„Vzpomeneš si na ten den, kdy jsme poprvé…"`} — začni odtud.
          </p>
        </div>

        <div style={{ marginBottom: 12 }}>
          <AppearanceButton />
        </div>

        <div className="arca-foot">
          <span className="arca-avatar">{initials}</span>
          <div className="arca-col" style={{ flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {user.name}
            </span>
            <span style={{ fontSize: 11, color: "var(--muted)" }}>
              {user.role === "ADMIN" ? "Admin · Plný přístup" : user.isPremium ? "ARCA Pro" : "Základní plán"}
            </span>
          </div>
          <form action={signOut}>
            <button type="submit" className="arca-btn arca-btn--ghost icon-btn" title="Odhlásit se">
              <IcSettings />
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
