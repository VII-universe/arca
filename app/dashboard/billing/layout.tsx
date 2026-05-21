// Billing page has its own full-page layout — escape the sidebar shell.
export default function BillingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, background: "var(--background)", overflowY: "auto" }}>
      {children}
    </div>
  );
}
