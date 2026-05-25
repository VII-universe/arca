"use client";

import { useState, useTransition, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { upsertContent, updatePackTitle } from "@/app/actions/arca";
import ArcaRichEditor from "./ArcaRichEditor";
import { upsertTrigger, activatePack, cancelDelivery, addRecipient, removeRecipient } from "@/app/actions/delivery";
import AppearanceButton from "@/components/layout/AppearanceButton";

// ── Icons ─────────────────────────────────────────────────────────────────────
const Ic = ({ d, size = 16, style }: { d: string | React.ReactNode; size?: number; style?: React.CSSProperties }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" style={style}>
    {typeof d === "string" ? <path d={d} /> : d}
  </svg>
);
const IcText   = () => <Ic d="M5 6h14M5 12h14M5 18h9" />;
const IcVoice  = () => <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round"><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0"/><path d="M12 18v3"/></svg>;
const IcVideo  = () => <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round"><rect x="3" y="6" width="13" height="12" rx="2"/><path d="M16 10l5-3v10l-5-3"/></svg>;
const IcPhoto  = () => <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round"><rect x="3.5" y="5" width="17" height="14" rx="2"/><circle cx="9" cy="10.5" r="1.5"/><path d="M4 17l5-4 4 3 3-2 4 3"/></svg>;
const IcArrow  = () => <Ic d="M5 12h14M13 6l6 6-6 6" size={14} />;
const IcCalPlus= () => <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round"><rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 9.5h17"/><path d="M12 13v5M9.5 15.5h5"/></svg>;
const IcLock   = () => <Ic d="M5 11V8a7 7 0 0 1 14 0v3M3 11h18v10H3z" size={14} />;
const IcChevL  = () => <Ic d="M15 6l-6 6 6 6" size={12} />;
const IcPlus   = () => <Ic d="M12 5v14M5 12h14" size={14} />;
const IcX      = () => <Ic d="M18 6L6 18M6 6l12 12" size={13} />;
const IcCheck  = () => <Ic d="M5 12l4 4 10-10" size={14} />;
const IcSparkle= () => <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}><path d="M12 4v4M12 16v4M4 12h4M16 12h4M6.5 6.5l2.8 2.8M14.7 14.7l2.8 2.8M17.5 6.5l-2.8 2.8M9.3 14.7L6.5 17.5"/></svg>;

type Kind = "text" | "voice" | "video" | "photo";
type TriggerKind = "date" | "inactivity" | "sealed" | "none";

interface Recipient { id: string; name: string; email: string | null; phone: string | null; challengeQuestion: string | null; }

export interface ArcaEditorNewProps {
  packId: string;
  packType: "EMOTIONAL" | "PRACTICAL";
  packStatus: string;
  initialTitle: string;
  initialContent: string;
  initialRecipients: Recipient[];
  initialTrigger: {
    type: "SPECIFIC_DATE" | "INACTIVITY" | "MANUAL_EMERGENCY";
    executeAtDate: Date | null;
    inactivityDaysLimit: number | null;
    gracePeriodDays: number;
  } | null;
}

function Step({ n, label }: { n: string; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
      <span style={{ fontFamily: "var(--f-mono)", color: "var(--accent)", fontSize: 12, flexShrink: 0 }}>{n}</span>
      <h3 style={{ fontSize: 15, fontWeight: 550, letterSpacing: "-.005em", margin: 0 }}>{label}</h3>
      <div style={{ flex: 1, height: 1, background: "var(--hairline)" }} />
    </div>
  );
}

function TriggerCard({ active, onClick, Ic: Icon, title, sub }: { active: boolean; onClick: () => void; Ic: React.ComponentType; title: string; sub: string }) {
  return (
    <button type="button" onClick={onClick} style={{
      padding: "14px 16px", textAlign: "left", cursor: "pointer", borderRadius: "var(--r-lg)",
      background: active ? "var(--ink)" : "var(--surface)",
      color: active ? "var(--bg)" : "var(--ink)",
      border: `1px solid ${active ? "var(--ink)" : "var(--hairline)"}`,
      display: "flex", flexDirection: "column", gap: 8, transition: "all .18s", fontFamily: "var(--f-sans)",
    }}>
      <span style={{ color: "var(--accent)" }}><Icon /></span>
      <div style={{ fontWeight: 550, fontSize: 13 }}>{title}</div>
      <div style={{ fontSize: 12, color: active ? "rgba(255,255,255,0.6)" : "var(--muted)", marginTop: -2 }}>{sub}</div>
    </button>
  );
}

