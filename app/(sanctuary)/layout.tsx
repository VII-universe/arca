import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ARCA — A message awaits you",
  description: "A private message has been prepared for you.",
  robots: "noindex, nofollow",
};

export default function SanctuaryLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 999,
        background: "#0a0a0a",
        overflowY: "auto",
        WebkitOverflowScrolling: "touch" as const,
        color: "#f5f0df",
      }}
    >
      {children}
    </div>
  );
}
