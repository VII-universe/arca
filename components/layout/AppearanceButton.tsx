"use client";

import { useState, useEffect, useRef, useCallback, useTransition } from "react";
import { createPortal } from "react-dom";
import { useVibe, GRADIENTS, PHOTOS, type Vibe } from "@/contexts/vibe-context";
import { uploadGlobalVibe } from "@/app/actions/settings";

type Theme = "light" | "dark" | "auto";
type Accent = "clay" | "sage" | "dusk" | "sea" | "ink" | "custom";

const DEFAULT_CUSTOM = "#B6754A";

const SCENES: { id: Vibe; label: string }[] = [
  { id: "nebula", label: "Výchozí" },
  { id: "midnight", label: "Půlnoc" },
  { id: "sunset", label: "Soumrak" },
  { id: "ocean", label: "Oceán" },
  { id: "forest", label: "Les" },
  { id: "stars", label: "Hvězdy" },
];
function scenePreview(id: Vibe): React.CSSProperties {
  if (GRADIENTS[id]) return { backgroundImage: GRADIENTS[id] };
  if (PHOTOS[id]) return { backgroundImage: `url(${PHOTOS[id]})`, backgroundSize: "cover", backgroundPosition: "center" };
  return { background: "radial-gradient(circle,#3f3f46 1px,transparent 1px) 0 0/10px 10px,#0a0510" };
}

const ACCENTS: { id: Accent; label: string; swatch: string }[] = [
  { id: "clay", label: "Terakota",  swatch: "#B6754A" },
  { id: "sage", label: "Šalvěj",   swatch: "#7C8A6B" },
  { id: "dusk", label: "Soumrak",  swatch: "#9B6A8B" },
  { id: "sea",  label: "Moře",     swatch: "#4F8B95" },
  { id: "ink",  label: "Grafit",   swatch: "#4A4540" },
];

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