const TONES = ["clay", "sage", "sky", "ink"];
function toneFor(name: string) {
  let h = 0; for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return TONES[Math.abs(h) % TONES.length];
}
function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join("");
}

const STATUS_CHIP: Record<string, { label: string; chip: string }> = {
  DRAFT:    { label: "Návrh",       chip: "" },
  ACTIVE:   { label: "Aktivní",     chip: "clay" },
  TRIGGERED:{ label: "Odesláno",    chip: "sage" },
  DELIVERED:{ label: "Doručeno",    chip: "sage" },
  GRACE_PERIOD:{ label: "Lhůta",   chip: "" },
  PENDING_GUARDIAN_APPROVAL:{ label: "Strážci", chip: "" },
  ARCHIVED: { label: "Archiv",      chip: "" },
};

export default function ArcaEditorNew({
  packId, packType, packStatus,
  initialTitle, initialContent, initialRecipients, initialTrigger,
}: ArcaEditorNewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Title
  const [title, setTitle] = useState(initialTitle);
  const titleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleTitleChange = (v: string) => {
    setTitle(v);
    if (titleTimer.current) clearTimeout(titleTimer.current);
    titleTimer.current = setTimeout(() => {
      startTransition(async () => { await updatePackTitle(packId, v); });
    }, 1000);
  };

  // Kind (derived from existing content — default text)
  const [kind] = useState<Kind>("text");

  // Text content
  const [text, setText] = useState(initialContent);

  // Recipients
  const [recipients, setRecipients] = useState<Recipient[]>(initialRecipients);
  const [showAddRecipient, setShowAddRecipient] = useState(false);
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [recipientPending, startRecipientTransition] = useTransition();

  // Trigger
  const initTriggerKind = (): TriggerKind => {
    if (!initialTrigger) return "none";
    if (initialTrigger.type === "SPECIFIC_DATE") return "date";
    if (initialTrigger.type === "INACTIVITY") return "inactivity";
    return "sealed";
  };
  const [triggerKind, setTriggerKind] = useState<TriggerKind>(initTriggerKind());
  const [dateVal, setDateVal] = useState(
    initialTrigger?.executeAtDate
      ? initialTrigger.executeAtDate.toISOString().split("T")[0]
      : ""
  );
  const [timeVal, setTimeVal] = useState(
    initialTrigger?.executeAtDate
      ? initialTrigger.executeAtDate.toTimeString().slice(0, 5)
      : "08:00"
  );
  const [inactivityDays, setInactivityDays] = useState(
    initialTrigger?.inactivityDaysLimit ?? 60
  );
  const [graceDays] = useState(initialTrigger?.gracePeriodDays ?? 14);
  const [status, setStatus] = useState(packStatus);

  const handleSave = useCallback(() => {
    setError(null);
    startTransition(async () => {
      // 1. Save text content
      const r1 = await upsertContent(packId, text);
      if ("error" in r1) { setError(r1.error); return; }

      // 2. Save trigger
      if (triggerKind === "date" && dateVal) {
        const r2 = await upsertTrigger(packId, {
          type: "SPECIFIC_DATE",
          executeAtDate: `${dateVal}T${timeVal}`,
          gracePeriodDays: graceDays,
        });
        if ("error" in r2) { setError(r2.error); return; }
      } else if (triggerKind === "inactivity") {
        const r2 = await upsertTrigger(packId, {
          type: "INACTIVITY",
          inactivityDaysLimit: inactivityDays,
          gracePeriodDays: graceDays,
        });
        if ("error" in r2) { setError(r2.error); return; }
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      router.refresh();
    });
  }, [packId, text, triggerKind, dateVal, timeVal, inactivityDays, graceDays, router]);

  const handleActivate = () => {
    startTransition(async () => {
      const r = await activatePack(packId);
      if ("error" in r) { setError(r.error); return; }
      setStatus("ACTIVE");
      router.refresh();
    });
  };

  const handleDeactivate = () => {
    startTransition(async () => {
      await cancelDelivery(packId);
      setStatus("DRAFT");
      router.refresh();
    });
  };

  const handleAddRecipient = () => {
    if (!recipientName.trim()) return;
    startRecipientTransition(async () => {
      const fd = new FormData();
      fd.set("packId", packId);
      fd.set("name", recipientName.trim());
      fd.set("email", recipientEmail.trim());
      const r = await addRecipient(null, fd);
      if (r && "error" in r) { setError(r.error); return; }
      setRecipients(prev => [...prev, {
        id: `tmp-${Date.now()}`,
        name: recipientName.trim(),
        email: recipientEmail.trim() || null,
        phone: null,
        challengeQuestion: null,
      }]);
      setRecipientName(""); setRecipientEmail(""); setShowAddRecipient(false);
      router.refresh();
    });
  };

  const handleRemoveRecipient = (id: string) => {
    startRecipientTransition(async () => {
      await removeRecipient(id);
      setRecipients(prev => prev.filter(r => r.id !== id));
      router.refresh();
    });
  };

  const st = STATUS_CHIP[status] ?? STATUS_CHIP.DRAFT;
  const displayName = recipients[0]?.name ?? "příjemce";

  return (
    <div data-arca-theme="" style={{ position: "fixed", inset: 0, zIndex: 50, overflowY: "auto", background: "var(--bg)", fontFamily: "var(--f-sans)", color: "var(--ink)" }}>
      {/* Topbar */}
      <div className="arca-topbar">
        <div className="arca-topbar__crumbs">
          <span style={{ fontFamily: "var(--f-serif)", fontStyle: "italic", color: "var(--accent)" }}>arca</span>
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}><path d="M9 6l6 6-6 6"/></svg>
            <Link href="/dashboard/vault" style={{ color: "var(--muted)", textDecoration: "none" }}>Schránka</Link>
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}><path d="M9 6l6 6-6 6"/></svg>
            <span style={{ color: "var(--ink)" }}>{title || "Zpráva"}</span>
          </span>
        </div>
        <div style={{ flex: 1 }} />
        <span className={`arca-chip ${st.chip}`} style={{ marginRight: 12 }}>{st.label}</span>
        <AppearanceButton />
      </div>

      <div className="arca-inner">
        {/* Page title */}
        <div style={{ marginBottom: 24 }}>
          <div className="arca-kicker">Editace zprávy</div>
          <h1 className="arca-h1" style={{ marginTop: 8 }}>
            Uprav, co <em>jednou najdou.</em>
          </h1>
        </div>

        <div className="arca-compose-split" style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 28 }}>
          {/* ── Left: steps ───────────────────────────────────────── */}
          <div className="arca-stack-5">

            {/* Title */}
            <div>
              <Step n="✦" label="Název zprávy" />
              <input
                value={title}
                onChange={e => handleTitleChange(e.target.value)}
                className="arca-input"
                style={{ fontSize: 15, fontWeight: 500 }}
                placeholder="Název zprávy…"
              />
            </div>

            {/* Step 01 – Recipients */}
            <div>
              <Step n="01" label="Pro koho" />
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {recipients.map(r => (
                  <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: "var(--r-md)", border: "1px solid var(--hairline)", background: "var(--surface)" }}>
                    <span className={`arca-avatar sm ${toneFor(r.name)}`}>{initials(r.name)}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 550, fontSize: 13.5 }}>{r.name}</div>
                      {r.email && <div style={{ fontSize: 12, color: "var(--muted)" }}>{r.email}</div>}
                    </div>
                    <button type="button" onClick={() => handleRemoveRecipient(r.id)} disabled={recipientPending}
                      style={{ padding: 6, borderRadius: 8, border: "none", background: "transparent", cursor: "pointer", color: "var(--muted)", display: "grid", placeItems: "center" }}>
                      <IcX />
                    </button>
                  </div>
                ))}

                {showAddRecipient ? (
                  <div style={{ padding: 16, borderRadius: "var(--r-lg)", border: "1px solid var(--hairline)", background: "var(--bg-tint)", display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      <input className="arca-input" placeholder="Celé jméno *" value={recipientName} onChange={e => setRecipientName(e.target.value)} style={{ fontSize: 13 }} />
                      <input className="arca-input" placeholder="E-mail" type="email" value={recipientEmail} onChange={e => setRecipientEmail(e.target.value)} style={{ fontSize: 13 }} />
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button type="button" onClick={handleAddRecipient} disabled={recipientPending || !recipientName.trim()} className="arca-btn arca-btn--primary sm">
                        <IcPlus /> Přidat
                      </button>
                      <button type="button" onClick={() => { setShowAddRecipient(false); setRecipientName(""); setRecipientEmail(""); }} className="arca-btn arca-btn--ghost sm">Zrušit</button>
                    </div>
                  </div>
                ) : (
                  <button type="button" onClick={() => setShowAddRecipient(true)} className="arca-card"
                    style={{ padding: "10px 14px", borderStyle: "dashed", background: "transparent", color: "var(--muted)", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                    <IcPlus /> Přidat příjemce
                  </button>
                )}
              </div>
            </div>

            {/* Step 02 – Kind */}
            <div>
              <Step n="02" label="Forma" />
              <div className="arca-kind-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
                {([
                  { id: "text" as Kind, label: "Text",  sub: "Dopis, věta.", Ic: IcText },
                  { id: "voice" as Kind, label: "Hlas", sub: "Nahraný hlas.", Ic: IcVoice },
                  { id: "video" as Kind, label: "Video", sub: "Krátké video.", Ic: IcVideo },
                  { id: "photo" as Kind, label: "Fotky", sub: "Album.", Ic: IcPhoto },
                ]).map(k => (
                  <div key={k.id} className={`arca-compose-tile ${kind === k.id ? "active" : ""}`} style={{ padding: 14, minHeight: 100 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 9, background: kind === k.id ? "rgba(255,255,255,0.08)" : "var(--bg-tint)", display: "grid", placeItems: "center", color: kind === k.id ? "var(--accent)" : "var(--ink-2)" }}>
                      <k.Ic />
                    </div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{k.label}</div>
                    <div className="arca-sub" style={{ fontSize: 11 }}>{k.sub}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Step 03 – Content */}
            <div>
              <Step n="03" label="Obsah" />
              <ArcaRichEditor
                content={text}
                onChange={setText}
                placeholder={`Milý ${displayName},\n\nkdyž si tohle čteš…`}
                packId={packId}
                minHeight={280}
              />
            </div>

            {/* Step 04 – Trigger */}
            <div>
              <Step n="04" label="Kdy se otevře" />
              <div className="arca-trigger-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                <TriggerCard active={triggerKind === "date"}       onClick={() => setTriggerKind("date")}       Ic={IcCalPlus} title="V daný den"     sub="Konkrétní datum." />
                <TriggerCard active={triggerKind === "inactivity"} onClick={() => setTriggerKind("inactivity")} Ic={IcLock}    title="Nečinnost"      sub="Po X dnech." />
                <TriggerCard active={triggerKind === "sealed"}     onClick={() => setTriggerKind("sealed")}     Ic={IcLock}    title="Zapečetit"      sub="Manuální potvrzení." />
              </div>

              {triggerKind === "date" && (
                <div className="arca-card arca-date-grid" style={{ padding: 18, marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={{ display: "block", fontFamily: "var(--f-mono)", color: "var(--muted)", fontSize: 11, marginBottom: 6 }}>Datum</label>
                    <input type="date" className="arca-input" value={dateVal} onChange={e => setDateVal(e.target.value)} />
                  </div>
                  <div>
                    <label style={{ display: "block", fontFamily: "var(--f-mono)", color: "var(--muted)", fontSize: 11, marginBottom: 6 }}>Čas</label>
                    <input type="time" className="arca-input" value={timeVal} onChange={e => setTimeVal(e.target.value)} />
                  </div>
                </div>
              )}

              {triggerKind === "inactivity" && (
                <div className="arca-card" style={{ padding: 18, marginTop: 12 }}>
                  <label style={{ display: "block", fontFamily: "var(--f-mono)", color: "var(--muted)", fontSize: 11, marginBottom: 6 }}>Počet dní nečinnosti</label>
                  <input type="number" className="arca-input" min={7} max={730} value={inactivityDays} onChange={e => setInactivityDays(Number(e.target.value))} style={{ maxWidth: 140 }} />
                  <p className="arca-sub" style={{ fontSize: 12.5, marginTop: 8 }}>Zpráva se otevře, pokud tě ARCA neuvidí {inactivityDays} dní v řadě.</p>
                </div>
              )}

              {triggerKind === "sealed" && (
                <div className="arca-card flat" style={{ background: "var(--bg-tint)", border: "none", padding: 18, marginTop: 12 }}>
                  <p className="arca-sub" style={{ fontSize: 12.5, margin: 0 }}>
                    Zpráva se otevře až po manuálním potvrzení strážci. Předtím nikdo obsah neuvidí.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* ── Right: preview & actions ──────────────────────────── */}
          <div className="arca-compose-preview" style={{ position: "sticky", top: 90, alignSelf: "start" }}>
            <div className="arca-card elev" style={{ overflow: "hidden" }}>
              {/* Preview header */}
              <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--hairline)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span className="arca-kicker">Náhled doručení</span>
                <span className={`arca-chip ${packType === "EMOTIONAL" ? "clay" : "sky"}`} style={{ fontSize: 10 }}>
                  {packType === "EMOTIONAL" ? "✦ Emocionální" : "⬡ Praktická"}
                </span>
              </div>

              {/* Preview body */}
              <div style={{ padding: "18px 20px", background: "var(--bg-tint)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  {recipients[0] && (
                    <>
                      <span className={`arca-avatar sm ${toneFor(recipients[0].name)}`}>{initials(recipients[0].name)}</span>
                      <div>
                        <div style={{ fontWeight: 550, fontSize: 13 }}>Pro {recipients[0].name}</div>
                        <div style={{ fontSize: 11, color: "var(--muted)" }}>
                          {triggerKind === "date" && dateVal
                            ? new Date(dateVal).toLocaleDateString("cs-CZ", { day: "numeric", month: "long", year: "numeric" })
                            : triggerKind === "inactivity" ? `Po ${inactivityDays} dnech nečinnosti`
                            : triggerKind === "sealed" ? "Při potvrzení strážci"
                            : "Bez spouštěče"}
                        </div>
                      </div>
                    </>
                  )}
                  {recipients.length === 0 && <span className="arca-sub" style={{ fontSize: 12 }}>Žádný příjemce</span>}
                </div>
                {text ? (
                  <div dangerouslySetInnerHTML={{ __html: text }} style={{ fontFamily: "var(--f-serif)", fontSize: 14, lineHeight: 1.55, color: "var(--ink-2)", maxHeight: 140, overflow: "hidden" }} />
                ) : (
                  <p style={{ fontFamily: "var(--f-serif)", fontStyle: "italic", fontSize: 14, color: "var(--muted-2)", margin: 0 }}>Začni psát…</p>
                )}
              </div>

              {/* Actions */}
              <div style={{ padding: "14px 18px" }}>
                {/* Status summary */}
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12, padding: "8px 0", borderBottom: "1px solid var(--hairline)" }}>
                  <span style={{ fontSize: 12, color: "var(--muted)" }}>Stav</span>
                  <span className={`arca-chip ${st.chip}`}>{st.label}</span>
                </div>

                {/* Error */}
                {error && (
                  <div style={{ fontSize: 12, color: "#C0392B", background: "rgba(192,57,43,0.08)", borderRadius: 8, padding: "8px 12px", marginBottom: 10 }}>
                    {error}
                  </div>
                )}

                {/* Save */}
                <button type="button" onClick={handleSave} disabled={isPending}
                  className="arca-btn arca-btn--primary lg"
                  style={{ width: "100%", justifyContent: "center", marginBottom: 8 }}>
                  {isPending ? "Ukládám…" : saved ? <><IcCheck /> Uloženo</> : <>Uložit změny <IcArrow /></>}
                </button>

                {/* Activate / Deactivate */}
                {status === "DRAFT" && (
                  <button type="button" onClick={handleActivate} disabled={isPending}
                    className="arca-btn arca-btn--clay"
                    style={{ width: "100%", justifyContent: "center", marginBottom: 6 }}>
                    Zapečetit a aktivovat <IcArrow />
                  </button>
                )}
                {(status === "ACTIVE" || status === "GRACE_PERIOD") && (
                  <button type="button" onClick={handleDeactivate} disabled={isPending}
                    className="arca-btn arca-btn--ghost"
                    style={{ width: "100%", justifyContent: "center", marginBottom: 6, fontSize: 12 }}>
                    Zrušit doručení
                  </button>
                )}

                <Link href="/dashboard/vault" className="arca-btn arca-btn--ghost"
                  style={{ width: "100%", justifyContent: "center", fontSize: 12, color: "var(--muted)" }}>
                  <IcChevL /> Zpět do schránky
                </Link>
              </div>
            </div>

            <p style={{ fontSize: 11.5, textAlign: "center", marginTop: 14, color: "var(--muted-2)" }}>
              <IcLock /> Šifrováno end-to-end.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
