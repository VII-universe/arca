"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import ArcaSidebar from "./ArcaSidebar";
import type { ResolvedUser } from "@/lib/auth/user";

interface Props {
  user: ResolvedUser;
  packCount: number;
  guardianCount: number;
  recentRecipients: { id: string; name: string; initials: string; tone: string; messageCount: number }[];
  contactGroups: { id: string; name: string; color: string; emoji: string | null }[];
  children: React.ReactNode;
}

const Ic = ({ children, size = 20 }: { children: React.ReactNode; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
);
const IcHome      = () => <Ic><path d="M3 11.5L12 4l9 7.5"/><path d="M5 10.5V20h14V10.5"/><path d="M10 20v-6h4v6"/></Ic>;
const IcVault     = () => <Ic><path d="M4 7c0-1.1.9-2 2-2h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7Z"/><path d="M4 10h16"/></Ic>;
const IcCalendar  = () => <Ic><rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 9.5h17"/><path d="M8 3.5v3M16 3.5v3"/></Ic>;
const IcGuardians = () => <Ic><path d="M12 3l8 3v5c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-3Z"/><path d="M9 12l2 2 4-4"/></Ic>;
const IcPlus      = () => <Ic size={22}><path d="M12 5v14M5 12h14"/></Ic>;

export default function DashboardShell({
  user, packCount, guardianCount, recentRecipients, contactGroups, children,
}: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  // Close drawer on route change
  useEffect(() => { setSidebarOpen(false); }, [pathname]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (sidebarOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [sidebarOpen]);

  const navItems = [
    { href: "/dashboard",           label: "Přehled",  Icon: IcHome,      exact: true },
    { href: "/dashboard/vault",     label: "Schránka", Icon: IcVault,     exact: false },
    { href: "/dashboard/calendar",  label: "Kalendář", Icon: IcCalendar,  exact: false },
    { href: "/dashboard/guardians", label: "Strážci",  Icon: IcGuardians, exact: false },
  ];

  function isActive(item: typeof navItems[0]) {
    if (item.exact) return pathname === item.href;
    return pathname.startsWith(item.href);
  }

  return (
    <div className="arca-app" data-arca-theme="">

      {/* ── Mobile sticky top header ─────────────────────────── */}
      <header className="arca-mobile-header">
        <button
          className="arca-mobile-hamburger"
          onClick={() => setSidebarOpen(true)}
          aria-label="Otevřít menu"
        >
          <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
            <path d="M4 7h16M4 12h16M4 17h16"/>
          </svg>
        </button>

        <div className="arca-mobile-header__brand">arc<em>a</em></div>

        <Link href="/dashboard/arca/new" className="arca-mobile-hamburger" aria-label="Nová zpráva">
          <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
            <path d="M12 5v14M5 12h14"/>
          </svg>
        </Link>
      </header>

      {/* ── Sidebar backdrop overlay ─────────────────────────── */}
      {sidebarOpen && (
        <div
          className="arca-sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Sidebar (desktop: always visible; mobile: drawer) ── */}
      <ArcaSidebar
        user={user}
        packCount={packCount}
        guardianCount={guardianCount}
        recentRecipients={recentRecipients}
        contactGroups={contactGroups}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* ── Main content ─────────────────────────────────────── */}
      <main className="arca-main">
        {children}
      </main>

      {/* ── Bottom navigation (mobile only) ─────────────────── */}
      <nav className="arca-bottom-nav">
        {navItems.slice(0, 2).map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`arca-bottom-nav__item ${isActive(item) ? "active" : ""}`}
          >
            <item.Icon />
            <span>{item.label}</span>
          </Link>
        ))}

        {/* FAB — compose button */}
        <Link href="/dashboard/arca/new" className="arca-bottom-nav__fab" aria-label="Nová zpráva">
          <IcPlus />
        </Link>

        {navItems.slice(2).map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`arca-bottom-nav__item ${isActive(item) ? "active" : ""}`}
          >
            <item.Icon />
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
