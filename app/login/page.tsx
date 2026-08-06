import { Suspense } from "react";
import Link from "next/link";
import LoginForm from "./LoginForm";

export const metadata = { title: "Přihlásit se — ARCA" };

export default function LoginPage() {
  return (
    <div
      data-arca-theme=""
      style={{
        minHeight: "100vh",
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        background: "transparent",
        fontFamily: "var(--f-sans)",
      }}
    >
      {/* ── Left — brand panel ─────────────────────────────────────── */}
      <div style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "48px 56px",
        background: "transparent",
        borderRight: "1px solid var(--glass-border)",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Decorative arc waves */}
        <svg
          viewBox="0 0 600 600"
          style={{ position: "absolute", right: -120, bottom: -80, width: 520, opacity: 0.18, pointerEvents: "none" }}
          fill="none"
        >
          {[0,1,2,3,4,5,6].map(i => (
            <path
              key={i}
              d={`M ${-20 + i * 8} ${600 - i * 44} Q 300 ${200 - i * 44} ${620 - i * 8} ${600 - i * 44}`}
              stroke="var(--accent)"
              strokeWidth="1.2"
            />
          ))}
          <circle cx="300" cy="560" r="8" fill="var(--accent)" />
        </svg>

        {/* Brand */}
        <div>
          <Link href="/" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 10,
              background: "linear-gradient(135deg, var(--ink-2), var(--ink))",
              display: "grid", placeItems: "center",
              boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)",
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M5 19c0-8 3.5-14 7-14s7 6 7 14" stroke="rgba(255,255,255,0.5)" strokeWidth="1.8" strokeLinecap="round"/>
                <circle cx="12" cy="20" r="1.8" fill="var(--accent)"/>
              </svg>
            </div>
            <span style={{ fontFamily: "var(--f-serif)", fontSize: 26, letterSpacing: "0.02em", color: "var(--ink)" }}>
              arc<em style={{ color: "var(--accent)" }}>a</em>
            </span>
          </Link>
        </div>

        {/* Central quote */}
        <div style={{ position: "relative", zIndex: 1 }}>
          <p style={{ fontFamily: "var(--f-mono)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--muted)", marginBottom: 18 }}>
            Bezpečně · Soukromě · Navždy
          </p>
          <h2 style={{ fontFamily: "var(--f-serif)", fontWeight: 400, fontSize: 42, lineHeight: 1.2, margin: "0 0 20px", color: "var(--ink)" }}>
            Tvoje slova,<br />
            <em style={{ color: "var(--accent)" }}>zachovaná</em><br />
            s péčí.
          </h2>
          <p style={{ color: "var(--muted)", fontSize: 14.5, lineHeight: 1.6, maxWidth: 360, margin: 0 }}>
            ARCA je bezpečná schránka pro zprávy, které záleží nejvíc —
            doručená přesně tehdy, kdy je zapotřebí.
          </p>
        </div>

        {/* Bottom features */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, position: "relative", zIndex: 1 }}>
          {[
            { icon: "⊞", text: "Šifrováno end-to-end" },
            { icon: "✦", text: "Strážci jako pojistka" },
            { icon: "◈", text: "Doručeno přesně, jak si přeješ" },
          ].map(f => (
            <div key={f.text} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ color: "var(--accent)", fontSize: 14, width: 20, textAlign: "center", flexShrink: 0 }}>{f.icon}</span>
              <span style={{ fontSize: 13, color: "var(--muted)" }}>{f.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right — form panel ─────────────────────────────────────── */}
      <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "48px 40px",
        background: "var(--glass-bg)",
        backdropFilter: "blur(var(--glass-blur)) saturate(var(--glass-saturation))",
      }}>
        <div style={{ width: "100%", maxWidth: 380 }}>
          {/* Heading */}
          <div style={{ marginBottom: 32 }}>
            <h1 style={{ fontFamily: "var(--f-serif)", fontWeight: 400, fontSize: 30, margin: "0 0 6px", color: "var(--ink)" }}>
              Vítej zpět.
            </h1>
            <p style={{ color: "var(--muted)", fontSize: 14, margin: 0 }}>
              Přihlaš se ke své schránce.
            </p>
          </div>

          <Suspense>
            <LoginForm />
          </Suspense>

          <p style={{ textAlign: "center", fontSize: 12, color: "var(--muted-2)", marginTop: 28 }}>
            Pokračováním souhlasíš s{" "}
            <a href="#" style={{ color: "var(--muted)", textDecoration: "underline" }}>podmínkami použití</a>
            {" "}a{" "}
            <a href="#" style={{ color: "var(--muted)", textDecoration: "underline" }}>zásadami ochrany soukromí</a>.
          </p>
        </div>
      </div>

      {/* Mobile: stack columns */}
      <style>{`
        @media (max-width: 768px) {
          div[data-arca-theme] {
            grid-template-columns: 1fr !important;
          }
          div[data-arca-theme] > div:first-child {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
