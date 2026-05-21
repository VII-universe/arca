// The Arca editor is full-screen (h-screen) — it needs to escape the sidebar layout.
// This nested layout resets to a plain full-viewport container.
export default function EditorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, background: "var(--background)" }}>
      {children}
    </div>
  );
}
