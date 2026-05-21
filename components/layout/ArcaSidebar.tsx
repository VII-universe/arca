"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/app/actions/auth";
import AppearanceButton from "./AppearanceButton";
import type { ResolvedUser } from "@/lib/auth/user";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  count?: number;
  exact?: boolean;
}

interface ArcaSidebarProps {
  user: ResolvedUser;
  packCount: number;
  guardianCount: number;
  recentRecipients: { id: string; name: string; initials: string; tone: string; messageCount: number }[];
}

// ── SVG icon helpers ──────────────────────────────────────────────────────────
const Ic = ({ children, size = 17 }: { children: React.ReactNode; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
);
const IcHome = () => <Ic><path d="M3 11.5L12 4l9 7.5"/><path d="M5 10.5V20h14V10.5"/><path d="M10 20v-6h4v6"/></Ic>;
const IcVault = () => <Ic><path d="M4 7c0-1.1.9-2 2-2h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7Z"/><path d="M4 10h16"/></Ic>;
const IcCompose = () => <Ic><path d="M4 20l4-1 10.5-10.5a1.6 1.6 0 0 0 0-2.3l-.7-.7a1.6 1.6 0 0 0-2.3 0L5 16l-1 4Z"/><path d="M13.5 6.5l3.5 3.5"/></Ic>;
const IcCalendar = () => <Ic><rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 9.5h17"/><path d="M8 3.5v3M16 3.5v3"/></Ic>;
const IcGuardians = () => <Ic><path d="M12 3l8 3v5c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-3Z"/><path d="M9 12l2 2 4-4"/></Ic>;
const IcSettings = () => <Ic><circle cx="12" cy="12" r="3"/><path d="M19.4 14.2l1.4 1.2-1.7 3-1.8-.4a7.6 7.6 0 0 1-2 1.2L15 21h-3.4l-.3-1.8a7.6 7.6 0 0 1-2-1.2l-1.8.4-1.7-3 1.4-1.2a7.7 7.7 0 0 1 0-2.3L4.8 10.5l1.7-3 1.8.4a7.6 7.6 0 0 1 2-1.2L10.6 5H14l.3 1.7a7.6 7.6 0 0 1 2 1.2l1.8-.4 1.7 3-1.4 1.2a7.7 7.7 0 0 1 0 2.3Z"/></Ic>;
const IcSearch = () => <Ic><circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.3-4.3"/></Ic>;
const IcPlus = () => <Ic><path d="M12 5v14M5 12h14"/></Ic>;
const IcSparkle = () => <Ic><path d="M12 4v4M12 16v4M4 12h4M16 12h4M6.5 6.5l2.8 2.8M14.7 14.7l2.8 2.8M17.5 6.5l-2.8 2.8M9.3 14.7L6.5 17.5"/></Ic>;

const TONE_COLORS: Record<string, string> = {
  clay: "background: linear-gradient(135deg, #B6754A, #8B5430)",
  sage: "background: linear-gradient(135deg, #7C8A6B, #5C6B4D)",
  sky:  "background: linear-gradient(135deg, #6F8AA8, #4B6685)",
  ink:  "background: linear-gradient(135deg, #3D3830, #1C1A16)",
};

export default function ArcaSidebar({ user, packCount, guardianCount, recentRecipients }: ArcaSidebarProps) {
  const pathname = usePathname();

  const navItems: NavItem[] = [
    { href: "/dashboard", label: "Přehled", icon: <IcHome />, exact: true },
    { href: "/dashboard/vault", label: "Schránka", icon: <IcVault />, count: packCount },
    { href: "/dashboard/arca/new", label: "Nová zpráva", icon: <IcCompose /> },
    { href: "/dashboard/calendar", label: "Kalendář", icon: <IcCalendar /> },
    { href: "/dashboard/guardians", label: "Strážci", icon: <IcGuardians />, count: guardianCount },
  ];

  function isActive(item: NavItem) {
    if (item.exact) return pathname === item.href;
    return pathname.startsWith(item.href);
  }

  const initials = user.name
    .split(" ").filter(Boolean).slice(0, 2)
    .map((w) => w[0].toUpperCase()).join("");

  return (
    <aside className="arca-side">
      {/* Brand */}
      <div className="arca-brand">
        <div className="mark">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M5 18c0-7 3-12 7-12s7 5 7 12" stroke="rgba(255,255,255,0.5)" strokeWidth="1.8" strokeLinecap="round"/>
            <circle cx="12" cy="19" r="1.5" fill="var(--accent)"/>
          </svg>
        </div>
        <div className="name">arc<em>a</em></div>
      </div>

      {/* Search */}
      <div className="arca-search">
        <IcSearch />
        <input placeholder="Hledat ve schránce…" />
        <span className="arca-mono" style={{ fontSize: 10, color: "var(--muted-2)" }}>⌘K</span>
      </div>

      {/* Main navigation */}
      <div className="arca-nav-group">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`arca-nav-item ${isActive(item) ? "active" : ""}`}
          >
            <span className="ic">{item.icon}</span>
            <span>{item.label}</span>
            {item.count != null && (
              <span className="count">{item.count}</span>
            )}
          </Link>
        ))}
      </div>

      {/* Recent recipients */}
      {recentRecipients.length > 0 && (
        <>
          <div className="arca-nav-label">Příjemci</div>
          <div className="arca-nav-group" style={{ paddingTop: 0 }}>
            {recentRecipients.slice(0, 4).map((r) => (
              <Link
                key={r.id}
                href={`/dashboard/vault/${r.id}`}
                className={`arca-nav-item ${pathname === `/dashboard/vault/${r.id}` ? "active" : ""}`}
              >
                <span
                  className="arca-avatar sm"
                  style={{ ...(TONE_COLORS[r.tone] ? { backgroundImage: TONE_COLORS[r.tone].replace("background: ", "") } : {}) }}
                >
                  {r.initials}
                </span>
                <span>{r.name}</span>
                <span className="count">{r.messageCount}</span>
              </Link>
            ))}
            <Link href="/dashboard/vault" className="arca-nav-item" style={{ color: "var(--muted)" }}>
              <span className="ic"><IcPlus /></span>
              <span>Přidat příjemce</span>
            </Link>
          </div>
        </>
      )}

      {/* Inspiration prompt */}
      <div style={{ marginTop: "auto" }}>
        <div className="arca-card flat" style={{ background: "var(--bg-tint)", border: "none", padding: 14, borderRadius: 12, marginBottom: 14 }}>
          <div className="arca-row" style={{ gap: 8, marginBottom: 6 }}>
            <IcSparkle />
            <span style={{ fontSize: 12, fontWeight: 550, whiteSpace: "nowrap", color: "var(--accent)" }}>Tichá inspirace</span>
          </div>
          <p className="arca-sub" style={{ fontSize: 12, margin: 0, lineHeight: 1.4 }}>
            „Vzpomeneš si na ten den, kdy jsme poprvé…" — začni odtud.
          </p>
        </div>

        {/* Appearance button */}
        <div style={{ marginBottom: 12 }}>
          <AppearanceButton />
        </div>

        {/* User foot */}
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
    </aside>
  );
}
