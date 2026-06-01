"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createPackFull } from "@/app/actions/arca";
import ArcaRichEditor from "@/components/arca/ArcaRichEditor";

// ── Icons ─────────────────────────────────────────────────────────────────────

const Ic = ({ children, size = 16, style }: { children: React.ReactNode; size?: number; style?: React.CSSProperties }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" style={style}>
    {children}
  </svg>
);
const IcText     = () => <Ic><path d="M5 6h14M5 12h14M5 18h9"/></Ic>;
const IcVoice    = () => <Ic><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0"/><path d="M12 18v3"/></Ic>;
const IcVideo    = () => <Ic><rect x="3" y="6" width="13" height="12" rx="2"/><path d="M16 10l5-3v10l-5-3"/></Ic>;
const IcPhoto    = () => <Ic><rect x="3.5" y="5" width="17" height="14" rx="2"/><circle cx="9" cy="10.5" r="1.5"/><path d="M4 17l5-4 4 3 3-2 4 3"/></Ic>;
const IcArrow    = () => <Ic><path d="M5 12h14M13 6l6 6-6 6"/></Ic>;
const IcCalPlus  = () => <Ic><rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 9.5h17"/><path d="M12 13v5M9.5 15.5h5"/></Ic>;
const IcHeart    = () => <Ic><path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10Z"/></Ic>;
const IcLock     = () => <Ic><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></Ic>;
const IcChevron  = () => <Ic><path d="M9 6l6 6-6 6"/></Ic>;
const IcSparkle  = () => <Ic><path d="M12 4v4M12 16v4M4 12h4M16 12h4M6.5 6.5l2.8 2.8M14.7 14.7l2.8 2.8M17.5 6.5l-2.8 2.8M9.3 14.7L6.5 17.5"/></Ic>;
const IcMic      = IcVoice;
const IcEye      = () => <Ic><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></Ic>;
const IcBack     = () => <Ic><path d="M15 6l-6 6 6 6"/></Ic>;
const IcPlus     = () => <Ic><path d="M12 5v14M5 12h14"/></Ic>;
const IcX        = () => <Ic size={12}><path d="M18 6L6 18M6 6l12 12"/></Ic>;
const IcCheck    = () => <Ic size={12}><path d="M5 12l4 4 10-10"/></Ic>;

// ── Types ─────────────────────────────────────────────────────────────────────

type Kind = "text" | "voice" | "video" | "photo";
type Trigger = "date" | "event" | "sealed";
type PackType = "EMOTIONAL" | "PRACTICAL";

interface Recipient { id: string; name: string; email: string | null; groupId?: string | null; }
interface ContactGroup { id: string; name: string; color: string; emoji: string | null; }

interface Props {
  recipients: Recipient[];
  contactGroups: ContactGroup[];
  isPro: boolean;
  prefilledRecipientId?: string;
  prefilledOccasion?: "birthday" | "anniversary";
  prefilledDate?: string;
}

const KINDS: { id: Kind; label: string; sub: string; Ic: React.ComponentType }[] = [
  { id: "text",  label: "Text",  sub: "Dopis, vzpomínka, věta.", Ic: IcText },
  { id: "voice", label: "Hlas",  sub: "Tvůj hlas nahraný k poslechu.", Ic: IcVoice },
  { id: "video", label: "Video", sub: "Krátký film z tvojí strany kamery.", Ic: IcVideo },
  { id: "photo", label: "Fotky", sub: "Album s popiskem ke každé.", Ic: IcPhoto },
];

const TONE_GRADS: Record<string, string> = {
  clay: "linear-gradient(135deg, #B6754A, #8B5430)",
  sage: "linear-gradient(135deg, #7C8A6B, #5C6B4D)",
  sky:  "linear-gradient(135deg, #6F8AA8, #4B6685)",
  ink:  "linear-gradient(135deg, #3D3830, #1C1A16)",
};
const TONES = ["clay", "sage", "sky", "ink"];
function toneFor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return TONES[Math.abs(h) % TONES.length];
}
function initials(name: string): string {
  return name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");
}

