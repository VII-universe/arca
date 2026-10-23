import type { Metadata } from "next";

// 404 for URLs that match no route. The landing and the app have separate
// root layouts, so this page stands on its own: no providers, no app CSS,
// both languages (the locale isn't resolved for unmatched URLs).

export const metadata: Metadata = {
  title: "404 · ARCA",
  robots: { index: false },
};

export default function GlobalNotFound() {
  return (
    <html lang="cs">
      <body
        style={{
          margin: 0,
          minHeight: "100svh",
          display: "grid",
          placeItems: "center",
          background: "#05070d",
          color: "#f4efe6",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
          textAlign: "center",
          padding: 24,
        }}
      >
        <main>
          <p style={{ fontFamily: "ui-monospace, Menlo, monospace", fontSize: 13, letterSpacing: "0.08em", opacity: 0.7 }}>404</p>
          <h1 style={{ fontWeight: 400, fontSize: 28, margin: "12px 0" }}>Tahle stránka neexistuje.</h1>
          <p lang="en" style={{ margin: "0 0 28px", opacity: 0.75 }}>This page doesn&apos;t exist.</p>
          {/* A full page load on purpose: "/" has its own root layout. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/" style={{ color: "#ffd9a0" }}>ARCA</a>
        </main>
      </body>
    </html>
  );
}
