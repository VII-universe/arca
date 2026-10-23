import { Suspense } from "react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import LoginForm from "./LoginForm";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export async function generateMetadata() {
  const t = await getTranslations("Auth");
  return { title: t("meta.title") };
}

export default async function LoginPage() {
  const t = await getTranslations("Auth");
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
      {/* Backdrop here is the always-dark VibeBackground showing through
          (background: transparent), independent of the user's light/dark
          preference — pin --ink/--muted/--accent to the dark-mode values
          so text stays legible against it regardless of that preference. */}
      <div style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "48px 56px",
        background: "transparent",
        borderRight: "1px solid var(--glass-border)",
        position: "relative",
        overflow: "hidden",
        ["--ink" as string]: "#F0EAE0",
        ["--ink-2" as string]: "#CCB89E",
        ["--muted" as string]: "#8A7D6E",
        ["--muted-2" as string]: "#5A5044",
        ["--accent" as string]: "#D08848",
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
                <path d="M5 19c0-8 3.5-14 7-14s7 6 7 14" stroke="color-mix(in srgb, var(--bg) 50%, transparent)" strokeWidth="1.8" strokeLinecap="round"/>
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
            {t("brand.tagline")}
          </p>
          <h2 style={{ fontFamily: "var(--f-serif)", fontWeight: 400, fontSize: 42, lineHeight: 1.2, margin: "0 0 20px", color: "var(--ink)" }}>
            {t("brand.headingLine1")}<br />
            <em style={{ color: "var(--accent)" }}>{t("brand.headingItalic")}</em><br />
            {t("brand.headingLine2")}
          </h2>
          <p style={{ color: "var(--muted)", fontSize: 14.5, lineHeight: 1.6, maxWidth: 360, margin: 0 }}>
            {t("brand.body")}
          </p>
        </div>

        {/* Bottom features */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, position: "relative", zIndex: 1 }}>
          {[
            { icon: "⊞", text: t("brand.featureEncrypted") },
            { icon: "✦", text: t("brand.featureGuardians") },
            { icon: "◈", text: t("brand.featureDelivery") },
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
        position: "relative",
      }}>
        <div style={{ position: "absolute", top: 24, right: 24 }}>
          <LanguageSwitcher />
        </div>
        <div style={{ width: "100%", maxWidth: 380 }}>
          {/* Heading */}
          <div style={{ marginBottom: 32 }}>
            <h1 style={{ fontFamily: "var(--f-serif)", fontWeight: 400, fontSize: 30, margin: "0 0 6px", color: "var(--ink)" }}>
              {t("form.heading")}
            </h1>
            <p style={{ color: "var(--muted)", fontSize: 14, margin: 0 }}>
              {t("form.subheading")}
            </p>
          </div>

          <Suspense>
            <LoginForm />
          </Suspense>

          <p style={{ textAlign: "center", fontSize: 12, color: "var(--muted-2)", marginTop: 28 }}>
            {t("form.legalPrefix")}{" "}
            <a href="#" style={{ color: "var(--muted)", textDecoration: "underline" }}>{t("form.terms")}</a>
            {" "}{t("form.and")}{" "}
            <a href="#" style={{ color: "var(--muted)", textDecoration: "underline" }}>{t("form.privacy")}</a>.
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
