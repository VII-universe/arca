"use client";

import SidebarContent, { type SidebarContentProps } from "./SidebarContent";

/**
 * Desktop sidebar — always visible on md+ screens.
 * On mobile this element is hidden via CSS (display:none in the ≤768px breakpoint);
 * the Sheet drawer in DashboardShell handles mobile navigation instead.
 */
export default function ArcaSidebar(props: SidebarContentProps) {
  return (
    <aside className="arca-side">
      <SidebarContent {...props} />
    </aside>
  );
}
