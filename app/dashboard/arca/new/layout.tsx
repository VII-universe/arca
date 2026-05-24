// Compose wizard is full-page — escape the sidebar layout.
export default function NewArcaLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="arca-compose-layout" style={{ position: "fixed", inset: 0, zIndex: 50, background: "var(--bg, #F6F2EB)", overflowY: "auto" }}>
      {children}
    </div>
  );
}