// ── Step header ───────────────────────────────────────────────────────────────

function Step({ n, label }: { n: string; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
      <span style={{ fontFamily: "var(--f-mono)", color: "var(--accent)", fontSize: 12 }}>{n}</span>
      <h3 style={{ fontSize: 15, fontWeight: 550, letterSpacing: "-.005em", margin: 0 }}>{label}</h3>
      <div style={{ flex: 1, height: 1, background: "var(--hairline)" }} />
    </div>
  );
}

// ── Voice recorder demo ───────────────────────────────────────────────────────

function VoiceRecorder() {
  const [recording, setRecording] = useState(false);
  const [t, setT] = useState(0);
  useEffect(() => {
    if (!recording) return;
    const id = setInterval(() => setT((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [recording]);
  const mm = String(Math.floor(t / 60)).padStart(2, "0");
  const ss = String(t % 60).padStart(2, "0");
  return (
    <div className="arca-card" style={{ padding: 28, display: "flex", alignItems: "center", gap: 28 }}>
      <button
        type="button"
        onClick={() => setRecording((r) => !r)}
        style={{
          width: 64, height: 64, borderRadius: "50%",
          background: recording ? "var(--accent)" : "var(--ink)",
          color: "#fff", border: "none", cursor: "pointer",
          display: "grid", placeItems: "center",
          boxShadow: recording ? "0 0 0 8px var(--accent-tint)" : "var(--sh-2)",
          transition: "all .2s ease", flexShrink: 0,
        }}
      >
        {recording
          ? <div style={{ width: 18, height: 18, background: "#fff", borderRadius: 3 }} />
          : <IcMic />}
      </button>
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ fontFamily: "var(--f-serif)", fontSize: 22 }}>{mm}:{ss}</span>
          <span className="arca-mono" style={{ color: "var(--muted)" }}>{recording ? "● Nahrávám" : "Připraveno"}</span>
        </div>
        <div style={{ display: "flex", gap: 2, alignItems: "center", height: 36 }}>
          {Array.from({ length: 56 }).map((_, i) => {
            const h = 6 + Math.abs(Math.sin(i * 0.6) * 22) + (i % 5) * 2;
            const active = recording && i < (t * 0.9) % 56;
            return <div key={i} style={{ width: 3, height: h, background: active ? "var(--accent)" : "var(--hairline-2)", borderRadius: 2 }} />;
          })}
        </div>
      </div>
    </div>
  );
}

// ── Video placeholder ─────────────────────────────────────────────────────────

function VideoRecorder() {
  return (
    <div className="arca-card" style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ aspectRatio: "16/9", background: "linear-gradient(135deg, #2A241C, #1C1A16)", position: "relative", display: "grid", placeItems: "center" }}>
        <div style={{ color: "rgba(255,255,255,0.4)", textAlign: "center" }}>
          <IcVideo />
          <div style={{ marginTop: 12, fontSize: 13 }}>Nahrát z webkamery / přetáhnout soubor</div>
        </div>
        <span className="arca-mono" style={{ position: "absolute", top: 12, left: 12, color: "rgba(255,255,255,0.5)", fontSize: 11 }}>● PŘIPRAVENO</span>
      </div>
      <div style={{ padding: 14, display: "flex", gap: 10, justifyContent: "center" }}>
        <button type="button" className="arca-btn arca-btn--clay">● Nahrát</button>
        <button type="button" className="arca-btn arca-btn--outline">Vybrat soubor</button>
      </div>
    </div>
  );
}

// ── Photo picker placeholder ──────────────────────────────────────────────────

