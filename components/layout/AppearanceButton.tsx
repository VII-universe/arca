"use client";

import { useState, useEffect, useRef } from "react";

type Theme = "light" | "dark" | "auto";
type Accent = "clay" | "sage" | "dusk" | "sea" | "ink";

const ACCENTS: { id: Accent; label: string; swatch: string }[] = [
  { id: "clay", label: "Terakota",  swatch: "#B6754A" },
  { id: "sage", label: "Šalvěj",   swatch: "#7C8A6B" },
  { id: "dusk", label: "Soumrak",  swatch: "#9B6A8B" },
  { id: "sea",  label: "Moře",     swatch: "#4F8B95" },
  { id: "ink",  label: "Grafit",   swatch: "#4A4540" },
];

// ── Tiny icon helpers ─────────────────────────────────────────────────────────

const Svg = ({ children, size = 14 }: { children: React.ReactNode; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
);
const SunIc  = () => <Svg><circle cx="12" cy="12" r="3.5"/><path d="M12 3v2M12 19v2M5 12H3M21 12h-2M6 6l1.4 1.4M16.6 16.6L18 18M6 18l1.4-1.4M16.6 7.4L18 6"/></Svg>;
const MoonIc = () => <Svg><path d="M20 14a8 8 0 1 1-10-10 6 6 0 0 0 10 10Z"/></Svg>;
const AutoIc = () => (
  <Svg>
    <circle cx="12" cy="12" r="8"/>
    <path d="M12 4v16"/>
    <path d="M12 4a8 8 0 0 1 0 16" fill="currentColor" stroke="none"/>
  </Svg>
);
const CheckIc = () => <Svg size={13}><path d="M5 12l4 4 10-10"/></Svg>;
const SparkIc = () => <Svg size={13}><path d="M12 4v4M12 16v4M4 12h4M16 12h4M6.5 6.5l2.8 2.8M14.7 14.7l2.8 2.8M17.5 6.5l-2.8 2.8M9.3 14.7L6.5 17.5"/></Svg>;

function ThemeIcon({ theme }: { theme: Theme }) {
  if (theme === "dark") return <MoonIc />;
  if (theme === "auto") return <AutoIc />;
  return <SunIc />;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function applyTheme(theme: Theme) {
  const dark =
    theme === "dark" ||
    (theme === "auto" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  if (dark) document.documentElement.setAttribute("data-arca-dark", "true");
  else document.documentElement.removeAttribute("data-arca-dark");
  localStorage.setItem("arca.theme", theme);
}

function applyAccent(accent: Accent) {
  document.documentElement.setAttribute("data-accent", accent);
  localStorage.setItem("arca.accent", accent);
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AppearanceButton() {
  const [theme, setTheme]   = useState<Theme>("light");
  const [accent, setAccent] = useState<Accent>("clay");
  const [open, setOpen]     = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Read from localStorage on mount (client only)
  useEffect(() => {
    setTheme((localStorage.getItem("arca.theme") as Theme | null) ?? "light");
    setAccent((localStorage.getItem("arca.accent") as Accent | null) ?? "clay");
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Auto theme observer
  useEffect(() => {
    if (theme !== "auto") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyTheme("auto");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  function handleTheme(t: Theme) {
    setTheme(t);
    applyTheme(t);
  }
  function handleAccent(a: Accent) {
    setAccent(a);
    applyAccent(a);
  }

  return (
    <div style={{ position: "relative" }} ref={ref}>
      {/* Trigger button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="arca-btn sm arca-btn--outline"
        title="Změnit vzhled"
        style={{ gap: 6 }}
      >
        <ThemeIcon theme={theme} />
        <span>Vzhled</span>
        <span style={{
          width: 14, height: 14, borderRadius: "50%",
          background: "var(--accent)",
          boxShadow: "inset 0 0 0 2px var(--surface-2)",
          flexShrink: 0,
        }} />
      </button>

      {/* Panel */}
      {open && (
        <div
          className="arca-card elev"
          style={{
            position: "absolute",
            left: 0, bottom: "calc(100% + 8px)",
            width: 300, zIndex: 100,
            padding: 18, fontSize: 13,
          }}
        >
          {/* Mode */}
          <div className="arca-kicker" style={{ marginBottom: 10 }}>Režim</div>
          <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
            {([
              { id: "light" as Theme, label: "Světlý",  Ic: SunIc,  bg: "#F6F2EB", fg: "#1C1A16" },
              { id: "dark"  as Theme, label: "Tmavý",   Ic: MoonIc, bg: "#15120F", fg: "#F2EDE3" },
              { id: "auto"  as Theme, label: "Auto",    Ic: AutoIc, bg: "linear-gradient(135deg,#F6F2EB 50%,#15120F 50%)", fg: "#807868" },
            ]).map((m) => (
              <button
                key={m.id}
                onClick={() => handleTheme(m.id)}
                style={{
                  flex: 1, padding: 10, borderRadius: 12, cursor: "pointer",
                  border: `1px solid ${theme === m.id ? "var(--accent)" : "var(--hairline-2)"}`,
                  background: theme === m.id ? "var(--accent-tint)" : "var(--surface-2)",
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                  fontFamily: "var(--f-sans)",
                }}
              >
                <div style={{
                  width: "100%", height: 36, borderRadius: 7,
                  background: m.bg, border: "1px solid var(--hairline)",
                  display: "grid", placeItems: "center", color: m.fg,
                }}>
                  <m.Ic />
                </div>
                <span style={{
                  fontSize: 12, fontWeight: 500,
                  color: theme === m.id ? "var(--accent-deep)" : "var(--ink-2)",
                }}>
                  {m.label}
                </span>
              </button>
            ))}
          </div>

          {/* Accent */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span className="arca-kicker">Akcent</span>
            <span className="arca-mono" style={{ color: "var(--muted)", fontSize: 10 }}>{accent}</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {ACCENTS.map((a) => (
              <button
                key={a.id}
                onClick={() => handleAccent(a.id)}
                style={{
                  width: "100%", padding: "8px 10px", borderRadius: 10,
                  display: "flex", alignItems: "center", gap: 12,
                  background: accent === a.id ? "var(--accent-tint)" : "transparent",
                  border: `1px solid ${accent === a.id ? "var(--accent-soft)" : "transparent"}`,
                  cursor: "pointer", fontFamily: "var(--f-sans)",
                }}
              >
                <span style={{
                  width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                  background: a.swatch, boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.1)",
                }} />
                <span style={{
                  flex: 1, textAlign: "left", fontSize: 13, fontWeight: 500,
                  color: accent === a.id ? "var(--accent-deep)" : "var(--ink)",
                }}>
                  {a.label}
                </span>
                {accent === a.id && (
                  <span style={{ color: "var(--accent-deep)" }}><CheckIc /></span>
                )}
              </button>
            ))}
          </div>

          <hr className="arca-divider" />
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ color: "var(--accent)" }}><SparkIc /></span>
            <span className="arca-sub" style={{ fontSize: 12, lineHeight: 1.45 }}>
              Vzhled je tvůj. Tvoji blízcí uvidí ten svůj při doručení.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
