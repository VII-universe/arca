"use client";

import { useState, useTransition } from "react";
import { updateProfile, updateSwitch, requestPasswordReset } from "@/app/actions/settings";

// ── Types ─────────────────────────────────────────────────────────────────────

interface UserSettingsData {
  switchEnabled: boolean;
  switchType: "INACTIVITY" | "SPECIFIC_DATE";
  inactivityDays: number;
  executeAt: string | null;
  gracePeriodDays: number;
}

interface Props {
  user: {
    name: string;
    email: string;
    lastActiveAt: string;
    isPremium: boolean;
    webhookSecret: string;
    settings: UserSettingsData | null;
  };
}

type Tab = "profile" | "security" | "switch";

// ── Icon helper ───────────────────────────────────────────────────────────────

const Ic = ({ children, size = 16 }: { children: React.ReactNode; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
);
const IcUser    = () => <Ic><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></Ic>;
const IcLock    = () => <Ic><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></Ic>;
const IcZap     = () => <Ic><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></Ic>;
const IcCopy    = () => <Ic size={13}><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></Ic>;
const IcCheck   = () => <Ic size={13}><path d="M5 12l4 4 10-10"/></Ic>;

// ── Label ─────────────────────────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label style={{
      fontSize: 11, fontFamily: "var(--f-mono)", color: "var(--muted)",
      display: "block", marginBottom: 6, letterSpacing: ".08em", textTransform: "uppercase",
    }}>
      {children}
    </label>
  );
}

// ── Feedback pill ─────────────────────────────────────────────────────────────

function Feedback({ msg }: { msg: { ok?: boolean; text: string } | null }) {
  if (!msg) return null;
  return (
    <span style={{
      fontSize: 12.5,
      color: msg.ok ? "#2d9e5c" : "var(--destructive, #e05454)",
      display: "flex", alignItems: "center", gap: 5,
    }}>
      {msg.ok ? <IcCheck /> : null}
      {msg.text}
    </span>
  );
}

// ── SettingsClient ────────────────────────────────────────────────────────────