function PhotoPicker() {
  const colors = ["#E8D4C0","#D7DCCB","#D5DEE7","#EFE9DD","#F4E8DC","#E5EAD8","#DBE4ED"];
  const colorsB = ["#D4B89A","#B8C2A3","#B0BFD0","#D9D1BD","#E8D4C0","#A8B58C","#9AB0C5"];
  return (
    <div className="arca-card" style={{ padding: 22 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
        {colors.map((c, i) => (
          <div key={i} style={{ aspectRatio: "1", borderRadius: 10, background: `linear-gradient(${135 + i * 20}deg, ${c}, ${colorsB[i]})` }} />
        ))}
        <button type="button" style={{ aspectRatio: "1", borderRadius: 10, border: "1.5px dashed var(--hairline-2)", background: "transparent", color: "var(--muted)", display: "grid", placeItems: "center", cursor: "pointer" }}>
          + přidat
        </button>
      </div>
      <hr className="arca-divider" />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span className="arca-sub" style={{ fontSize: 12 }}>0 fotek</span>
        <button type="button" className="arca-btn sm arca-btn--ghost">Přidat popisek</button>
      </div>
    </div>
  );
}

// ── Trigger card ──────────────────────────────────────────────────────────────

function TriggerCard({ active, onClick, Ic: IconComp, title, sub }: {
  active: boolean; onClick: () => void;
  Ic: React.ComponentType; title: string; sub: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "16px 18px", textAlign: "left", cursor: "pointer", borderRadius: "var(--r-lg)",
        background: active ? "var(--ink)" : "var(--surface)",
        color: active ? "var(--bg)" : "var(--ink)",
        border: `1px solid ${active ? "var(--ink)" : "var(--hairline)"}`,
        display: "flex", flexDirection: "column", gap: 10, transition: "all .18s",
      }}
    >
      <span style={{ color: "var(--accent)" }}><IconComp /></span>
      <div style={{ fontWeight: 550, fontSize: 14 }}>{title}</div>
      <div style={{ fontSize: 12, color: active ? "rgba(255,255,255,0.6)" : "var(--muted)", marginTop: -4 }}>{sub}</div>
    </button>
  );
}

// ── Main Compose Wizard ───────────────────────────────────────────────────────

const OCCASION_TRIGGER_MAP: Record<string, Trigger> = {
  birthday: "date",
  anniversary: "date",
};