function applyTheme(theme: Theme) {
  const dark = theme === "dark" || (theme === "auto" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  if (dark) document.documentElement.setAttribute("data-arca-dark", "true");
  else document.documentElement.removeAttribute("data-arca-dark");
  localStorage.setItem("arca.theme", theme);
}

function applyAccent(accent: Accent) {
  document.documentElement.setAttribute("data-accent", accent);
  localStorage.setItem("arca.accent", accent);
}

function applyCustomAccent(hex: string) {
  document.documentElement.style.setProperty("--accent-custom", hex);
  document.documentElement.setAttribute("data-accent", "custom");
  localStorage.setItem("arca.accent", "custom");
  localStorage.setItem("arca.accentCustom", hex);
}

function applyGlow(on: boolean) {
  if (on) document.documentElement.removeAttribute("data-arca-glow");
  else document.documentElement.setAttribute("data-arca-glow", "off");
  localStorage.setItem("arca.glow", on ? "on" : "off");
}

export default function AppearanceButton() {
  const [theme, setTheme]     = useState<Theme>("light");
  const [accent, setAccent]   = useState<Accent>("clay");
  const [customColor, setCustomColor] = useState(DEFAULT_CUSTOM);
  const [glowOn, setGlowOn]   = useState(true);
  const [open, setOpen]       = useState(false);
  const [panelPos, setPanelPos] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef   = useRef<HTMLDivElement>(null);
  const customColorRef = useRef<HTMLInputElement>(null);
  const { vibe, setVibe, customImageUrl, setCustomImageUrl } = useVibe();
  const [uploading, startUpload] = useTransition();
  const bgFileRef = useRef<HTMLInputElement>(null);
  const bgUrlRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTheme((localStorage.getItem("arca.theme") as Theme | null) ?? "light");
    const savedAccent = (localStorage.getItem("arca.accent") as Accent | null) ?? "clay";
    setAccent(savedAccent);
    const savedCustom = localStorage.getItem("arca.accentCustom") ?? DEFAULT_CUSTOM;
    setCustomColor(savedCustom);
    if (savedAccent === "custom") {
      document.documentElement.style.setProperty("--accent-custom", savedCustom);
    }
    setGlowOn((localStorage.getItem("arca.glow") ?? "on") !== "off");
  }, []);

  // Close only when clicking outside BOTH the trigger and the panel
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      const insideTrigger = triggerRef.current?.contains(target) ?? false;
      const insidePanel   = panelRef.current?.contains(target) ?? false;
      if (!insideTrigger && !insidePanel) setOpen(false);
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

  const handleOpen = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const PANEL_W = 300;
    // Place panel above the button
    const top = rect.top - 8; // will be set as bottom via transform
    // Start at button's left, but clamp so it doesn't overflow right edge
    let left = rect.left;
    if (left + PANEL_W > window.innerWidth - 12) {
      left = window.innerWidth - PANEL_W - 12;
    }
    setPanelPos({ top, left });
    setOpen((o) => !o);
  }, []);

  function handleTheme(t: Theme) { setTheme(t); applyTheme(t); }
  function handleAccent(a: Accent) { setAccent(a); applyAccent(a); }
  function handleGlow(on: boolean) { setGlowOn(on); applyGlow(on); }
  function handleCustomColor(hex: string) {
    setCustomColor(hex);
    setAccent("custom");
    applyCustomAccent(hex);
  }

  function handleBgFile(file: File) {
    startUpload(async () => {
      const fd = new FormData();
      fd.set("file", file);
      const res = await uploadGlobalVibe(fd);
      if ("ok" in res) {
        setCustomImageUrl(res.vibeImageUrl);
        if (bgUrlRef.current) bgUrlRef.current.value = res.vibeImageUrl;
      }
    });
  }
  function handleBgUrlCommit() {
    const val = bgUrlRef.current?.value.trim() ?? "";
    setCustomImageUrl(val);
    if (!val) setVibe("nebula");
  }

  return (
    <>
      <button
        ref={triggerRef}
        onClick={handleOpen}
        className="arca-btn sm arca-btn--outline"
        title="Změnit vzhled"
        style={{ gap: 6, width: "100%" }}
      >
        <ThemeIcon theme={theme} />
        <span>Vzhled</span>
        <span style={{ width: 14, height: 14, borderRadius: "50%", background: "var(--accent)", boxShadow: "inset 0 0 0 2px var(--surface-2)", flexShrink: 0, marginLeft: "auto" }} />
      </button>

      {open && createPortal(
        <>
          {/* Panel — fixed, above trigger. Portaled to <body> because the
              hover-expanding sidebar has `transform` on itself (for the
              slide animation), which makes it the containing block for
              any position:fixed descendant — trapping this panel inside
              the sidebar's own overflow:hidden and clipping it. */}
          <div
            ref={panelRef}
            className="arca-card elev"
            data-arca-theme=""
            style={{
              position: "fixed",
              left: panelPos.left,
              top: panelPos.top,
              transform: "translateY(-100%)",
              width: 300,
              maxHeight: "calc(100vh - 32px)",
              overflowY: "auto",
              zIndex: 1000,
              padding: 18,
              fontSize: 13,
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
                  <div style={{ width: "100%", height: 36, borderRadius: 7, background: m.bg, border: "1px solid var(--hairline)", display: "grid", placeItems: "center", color: m.fg }}>
                    <m.Ic />
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 500, color: theme === m.id ? "var(--accent-deep)" : "var(--ink-2)" }}>
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
                  <span style={{ width: 22, height: 22, borderRadius: 6, flexShrink: 0, background: a.swatch, boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.1)" }} />
                  <span style={{ flex: 1, textAlign: "left", fontSize: 13, fontWeight: 500, color: accent === a.id ? "var(--accent-deep)" : "var(--ink)" }}>
                    {a.label}
                  </span>
                  {accent === a.id && <span style={{ color: "var(--accent-deep)" }}><CheckIc /></span>}
                </button>
              ))}

              {/* Custom accent — pick any color, not just the 5 presets */}
              <button
                type="button"
                onClick={() => customColorRef.current?.click()}
                style={{
                  width: "100%", padding: "8px 10px", borderRadius: 10,
                  display: "flex", alignItems: "center", gap: 12,
                  background: accent === "custom" ? "var(--accent-tint)" : "transparent",
                  border: `1px solid ${accent === "custom" ? "var(--accent-soft)" : "transparent"}`,
                  cursor: "pointer", fontFamily: "var(--f-sans)",
                }}
              >
                <span style={{
                  width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                  background: accent === "custom"
                    ? customColor
                    : "conic-gradient(from 0deg, #B6754A, #7C8A6B, #4F8B95, #9B6A8B, #B6754A)",
                  boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.1)",
                }} />
                <span style={{ flex: 1, textAlign: "left", fontSize: 13, fontWeight: 500, color: accent === "custom" ? "var(--accent-deep)" : "var(--ink)" }}>
                  Vlastní barva
                </span>
                {accent === "custom" && <span style={{ color: "var(--accent-deep)" }}><CheckIc /></span>}
                <input
                  ref={customColorRef}
                  type="color"
                  value={customColor}
                  onChange={(e) => handleCustomColor(e.target.value)}
                  style={{ position: "absolute", width: 1, height: 1, opacity: 0, pointerEvents: "none" }}
                  tabIndex={-1}
                  aria-hidden="true"
                />
              </button>
            </div>

            {/* Podsvícení (glow) */}
            <hr className="arca-divider" />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
              <span className="arca-kicker">Podsvícení</span>
              <button
                type="button"
                onClick={() => handleGlow(!glowOn)}
                className={`arca-switch${glowOn ? " on" : ""}`}
                aria-pressed={glowOn}
                title={glowOn ? "Vypnout podsvícení karet" : "Zapnout podsvícení karet"}
              />
            </div>
            <p className="arca-sub" style={{ fontSize: 11.5, margin: "0 0 4px" }}>
              Jemná záře kolem karet v barvě akcentu.
            </p>

            {/* Vlastní pozadí */}
            <hr className="arca-divider" />
            <div className="arca-kicker" style={{ marginBottom: 10 }}>Pozadí</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, marginBottom: 10 }}>
              {SCENES.map((s) => {
                const active = vibe === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setVibe(s.id)}
                    title={s.label}
                    style={{
                      ...scenePreview(s.id),
                      aspectRatio: "4/3", borderRadius: 8, cursor: "pointer",
                      border: `2px solid ${active ? "var(--accent)" : "transparent"}`,
                      position: "relative", overflow: "hidden",
                    }}
                  >
                    <span style={{ position: "absolute", inset: "auto 0 0 0", fontSize: 8.5, color: "#fff", background: "rgba(0,0,0,0.45)", padding: "1px 0", textAlign: "center" }}>
                      {s.label}
                    </span>
                  </button>
                );
              })}
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <input
                ref={bgUrlRef}
                type="url"
                defaultValue={customImageUrl}
                placeholder="URL vlastního obrázku…"
                onBlur={handleBgUrlCommit}
                onKeyDown={(e) => e.key === "Enter" && handleBgUrlCommit()}
                className="arca-input"
                style={{ padding: "7px 10px", fontSize: 11.5 }}
              />
              <button
                type="button"
                className="arca-btn sm arca-btn--outline icon-btn"
                disabled={uploading}
                onClick={() => bgFileRef.current?.click()}
                title="Nahrát vlastní obrázek"
              >
                {uploading ? "…" : <SparkIc />}
              </button>
              <input
                ref={bgFileRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleBgFile(f); e.target.value = ""; }}
              />
            </div>

            <hr className="arca-divider" />
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ color: "var(--accent)" }}><SparkIc /></span>
              <span className="arca-sub" style={{ fontSize: 12, lineHeight: 1.45 }}>
                Vzhled je tvůj. Tvoji blízcí uvidí ten svůj při doručení.
              </span>
            </div>
          </div>
        </>,
        document.body
      )}
    </>
  );
}
