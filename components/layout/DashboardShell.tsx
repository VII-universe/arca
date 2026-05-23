"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Plus } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import ArcaSidebar from "./ArcaSidebar";
import SidebarContent from "./SidebarContent";
import type { ResolvedUser } from "@/lib/auth/user";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  user: ResolvedUser;
  packCount: number;
  guardianCount: number;
  recentRecipients: { id: string; name: string; initials: string; tone: string; messageCount: number }[];
  contactGroups: { id: string; name: string; color: string; emoji: string | null }[];
  children: React.ReactNode;
}

// ── Bottom nav icons (20px, ARCA stroke style) ────────────────────────────────

const Ic = ({ children }: { children: React.ReactNode }) => (
  <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
);
const IcHome      = () => <Ic><path d="M3 11.5L12 4l9 7.5"/><path d="M5 10.5V20h14V10.5"/><path d="M10 20v-6h4v6"/></Ic>;
const IcVault     = () => <Ic><path d="M4 7c0-1.1.9-2 2-2h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7Z"/><path d="M4 10h16"/></Ic>;
const IcCalendar  = () => <Ic><rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 9.5h17"/><path d="M8 3.5v3M16 3.5v3"/></Ic>;
const IcGuardians = () => <Ic><path d="M12 3l8 3v5c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-3Z"/><path d="M9 12l2 2 4-4"/></Ic>;

const BOTTOM_NAV = [
  { href: "/dashboard",           label: "Přehled",  Icon: IcHome,      exact: true  },
  { href: "/dashboard/vault",     label: "Schránka", Icon: IcVault,     exact: false },
  { href: "/dashboard/calendar",  label: "Kalendář", Icon: IcCalendar,  exact: false },
  { href: "/dashboard/guardians", label: "Strážci",  Icon: IcGuardians, exact: false },
];

// ── DashboardShell ────────────────────────────────────────────────────────────

export default function DashboardShell({
  user, packCount, guardianCount, recentRecipients, contactGroups, children,
}: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathname = usePathname();

  // Close drawer on route change
  useEffect(() => { setDrawerOpen(false); }, [pathname]);

  // Lock body scroll while drawer is open
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [drawerOpen]);

  function isActive(item: typeof BOTTOM_NAV[0]) {
    return item.exact ? pathname === item.href : pathname.startsWith(item.href);
  }

  const sidebarProps = { user, packCount, guardianCount, recentRecipients, contactGroups };

  return (
    <div className="arca-app" data-arca-theme="">

      {/* ════════════════════════════════════════════════════════
          MOBILE: sticky glassmorphism header
          Only visible below md breakpoint (768px).
          ════════════════════════════════════════════════════════ */}
      <header className="arca-mobile-header">
        {/* Hamburger */}
        <button
          className="arca-mobile-hamburger"
          onClick={() => setDrawerOpen(true)}
          aria-label="Otevřít navigaci"
        >
          <Menu size={20} strokeWidth={1.8} />
        </button>

        {/* Centered brand */}
        <div className="arca-mobile-header__brand" aria-hidden="true">
          arc<em>a</em>
        </div>

        {/* Compose shortcut */}
        <Link href="/dashboard/arca/new" className="arca-mobile-hamburger" aria-label="Nová zpráva">
          <Plus size={20} strokeWidth={1.8} />
        </Link>
      </header>

      {/* ════════════════════════════════════════════════════════
          MOBILE: Sheet drawer — slides in from the left.
          Uses the existing Sheet component (Radix Dialog),
          extended with side="left" variant="arca".
          Only rendered client-side; no layout shift on server.
          ════════════════════════════════════════════════════════ */}
      <Sheet
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        side="left"
        variant="arca"
      >
        {/* Full sidebar content — shared with desktop, no duplication */}
        <SidebarContent
          {...sidebarProps}
          onClose={() => setDrawerOpen(false)}
        />
      </Sheet>

      {/* ════════════════════════════════════════════════════════
          DESKTOP: permanent sidebar (hidden on mobile via CSS)
          ════════════════════════════════════════════════════════ */}
      <ArcaSidebar {...sidebarProps} />

      {/* ════════════════════════════════════════════════════════
          MAIN content area
          ════════════════════════════════════════════════════════ */}
      <main className="arca-main">
        {children}
      </main>

      {/* ════════════════════════════════════════════════════════
          MOBILE: bottom tab bar — iOS-native pattern.
          Fixed, blurred, above safe-area.
          ════════════════════════════════════════════════════════ */}
      <nav className="arca-bottom-nav" aria-label="Hlavní navigace">
        {BOTTOM_NAV.slice(0, 2).map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`arca-bottom-nav__item${isActive(item) ? " active" : ""}`}
          >
            <item.Icon />
            <span>{item.label}</span>
          </Link>
        ))}

        {/* FAB — center compose button */}
        <Link href="/dashboard/arca/new" className="arca-bottom-nav__fab" aria-label="Nová zpráva">
          <Plus size={22} strokeWidth={1.8} color="currentColor" />
        </Link>

        {BOTTOM_NAV.slice(2).map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`arca-bottom-nav__item${isActive(item) ? " active" : ""}`}
          >
            <item.Icon />
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