export default function ComposeWizard({ recipients, contactGroups, isPro, prefilledRecipientId, prefilledOccasion, prefilledDate }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Multi-recipient selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    prefilledRecipientId ? new Set([prefilledRecipientId]) : new Set()
  );
  const [newPeople, setNewPeople] = useState<{ name: string; email: string }[]>([]);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [kind, setKind] = useState<Kind>("text");
  const [trigger, setTrigger] = useState<Trigger>(
    prefilledOccasion ? (OCCASION_TRIGGER_MAP[prefilledOccasion] ?? "date") : "date"
  );
  const [packType, setPackType] = useState<PackType>("EMOTIONAL");
  const [text, setText] = useState("");
  const [bgColor,  setBgColor]  = useState<string | null>(null);
  const [txtColor, setTxtColor] = useState<string | null>(null);
  const [dateVal, setDateVal] = useState(prefilledDate ?? "");
  const [timeVal, setTimeVal] = useState("08:00");
  const [showPreview, setShowPreview] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Sync date from URL param — handles App Router component reuse across navigations
  useEffect(() => {
    if (prefilledDate) setDateVal(prefilledDate);
  }, [prefilledDate]);

  const selectedRecipients = recipients.filter(r => selectedIds.has(r.id));
  const allSelected = [...selectedRecipients, ...newPeople];
  const displayName = allSelected[0]?.name ?? "příjemce";

  function toggleId(id: string) {
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function toggleGroup(groupId: string) {
    const members = recipients.filter(r => r.groupId === groupId);
    const allIn = members.every(r => selectedIds.has(r.id));
    setSelectedIds(prev => {
      const n = new Set(prev);
      members.forEach(r => allIn ? n.delete(r.id) : n.add(r.id));
      return n;
    });
  }
  function addNewPerson() {
    if (!newName.trim()) return;
    setNewPeople(prev => [...prev, { name: newName.trim(), email: newEmail.trim() }]);
    setNewName(""); setNewEmail("");
  }
  function removeNewPerson(i: number) {
    setNewPeople(prev => prev.filter((_, idx) => idx !== i));
  }

  function handleSave(isDraft: boolean) {
    const title = `${displayName} — ${kind === "text" ? "Text" : kind === "voice" ? "Hlas" : kind === "video" ? "Video" : "Fotky"}`;
    const formData = new FormData();
    formData.set("type", packType);
    formData.set("title", title);
    selectedIds.forEach(id => formData.append("recipientId", id));
    formData.set("newPeople", JSON.stringify(newPeople));
    formData.set("kind", kind);
    formData.set("trigger", trigger);
    formData.set("date", dateVal);
    formData.set("time", timeVal);
    formData.set("text", text);
    formData.set("draft", isDraft ? "1" : "0");
    if (bgColor)  formData.set("backgroundColor", bgColor);
    if (txtColor) formData.set("textColor", txtColor);

    setSaveError(null);
    startTransition(async () => {
      const result = await createPackFull(null, formData);
      if ("error" in result) {
        setSaveError(result.error);
        return;
      }
      router.push("/dashboard/vault");
    });
  }

  const previewRecipient = allSelected[0];
  const tone = previewRecipient ? toneFor(previewRecipient.name) : "clay";
  const init = previewRecipient ? initials(previewRecipient.name) : "?";

  return (
    <div data-arca-theme="" style={{ minHeight: "100vh", background: "var(--bg)", fontFamily: "var(--f-sans)", color: "var(--ink)" }}>
      {/* Topbar */}
      <div className="arca-topbar">
        <div className="arca-topbar__crumbs">
          <span style={{ fontFamily: "var(--f-serif)", fontStyle: "italic", color: "var(--accent)" }}>arca</span>
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <IcChevron />
            <button onClick={() => router.back()} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", fontSize: 13, fontFamily: "var(--f-sans)" }}>
              Dashboard
            </button>
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <IcChevron />
            <span className="here">Nová zpráva</span>
          </span>
        </div>
        <div className="arca-grow" />
        {/* Pack type toggle — subtle, right side */}
        <div className="arca-seg" style={{ marginRight: 8 }}>
          <button className={packType === "EMOTIONAL" ? "active" : ""} onClick={() => setPackType("EMOTIONAL")}>✦ Emocionální</button>
          <button className={packType === "PRACTICAL" ? "active" : ""} onClick={() => setPackType("PRACTICAL")}>⬡ Praktická</button>
        </div>
      </div>

      <div className="arca-inner">
        <div style={{ marginBottom: 24 }}>
          <div className="arca-kicker">Nová zpráva</div>
          <h1 className="arca-h1" style={{ marginTop: 8 }}>Něco, co jednou <em>najdou.</em></h1>
        </div>

        <div className="arca-compose-split" style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 28 }}>
          {/* ── Left: editor steps ─────────────────────────────── */}
          <div className="arca-stack-5">

            {/* Step 01 — recipient */}
            <div>
              <Step n="01" label="Pro koho" />

              {/* Selected chips */}
              {allSelected.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                  {selectedRecipients.map(r => (
                    <div key={r.id} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 8px 5px 6px", borderRadius: "var(--r-pill)", background: "var(--ink)", color: "var(--bg)", fontSize: 12.5, fontWeight: 500, fontFamily: "var(--f-sans)" }}>
                      <span className="arca-avatar sm" style={{ background: "rgba(255,255,255,0.15)", fontSize: 9 }}>{initials(r.name)}</span>
                      {r.name.split(" ")[0]}
                      <button type="button" onClick={() => toggleId(r.id)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.6)", cursor: "pointer", padding: 0, display: "flex" }}><IcX /></button>
                    </div>
                  ))}
                  {newPeople.map((p, i) => (
                    <div key={i} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 8px 5px 6px", borderRadius: "var(--r-pill)", background: "var(--ink)", color: "var(--bg)", fontSize: 12.5, fontWeight: 500, fontFamily: "var(--f-sans)" }}>
                      <span className="arca-avatar sm" style={{ background: "rgba(255,255,255,0.15)", fontSize: 9 }}>{initials(p.name)}</span>
                      {p.name.split(" ")[0]}
                      <button type="button" onClick={() => removeNewPerson(i)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.6)", cursor: "pointer", padding: 0, display: "flex" }}><IcX /></button>
                    </div>
                  ))}
                </div>
              )}

              {/* Groups */}
              {contactGroups.length > 0 && (
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontFamily: "var(--f-mono)", fontSize: 10, textTransform: "uppercase", letterSpacing: ".1em", color: "var(--muted)", marginBottom: 6 }}>Skupiny</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {contactGroups.map(g => {
                      const members = recipients.filter(r => r.groupId === g.id);
                      const allIn = members.length > 0 && members.every(r => selectedIds.has(r.id));
                      return (
                        <button key={g.id} type="button" onClick={() => toggleGroup(g.id)} disabled={members.length === 0}
                          style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: "var(--r-pill)", border: `1.5px solid ${allIn ? "var(--ink)" : "var(--hairline)"}`, background: allIn ? "var(--ink)" : "var(--surface)", color: allIn ? "var(--bg)" : "var(--ink)", fontSize: 12, fontWeight: 500, cursor: members.length === 0 ? "default" : "pointer", opacity: members.length === 0 ? 0.4 : 1, transition: "all .15s", fontFamily: "var(--f-sans)" }}>
                          {g.emoji && <span>{g.emoji}</span>}
                          {g.name}
                          <span style={{ opacity: .6, fontSize: 11 }}>({members.length})</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Existing contacts */}
              {recipients.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
                  {recipients.map(r => {
                    const sel = selectedIds.has(r.id);
                    const t = toneFor(r.name);
                    return (
                      <button key={r.id} type="button" onClick={() => toggleId(r.id)}
                        style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 10px 6px 6px", borderRadius: "var(--r-pill)", border: `1.5px solid ${sel ? "var(--ink)" : "var(--hairline)"}`, background: sel ? "var(--ink)" : "var(--surface)", color: sel ? "var(--bg)" : "var(--ink)", fontSize: 12.5, fontWeight: 500, cursor: "pointer", transition: "all .15s", fontFamily: "var(--f-sans)" }}>
                        <span className="arca-avatar sm" style={{ background: sel ? "rgba(255,255,255,0.15)" : TONE_GRADS[t] }}>{initials(r.name)}</span>
                        {r.name.split(" ")[0]}
                        {sel && <IcCheck />}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* New person inline */}
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                <input className="arca-input" style={{ width: 150, padding: "7px 10px", fontSize: 13 }} placeholder="Jméno *" value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === "Enter" && addNewPerson()} />
                <input className="arca-input" style={{ width: 180, padding: "7px 10px", fontSize: 13 }} placeholder="E-mail" type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && addNewPerson()} />
                <button type="button" onClick={addNewPerson} disabled={!newName.trim()} className="arca-btn arca-btn--ghost sm" style={{ whiteSpace: "nowrap" }}><IcPlus /> Přidat</button>
              </div>
            </div>

            {/* Step 02 — kind */}
            <div>
              <Step n="02" label="Forma" />
              <div className="arca-kind-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14 }}>
                {KINDS.map((k) => {
                  const active = kind === k.id;
                  const isProOnly = (k.id === "voice" || k.id === "video") && !isPro;
                  return (
                    <button
                      key={k.id}
                      type="button"
                      onClick={() => { if (!isProOnly) setKind(k.id); }}
                      className={`arca-compose-tile ${active ? "active" : ""}`}
                      style={{ opacity: isProOnly ? 0.6 : 1, position: "relative" }}
                    >
                      <div style={{ width: 38, height: 38, borderRadius: 11, background: active ? "rgba(255,255,255,0.08)" : "var(--bg-tint)", display: "grid", placeItems: "center", color: active ? "var(--accent)" : "var(--ink-2)" }}>
                        <k.Ic />
                      </div>
                      <div style={{ fontWeight: 600, fontSize: 15 }}>{k.label}</div>
                      <div className="arca-sub" style={{ fontSize: 12.5 }}>{k.sub}</div>
                      {isProOnly && (
                        <span style={{ position: "absolute", top: 10, right: 10, fontSize: 10, fontFamily: "var(--f-mono)", background: "var(--accent-tint)", color: "var(--accent-deep)", padding: "2px 6px", borderRadius: 4 }}>
                          PRO
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 03 — content */}
            <div>
              <Step n="03" label="Obsah" />
              {kind === "text" && (
                <ArcaRichEditor
                  content={text}
                  onChange={setText}
                  placeholder={`Milý ${displayName},\n\nkdyž si tohle čteš…`}
                  minHeight={260}
                  backgroundColor={bgColor}
                  textColor={txtColor}
                  onThemeChange={(bg, text) => { setBgColor(bg); setTxtColor(text); }}
                />
              )}
              {kind === "voice" && <VoiceRecorder />}
              {kind === "video" && <VideoRecorder />}
              {kind === "photo" && <PhotoPicker />}
            </div>

            {/* Step 04 — trigger */}
            <div>
              <Step n="04" label="Kdy se otevře" />
              <div className="arca-trigger-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                <TriggerCard active={trigger === "date"}   onClick={() => setTrigger("date")}   Ic={IcCalPlus} title="V daný den"    sub="Konkrétní datum a čas." />
                <TriggerCard active={trigger === "event"}  onClick={() => setTrigger("event")}  Ic={IcHeart}   title="Při události" sub="Když nadejde okamžik." />
                <TriggerCard active={trigger === "sealed"} onClick={() => setTrigger("sealed")} Ic={IcLock}    title="Zapečetit"   sub="Doručit, až tu nebudu." />
              </div>

              {trigger === "date" && (
                <div className="arca-card arca-date-grid" style={{ padding: 18, marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                  <div>
                    <label className="arca-mono" style={{ color: "var(--muted)", fontSize: 11, display: "block", marginBottom: 6 }}>Datum</label>
                    <input type="date" className="arca-input" value={dateVal} onChange={(e) => setDateVal(e.target.value)} />
                  </div>
                  <div>
                    <label className="arca-mono" style={{ color: "var(--muted)", fontSize: 11, display: "block", marginBottom: 6 }}>Čas</label>
                    <input type="time" className="arca-input" value={timeVal} onChange={(e) => setTimeVal(e.target.value)} />
                  </div>
                  <div>
                    <label className="arca-mono" style={{ color: "var(--muted)", fontSize: 11, display: "block", marginBottom: 6 }}>Opakování</label>
                    <select className="arca-input">
                      <option value="once">Jednorázově</option>
                      <option value="year">Každý rok</option>
                    </select>
                  </div>
                </div>
              )}

              {trigger === "event" && (
                <div className="arca-card" style={{ padding: 18, marginTop: 12 }}>
                  <label className="arca-mono" style={{ color: "var(--muted)", fontSize: 11, display: "block", marginBottom: 6 }}>Spouštěč</label>
                  <select className="arca-input">
                    <option>Při dosažení 18 let</option>
                    <option>Na svatební den</option>
                    <option>Při narození prvního dítěte</option>
                    <option>Na vlastní výběr</option>
                  </select>
                  <p className="arca-sub" style={{ fontSize: 12.5, marginTop: 10 }}>
                    Strážci potvrdí, že okamžik nastal. ARCA pak zprávu doručí.
                  </p>
                </div>
              )}

              {trigger === "sealed" && (
                <div className="arca-card flat" style={{ background: "var(--bg-tint)", border: "none", padding: 18, marginTop: 12 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{ color: "var(--accent)" }}><IcLock /></span>
                    <span style={{ fontSize: 13, fontWeight: 550 }}>Zapečetěno</span>
                  </div>
                  <p className="arca-sub" style={{ fontSize: 12.5, margin: "6px 0 0" }}>
                    Otevře se až poté, co tři strážci nezávisle potvrdí. Předtím nikdo — ani my — neuvidí obsah.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* ── Right: preview ─────────────────────────────────── */}
          <div className="arca-compose-preview" style={{ position: "sticky", top: 90, alignSelf: "start" }}>
            <div className="arca-card elev" style={{ overflow: "hidden" }}>
              <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--hairline)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span className="arca-kicker">Náhled doručení</span>
                <button type="button" className="arca-btn sm arca-btn--ghost"><IcEye /></button>
              </div>

              <div style={{ padding: "20px 22px", background: "var(--bg-tint)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                  <span className="arca-avatar" style={{ background: TONE_GRADS[tone] }}>{init}</span>
                  <div>
                    <div style={{ fontWeight: 550, fontSize: 13.5 }}>Pro {displayName}</div>
                    <div className="arca-sub" style={{ fontSize: 11.5 }}>
                      {trigger === "date" && dateVal
                        ? new Date(dateVal).toLocaleDateString("cs-CZ", { day: "numeric", month: "long", year: "numeric" })
                        : trigger === "sealed" ? "Až přijde čas" : "Při události"}
                    </div>
                  </div>
                </div>
                {kind === "text" && text ? (
                  <div
                    dangerouslySetInnerHTML={{ __html: text }}
                    style={{ fontFamily: "var(--f-serif)", fontSize: 14, lineHeight: 1.55, color: "var(--ink-2)", maxHeight: 160, overflow: "hidden" }}
                  />
                ) : (
                  <p className="arca-sub" style={{ fontSize: 13, margin: 0, fontStyle: "italic" }}>
                    {kind === "voice" ? "Hlasová nahrávka" : kind === "video" ? "Video zpráva" : kind === "photo" ? "Fotoalbum" : "Začni psát…"}
                  </p>
                )}
              </div>

              <div style={{ padding: "14px 18px" }}>
                {[
                  ["Forma", kind === "text" ? "Text" : kind === "voice" ? "Hlas" : kind === "video" ? "Video" : "Fotky"],
                  ["Typ", packType === "EMOTIONAL" ? "Emocionální" : "Praktická"],
                  ["Spouštěč", trigger === "date" ? "Konkrétní datum" : trigger === "event" ? "Při události" : "Zapečetěno"],
                ].map(([label, value]) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ fontSize: 12, color: "var(--muted)" }}>{label}</span>
                    <span style={{ fontSize: 12.5, fontWeight: 500 }}>{value}</span>
                  </div>
                ))}
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 12, color: "var(--muted)" }}>Stav</span>
                  <span className="arca-chip clay"><span className="dot" /> Návrh</span>
                </div>

                <hr className="arca-divider" />

                <button
                  type="button"
                  disabled={isPending || (selectedIds.size === 0 && newPeople.length === 0)}
                  onClick={() => handleSave(false)}
                  className="arca-btn arca-btn--primary lg"
                  style={{ width: "100%", justifyContent: "center" }}
                >
                  {isPending ? "Ukládám…" : "Zapečetit a uložit"}
                  {!isPending && <IcArrow />}
                </button>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => handleSave(true)}
                  className="arca-btn arca-btn--ghost"
                  style={{ width: "100%", justifyContent: "center", marginTop: 6 }}
                >
                  Uložit jako koncept
                </button>
                {saveError && (
                  <p style={{ fontSize: 12, color: "var(--destructive, #e05454)", margin: "8px 0 0", textAlign: "center" }}>
                    {saveError}
                  </p>
                )}
              </div>
            </div>

            <p className="arca-sub" style={{ fontSize: 12, textAlign: "center", marginTop: 14, padding: "0 8px" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <IcLock /> Šifrováno end-to-end. Klíč drží jen ti, kterým je zpráva určená.
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