export default function SettingsClient({ user }: Props) {
  const [tab, setTab] = useState<Tab>("profile");
  const [isPending, startTransition] = useTransition();

  // ── Profile state ──────────────────────────────────────────────────────────
  const [name, setName] = useState(user.name);
  const [profileMsg, setProfileMsg] = useState<{ ok?: boolean; text: string } | null>(null);

  // ── Security state ─────────────────────────────────────────────────────────
  const [resetMsg, setResetMsg] = useState<{ ok?: boolean; text: string } | null>(null);
  const [copied, setCopied] = useState(false);

  // ── Switch state ───────────────────────────────────────────────────────────
  const s = user.settings;
  const [switchEnabled, setSwitchEnabled] = useState(s?.switchEnabled ?? false);
  const [switchType, setSwitchType] = useState<"INACTIVITY" | "SPECIFIC_DATE">(
    s?.switchType ?? "INACTIVITY"
  );
  const [inactivityDays, setInactivityDays] = useState(s?.inactivityDays ?? 90);
  const [executeAt, setExecuteAt] = useState(s?.executeAt ? s.executeAt.slice(0, 10) : "");
  const [gracePeriodDays, setGracePeriodDays] = useState(s?.gracePeriodDays ?? 14);
  const [switchMsg, setSwitchMsg] = useState<{ ok?: boolean; text: string } | null>(null);

  // Computed
  const daysSinceActive = Math.floor(
    (Date.now() - new Date(user.lastActiveAt).getTime()) / 86_400_000
  );
  const daysUntilTrigger =
    switchEnabled && switchType === "INACTIVITY"
      ? Math.max(0, inactivityDays - daysSinceActive)
      : null;
  const progressPct = switchEnabled && switchType === "INACTIVITY"
    ? Math.min(100, (daysSinceActive / inactivityDays) * 100)
    : 0;
  const isUrgent = daysUntilTrigger != null && daysUntilTrigger < 10;

  // ── Actions ────────────────────────────────────────────────────────────────

  function saveProfile() {
    const fd = new FormData();
    fd.set("name", name);
    setProfileMsg(null);
    startTransition(async () => {
      const res = await updateProfile(fd);
      setProfileMsg("error" in res ? { text: res.error } : { ok: true, text: "Profil uložen." });
    });
  }

  function sendReset() {
    setResetMsg(null);
    startTransition(async () => {
      const res = await requestPasswordReset();
      setResetMsg(
        "error" in res
          ? { text: res.error }
          : { ok: true, text: "Odkaz pro reset hesla byl odeslán na tvůj e-mail." }
      );
    });
  }

  function copyWebhook() {
    navigator.clipboard.writeText(
      `${window.location.origin}/api/heartbeat/${user.webhookSecret}`
    ).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function saveSwitch() {
    setSwitchMsg(null);
    startTransition(async () => {
      const res = await updateSwitch({
        enabled: switchEnabled,
        type: switchType,
        inactivityDays,
        executeAt: executeAt || null,
        gracePeriodDays,
      });
      setSwitchMsg(
        "error" in res ? { text: res.error } : { ok: true, text: "Nastavení uloženo." }
      );
    });
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div
      data-arca-theme=""
      style={{ minHeight: "100vh", background: "var(--bg)", fontFamily: "var(--f-sans)", color: "var(--ink)" }}
    >
      {/* Topbar */}
      <div className="arca-topbar">
        <div className="arca-topbar__crumbs">
          <span style={{ fontFamily: "var(--f-serif)", fontStyle: "italic", color: "var(--accent)" }}>arca</span>
          <span style={{ color: "var(--muted)", fontSize: 13 }}>›</span>
          <span style={{ fontSize: 13 }}>Nastavení</span>
        </div>
      </div>

      <div className="arca-inner" style={{ maxWidth: 700 }}>
        {/* Heading */}
        <div style={{ marginBottom: 28 }}>
          <div className="arca-kicker">Nastavení</div>
          <h1 className="arca-h1" style={{ marginTop: 8 }}>
            Správa účtu a <em>mechanismů.</em>
          </h1>
        </div>

        {/* Tabs */}
        <div className="arca-seg" style={{ marginBottom: 28 }}>
          {([
            ["profile",  <IcUser key="u" />,  "Profil"],
            ["security", <IcLock key="l" />,  "Bezpečnost"],
            ["switch",   <IcZap key="z" />,   "Spouštěcí mechanismus"],
          ] as [Tab, React.ReactNode, string][]).map(([id, icon, label]) => (
            <button key={id} className={tab === id ? "active" : ""} onClick={() => setTab(id)}
              style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ opacity: .7 }}>{icon}</span>
              {label}
            </button>
          ))}
        </div>

        {/* ── PROFIL ──────────────────────────────────────────────────────────── */}
        {tab === "profile" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div className="arca-card" style={{ padding: 24 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, margin: "0 0 20px" }}>Osobní údaje</h3>
              <div style={{ display: "grid", gap: 16 }}>
                <div>
                  <Label>Jméno</Label>
                  <input
                    className="arca-input"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && saveProfile()}
                    style={{ width: "100%", fontSize: 14, padding: "9px 12px" }}
                  />
                </div>
                <div>
                  <Label>E-mail</Label>
                  <input
                    className="arca-input"
                    value={user.email}
                    readOnly
                    style={{ width: "100%", fontSize: 14, padding: "9px 12px", opacity: .5 }}
                  />
                  <p style={{ fontSize: 12, color: "var(--muted)", margin: "5px 0 0" }}>
                    E-mail není možné změnit zde. Kontaktuj podporu.
                  </p>
                </div>
              </div>
              <div style={{ marginTop: 20, display: "flex", alignItems: "center", gap: 12 }}>
                <button onClick={saveProfile} disabled={isPending} className="arca-btn arca-btn--primary">
                  {isPending ? "Ukládám…" : "Uložit profil"}
                </button>
                <Feedback msg={profileMsg} />
              </div>
            </div>

            <div className="arca-card" style={{ padding: 24 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, margin: "0 0 16px" }}>Přehled účtu</h3>
              {[
                ["Poslední přihlášení", daysSinceActive === 0 ? "Dnes" : `Před ${daysSinceActive} dny`],
                ["Tarif", user.isPremium ? "ARCA Pro" : "Základní"],
              ].map(([label, value]) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--hairline)" }}>
                  <span style={{ fontSize: 13, color: "var(--muted)" }}>{label}</span>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── BEZPEČNOST ──────────────────────────────────────────────────────── */}
        {tab === "security" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div className="arca-card" style={{ padding: 24 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, margin: "0 0 20px" }}>Heslo</h3>
              <p style={{ fontSize: 13, color: "var(--muted)", margin: "0 0 16px", lineHeight: 1.6 }}>
                Po kliknutí ti zašleme e-mail s odkazem pro bezpečný reset hesla.
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <button onClick={sendReset} disabled={isPending} className="arca-btn arca-btn--outline">
                  {isPending ? "Odesílám…" : "Odeslat odkaz pro reset hesla"}
                </button>
                <Feedback msg={resetMsg} />
              </div>
            </div>

            <div className="arca-card" style={{ padding: 24 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, margin: "0 0 8px" }}>Heartbeat webhook</h3>
              <p style={{ fontSize: 13, color: "var(--muted)", margin: "0 0 16px", lineHeight: 1.6 }}>
                Pošli POST request na tuto URL, aby si potvrdil aktivitu zvenčí — např. z terminálu, IoT zařízení nebo skriptu. Resetuje tvůj inaktivitní timer.
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{
                  flex: 1, fontFamily: "var(--f-mono, monospace)", fontSize: 11.5,
                  background: "var(--bg-tint)", border: "1px solid var(--hairline)",
                  borderRadius: 6, padding: "10px 14px", color: "var(--muted)",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  POST /api/heartbeat/{user.webhookSecret}
                </div>
                <button
                  onClick={copyWebhook}
                  className="arca-btn sm arca-btn--ghost"
                  style={{ flexShrink: 0, gap: 5 }}
                >
                  {copied ? <IcCheck /> : <IcCopy />}
                  {copied ? "Zkopírováno" : "Kopírovat"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── SPOUŠTĚCÍ MECHANISMUS ────────────────────────────────────────────── */}
        {tab === "switch" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

            {/* Status banner */}
            <div className="arca-card" style={{
              padding: 22,
              background: switchEnabled
                ? "linear-gradient(135deg, rgba(139,84,48,0.14), rgba(90,60,30,0.07))"
                : "var(--surface)",
              border: `1px solid ${switchEnabled ? "rgba(139,84,48,0.3)" : "var(--hairline)"}`,
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 5 }}>
                    <div style={{
                      width: 8, height: 8, borderRadius: "50%",
                      background: switchEnabled ? "var(--accent)" : "var(--muted)",
                      boxShadow: switchEnabled ? "0 0 0 4px var(--accent-tint)" : "none",
                      transition: "all .3s",
                    }} />
                    <span style={{ fontWeight: 600, fontSize: 15 }}>
                      {switchEnabled ? "Mechanismus aktivní" : "Mechanismus neaktivní"}
                    </span>
                  </div>
                  <p style={{ fontSize: 13, color: "var(--muted)", margin: 0, lineHeight: 1.5 }}>
                    {switchEnabled
                      ? switchType === "INACTIVITY"
                        ? `Schránky se odešlou po ${inactivityDays} dnech bez přihlášení. Aktuálně: ${daysSinceActive} dní.`
                        : `Schránky se odešlou dne ${executeAt ? new Date(executeAt).toLocaleDateString("cs-CZ", { day: "numeric", month: "long", year: "numeric" }) : "—"}.`
                      : "Zapni mechanismus a nastav podmínku automatického doručení."}
                  </p>
                </div>

                {/* Toggle */}
                <button
                  type="button"
                  onClick={() => setSwitchEnabled(v => !v)}
                  aria-label={switchEnabled ? "Deaktivovat" : "Aktivovat"}
                  style={{
                    width: 52, height: 28, borderRadius: 14, border: "none",
                    cursor: "pointer", flexShrink: 0, marginLeft: 20,
                    background: switchEnabled ? "var(--accent)" : "var(--hairline-2)",
                    position: "relative", transition: "background .2s",
                  }}
                >
                  <span style={{
                    position: "absolute", top: 3, width: 22, height: 22,
                    borderRadius: "50%", background: "#fff",
                    left: switchEnabled ? "calc(100% - 25px)" : "3px",
                    transition: "left .2s",
                    boxShadow: "0 1px 4px rgba(0,0,0,0.25)",
                  }} />
                </button>
              </div>
            </div>

            {/* Configuration */}
            <div className="arca-card" style={{
              padding: 24,
              opacity: switchEnabled ? 1 : 0.45,
              transition: "opacity .2s",
              pointerEvents: switchEnabled ? "auto" : "none",
            }}>
              <p className="arca-mono" style={{ fontSize: 11, color: "var(--muted)", margin: "0 0 16px", letterSpacing: ".08em", textTransform: "uppercase" }}>
                Podmínka spuštění
              </p>

              {/* Type picker */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
                {([
                  ["INACTIVITY",    "Nečinnost",        "Spustit pokud se nepřihlásím po dobu X dní."],
                  ["SPECIFIC_DATE", "Konkrétní datum",  "Spustit v přesně stanovený den."],
                ] as [string, string, string][]).map(([val, label, sub]) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setSwitchType(val as "INACTIVITY" | "SPECIFIC_DATE")}
                    style={{
                      padding: "14px 16px", textAlign: "left", cursor: "pointer",
                      borderRadius: "var(--r-lg)", transition: "all .15s",
                      background: switchType === val ? "var(--ink)" : "var(--surface)",
                      color: switchType === val ? "var(--bg)" : "var(--ink)",
                      border: `1px solid ${switchType === val ? "var(--ink)" : "var(--hairline)"}`,
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: 13.5, marginBottom: 4 }}>{label}</div>
                    <div style={{ fontSize: 11.5, color: switchType === val ? "rgba(255,255,255,0.55)" : "var(--muted)" }}>{sub}</div>
                  </button>
                ))}
              </div>

              {/* Inactivity params */}
              {switchType === "INACTIVITY" && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div>
                    <Label>Dní nečinnosti</Label>
                    <input type="number" className="arca-input" value={inactivityDays} min={7} max={3650}
                      onChange={e => setInactivityDays(Number(e.target.value))}
                      style={{ width: "100%", fontSize: 14, padding: "9px 12px" }}
                    />
                    <p style={{ fontSize: 11.5, color: "var(--muted)", margin: "5px 0 0" }}>Minimum 7 dní.</p>
                  </div>
                  <div>
                    <Label>Grace period (dní)</Label>
                    <input type="number" className="arca-input" value={gracePeriodDays} min={0} max={365}
                      onChange={e => setGracePeriodDays(Number(e.target.value))}
                      style={{ width: "100%", fontSize: 14, padding: "9px 12px" }}
                    />
                    <p style={{ fontSize: 11.5, color: "var(--muted)", margin: "5px 0 0" }}>Lhůta na zrušení po spuštění.</p>
                  </div>
                </div>
              )}

              {/* Date params */}
              {switchType === "SPECIFIC_DATE" && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div>
                    <Label>Datum doručení</Label>
                    <input type="date" className="arca-input" value={executeAt}
                      onChange={e => setExecuteAt(e.target.value)}
                      style={{ width: "100%", fontSize: 14, padding: "9px 12px" }}
                    />
                  </div>
                  <div>
                    <Label>Grace period (dní)</Label>
                    <input type="number" className="arca-input" value={gracePeriodDays} min={0} max={365}
                      onChange={e => setGracePeriodDays(Number(e.target.value))}
                      style={{ width: "100%", fontSize: 14, padding: "9px 12px" }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Live monitor */}
            {switchEnabled && switchType === "INACTIVITY" && (
              <div className="arca-card" style={{ padding: 20 }}>
                <p className="arca-mono" style={{ fontSize: 11, color: "var(--muted)", margin: "0 0 14px", letterSpacing: ".08em", textTransform: "uppercase" }}>
                  Stav monitoru
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 16 }}>
                  {[
                    ["Uplynulo", daysSinceActive, "dní"],
                    ["Limit",    inactivityDays,  "dní"],
                    ["Zbývá",   daysUntilTrigger ?? "—", daysUntilTrigger != null ? "dní" : ""],
                  ].map(([label, value, unit]) => (
                    <div key={String(label)} style={{
                      textAlign: "center", padding: "14px 8px",
                      background: "var(--bg-tint)", borderRadius: "var(--r-lg)",
                    }}>
                      <div style={{
                        fontSize: 30, fontWeight: 700, fontFamily: "var(--f-serif)",
                        color: isUrgent && label === "Zbývá" ? "#e05454" : "var(--accent)",
                        marginBottom: 2,
                        lineHeight: 1,
                      }}>
                        {value}
                      </div>
                      <div style={{ fontSize: 10.5, color: "var(--muted)", fontFamily: "var(--f-mono)" }}>
                        {unit} · {label}
                      </div>
                    </div>
                  ))}
                </div>
                {/* Progress bar */}
                <div style={{ height: 4, borderRadius: 2, background: "var(--hairline-2)", overflow: "hidden" }}>
                  <div style={{
                    height: "100%", borderRadius: 2,
                    width: `${progressPct}%`,
                    background: isUrgent ? "#e05454" : "var(--accent)",
                    transition: "width .6s ease",
                  }} />
                </div>
                {isUrgent && (
                  <p style={{ fontSize: 12, color: "#e05454", margin: "10px 0 0", display: "flex", alignItems: "center", gap: 5 }}>
                    <IcZap />
                    Mechanismus se spustí brzy. Přihlas se nebo odezva zrušíš timer.
                  </p>
                )}
              </div>
            )}

            {/* Save */}
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button onClick={saveSwitch} disabled={isPending} className="arca-btn arca-btn--primary">
                {isPending ? "Ukládám…" : "Uložit nastavení"}
              </button>
              <Feedback msg={switchMsg} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
