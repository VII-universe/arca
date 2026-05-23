"use client";

import { useState, useTransition, useRef, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { addGuardian, removeGuardian, updateGuardian } from "@/app/actions/guardians";
import { assignGuardianGroup, createGroup, deleteGroup } from "@/app/actions/groups";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface GuardianGroup {
  id: string; name: string; color: string; emoji: string | null;
}
export interface GuardianItem {
  id: string; name: string; email: string; phone?: string | null;
  groupId: string | null; group: GuardianGroup | null;
}

// ── Color helpers ─────────────────────────────────────────────────────────────

const COLOR_OPTIONS = [
  { value: "clay", bg: "var(--accent-tint)", text: "var(--accent-deep)", border: "var(--accent-soft)",   label: "Terra" },
  { value: "sage", bg: "var(--sage-soft)",   text: "#4E5B3F",            border: "#C2D0B0",               label: "Sage"  },
  { value: "sky",  bg: "var(--sky-soft)",    text: "#3E5A7E",            border: "#AABFD8",               label: "Sky"   },
  { value: "ink",  bg: "var(--bg-tint)",     text: "var(--ink-2)",       border: "var(--hairline-2)",     label: "Ink"   },
];
const GROUP_PRESETS = [
  { name: "Rodina",   emoji: "👨‍👩‍👧", color: "clay" },
  { name: "Přátelé", emoji: "🤝",    color: "sage" },
  { name: "Kolegové",emoji: "💼",    color: "sky"  },
];
function colorFor(color: string) { return COLOR_OPTIONS.find(c => c.value === color) ?? COLOR_OPTIONS[0]; }

const TONES = ["sage", "sky", "clay", "ink"];
function toneFor(n: string) {
  let h = 0; for (let i = 0; i < n.length; i++) h = n.charCodeAt(i) + ((h << 5) - h);
  return TONES[Math.abs(h) % TONES.length];
}
function initials(n: string) {
  return n.split(" ").filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join("");
}

// ── Contact completeness ──────────────────────────────────────────────────────

function contactScore(fields: { email?: string; phone?: string }): { score: number; max: number; label: string; color: string } {
  const max = 2;
  const score = [fields.email, fields.phone].filter(Boolean).length;
  const label = score === 0 ? "Žádný kontakt" : score === 1 ? "Minimum" : "Dobré pokrytí";
  const color = score === 0 ? "var(--muted-2)" : score === 1 ? "#D4863A" : "var(--sage)";
  return { score, max, label, color };
}

function ContactDots({ score, max, color }: { score: number; max: number; color: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      {Array.from({ length: max }).map((_, i) => (
        <span key={i} style={{
          width: 6, height: 6, borderRadius: "50%",
          background: i < score ? color : "var(--hairline-2)",
          transition: "background .2s",
        }} />
      ))}
      <span style={{ fontSize: 11, color, fontFamily: "var(--f-mono)", marginLeft: 2 }}>
        {score}/{max}
      </span>
    </div>
  );
}

// ── Icons ─────────────────────────────────────────────────────────────────────
const IcPlus   = () => <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>;
const IcTrash  = () => <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>;
const IcChev   = () => <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M6 9l6 6 6-6"/></svg>;
const IcCheck  = () => <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M5 12l4 4 10-10"/></svg>;
const IcSpin   = () => <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ animation: "arca-spin .8s linear infinite" }}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>;
const IcDown   = () => <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M6 9l6 6 6-6"/></svg>;
const IcSettings = () => <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 14.2l1.4 1.2-1.7 3-1.8-.4a7.6 7.6 0 0 1-2 1.2L15 21h-3.4l-.3-1.8a7.6 7.6 0 0 1-2-1.2l-1.8.4-1.7-3 1.4-1.2a7.7 7.7 0 0 1 0-2.3L4.8 10.5l1.7-3 1.8.4a7.6 7.6 0 0 1 2-1.2L10.6 5H14l.3 1.7a7.6 7.6 0 0 1 2 1.2l1.8-.4 1.7 3-1.4 1.2a7.7 7.7 0 0 1 0 2.3Z"/></svg>;

// ── GroupPicker ───────────────────────────────────────────────────────────────

function GroupPicker({ guardianId, currentGroupId, groups, onAssign, onClose }: {
  guardianId: string; currentGroupId: string | null;
  groups: GuardianGroup[]; onAssign: (id: string, gid: string | null) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pending, startT] = useTransition();

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    const t = setTimeout(() => document.addEventListener("mousedown", h), 20);
    document.addEventListener("keydown", esc);
    return () => { clearTimeout(t); document.removeEventListener("mousedown", h); document.removeEventListener("keydown", esc); };
  }, [onClose]);

  function assign(gid: string | null) {
    if (gid === currentGroupId) { onClose(); return; }
    startT(async () => {
      const res = await assignGuardianGroup(guardianId, gid);
      if ("error" in res) { toast.error(res.error); return; }
      onAssign(guardianId, gid);
      onClose();
    });
  }

  return (
    <div ref={ref} data-arca-theme="" style={{
      position: "absolute", bottom: "calc(100% + 6px)", left: 0, zIndex: 200,
      background: "var(--surface-2)", border: "1px solid var(--hairline-2)",
      borderRadius: "var(--r-lg)", boxShadow: "var(--sh-3)", minWidth: 180,
      overflow: "hidden", animation: "gpIn .15s cubic-bezier(.22,1,.36,1) both",
    }}>
      <div style={{ padding: "5px 0" }}>
        {groups.map(g => {
          const c = colorFor(g.color); const sel = g.id === currentGroupId;
          return (
            <button key={g.id} type="button" disabled={pending} onClick={() => assign(g.id)}
              style={{ display:"flex", alignItems:"center", gap:10, width:"100%", padding:"8px 14px",
                border:"none", background: sel ? c.bg : "transparent", cursor:"pointer", textAlign:"left" }}>
              <span style={{ width:8, height:8, borderRadius:"50%", background:c.text, opacity:.7, flexShrink:0 }}/>
              <span style={{ flex:1, fontSize:13, fontFamily:"var(--f-sans)", color:"var(--ink)" }}>
                {g.emoji && <span style={{ marginRight:4 }}>{g.emoji}</span>}{g.name}
              </span>
              {sel && <IcCheck />}
            </button>
          );
        })}
        {groups.length > 0 && <div style={{ height:1, background:"var(--hairline)", margin:"3px 0" }}/>}
        <button type="button" disabled={pending} onClick={() => assign(null)}
          style={{ display:"flex", alignItems:"center", gap:10, width:"100%", padding:"8px 14px",
            border:"none", background: !currentGroupId ? "var(--bg-tint)" : "transparent", cursor:"pointer" }}>
          <span style={{ width:8, height:8, borderRadius:"50%", border:"1.5px dashed var(--muted-2)", flexShrink:0 }}/>
          <span style={{ fontSize:13, fontFamily:"var(--f-sans)", color:"var(--muted)" }}>Bez skupiny</span>
          {!currentGroupId && <IcCheck />}
        </button>
      </div>
    </div>
  );
}

// ── GuardianCard ──────────────────────────────────────────────────────────────

function GuardianCard({ guardian: initial, groups, showGroupChip, onRemove, onGroupAssign, onUpdated }: {
  guardian: GuardianItem; groups: GuardianGroup[]; showGroupChip: boolean;
  onRemove: (id: string) => void;
  onGroupAssign: (id: string, groupId: string | null) => void;
  onUpdated: (id: string, data: Partial<GuardianItem>) => void;
}) {
  const [guardian, setGuardian] = useState(initial);
  const [pickerOpen, setPicker] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [editing, setEditing]     = useState(false);
  const [removing, startRemove]   = useTransition();
  const [saving,   startSave]     = useTransition();

  // Edit form state
  const [editName,  setEditName]  = useState(guardian.name);
  const [editEmail, setEditEmail] = useState(guardian.email);
  const [editPhone, setEditPhone] = useState(guardian.phone ?? "");

  function openEdit() {
    setEditName(guardian.name);
    setEditEmail(guardian.email);
    setEditPhone(guardian.phone ?? "");
    setEditing(true);
  }

  function handleSave() {
    startSave(async () => {
      const res = await updateGuardian(guardian.id, {
        name:  editName,
        email: editEmail,
        phone: editPhone || null,
      });
      if ("error" in res) { toast.error(res.error); return; }
      const updated = { ...guardian, name: editName, email: editEmail, phone: editPhone || null };
      setGuardian(updated);
      onUpdated(guardian.id, updated);
      toast.success("Strážce uložen.");
      setEditing(false);
    });
  }

  function handleRemove() {
    startRemove(async () => {
      await removeGuardian(guardian.id);
      onRemove(guardian.id);
      toast.success(`${guardian.name} odebrán ze strážců.`);
    });
  }

  const tone = toneFor(guardian.name);
  const c = guardian.group ? colorFor(guardian.group.color) : null;
  const editScore = contactScore({ email: editEmail, phone: editPhone });
  const viewScore = contactScore({ email: guardian.email, phone: guardian.phone ?? undefined });

  return (
    <div className="arca-card" style={{ overflow: "hidden" }}>
      {/* ── View row ─────────────────────────────────── */}
      <div style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: 14 }}>
        <span className={`arca-avatar lg ${tone}`} style={{ flexShrink: 0 }}>
          {initials(guardian.name)}
        </span>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontWeight: 550, fontSize: 14.5 }}>{guardian.name}</span>
            <span className="arca-chip sage" style={{ fontSize: 10.5 }}>
              <svg width={9} height={9} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M5 12l4 4 10-10"/></svg>
              Potvrzeno
            </span>
          </div>
          <div className="arca-sub" style={{ fontSize: 12.5, marginTop: 2 }}>
            {guardian.email}
            {guardian.phone && <span style={{ opacity: .6 }}> · {guardian.phone}</span>}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8, flexWrap: "wrap" }}>
            <ContactDots score={viewScore.score} max={viewScore.max} color={viewScore.color} />

            {showGroupChip && (
              <div style={{ position: "relative", display: "inline-block" }}>
                <button type="button" onClick={() => setPicker(o => !o)} style={{
                  display: "inline-flex", alignItems: "center", gap: 4,
                  padding: "3px 9px", borderRadius: "var(--r-pill)", border: "1px solid",
                  borderColor: c ? c.border : "var(--hairline-2)",
                  background: c ? c.bg : "var(--surface-2)",
                  color: c ? c.text : "var(--muted-2)",
                  fontSize: 11.5, cursor: "pointer", fontFamily: "var(--f-sans)",
                }}>
                  {guardian.group?.emoji && <span style={{ fontSize: 12 }}>{guardian.group.emoji}</span>}
                  <span>{guardian.group?.name ?? "Skupina"}</span>
                  <IcChev />
                </button>
                {pickerOpen && (
                  <GroupPicker guardianId={guardian.id} currentGroupId={guardian.groupId}
                    groups={groups}
                    onAssign={(id, gid) => {
                      const g = gid ? groups.find(x => x.id === gid) ?? null : null;
                      onGroupAssign(id, gid);
                      setGuardian(prev => ({ ...prev, groupId: gid, group: g }));
                      toast.success(g ? `Přiřazeno do skupiny „${g.name}".` : "Skupina odebrána.");
                    }}
                    onClose={() => setPicker(false)} />
                )}
              </div>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
          {/* Settings / edit */}
          <button
            type="button"
            onClick={() => editing ? setEditing(false) : openEdit()}
            className="arca-btn sm arca-btn--ghost"
            style={{ color: editing ? "var(--accent)" : "var(--muted)", padding: "6px 8px" }}
            title="Upravit strážce"
          >
            <IcSettings />
          </button>

          {/* Delete */}
          {confirming ? (
            <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
              <span className="arca-sub" style={{ fontSize: 11.5 }}>Odebrat?</span>
              <button type="button" onClick={handleRemove} disabled={removing}
                className="arca-btn sm" style={{ color: "#c00", borderColor: "#fcc", padding: "4px 8px" }}>
                {removing ? <IcSpin /> : "Ano"}
              </button>
              <button type="button" onClick={() => setConfirming(false)}
                className="arca-btn sm arca-btn--ghost" style={{ padding: "4px 8px" }}>Ne</button>
            </div>
          ) : (
            <button type="button" onClick={() => setConfirming(true)}
              className="arca-btn sm arca-btn--ghost" style={{ color: "var(--muted)", padding: "6px 8px" }}
              title="Odebrat strážce">
              <IcTrash />
            </button>
          )}
        </div>
      </div>

      {/* ── Inline edit panel ─────────────────────────── */}
      {editing && (
        <div style={{
          borderTop: "1px solid var(--hairline)", padding: "16px 20px",
          background: "var(--bg-tint)",
          animation: "gpIn .16s cubic-bezier(.22,1,.36,1) both",
        }}>
          <div className="arca-form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
            <div>
              <label className="arca-mono" style={{ color: "var(--muted)", fontSize: 10, display: "block", marginBottom: 5 }}>Jméno</label>
              <input
                className="arca-input"
                value={editName}
                onChange={e => setEditName(e.target.value)}
                style={{ fontSize: 13 }}
              />
            </div>
            <div>
              <label className="arca-mono" style={{ color: "var(--muted)", fontSize: 10, display: "block", marginBottom: 5 }}>E-mail</label>
              <input
                type="email"
                className="arca-input"
                value={editEmail}
                onChange={e => setEditEmail(e.target.value)}
                style={{ fontSize: 13 }}
              />
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label className="arca-mono" style={{ color: "var(--muted)", fontSize: 10, display: "block", marginBottom: 5 }}>Telefon</label>
            <input
              type="tel"
              className="arca-input"
              placeholder="+420 600 000 000"
              value={editPhone}
              onChange={e => setEditPhone(e.target.value)}
              style={{ fontSize: 13 }}
            />
          </div>

          {/* Completeness preview */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <ContactDots score={editScore.score} max={editScore.max} color={editScore.color} />
            <span style={{ fontSize: 11.5, color: editScore.color, fontFamily: "var(--f-sans)" }}>
              {editScore.label}
            </span>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !editName.trim() || !editEmail.trim()}
              className="arca-btn arca-btn--primary sm"
            >
              {saving ? <IcSpin /> : <IcCheck />} Uložit
            </button>
            <button type="button" onClick={() => setEditing(false)} className="arca-btn arca-btn--ghost sm">
              Zrušit
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── AddGuardianForm ───────────────────────────────────────────────────────────

const CHANNEL_SECTIONS = [
  {
    key: "contacts", label: "Telefon & WhatsApp",
    fields: [
      { name: "phone",    label: "Telefon",   placeholder: "+420 600 000 000", type: "tel"   },
      { name: "whatsapp", label: "WhatsApp",  placeholder: "+420 600 000 000", type: "tel"   },
    ],
  },
];

function AddGuardianForm({ onAdded }: { onAdded: (g: GuardianItem) => void }) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, startT] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  // Live completeness tracking
  const [vals, setVals] = useState<Record<string, string>>({});
  const score = contactScore({ email: vals.email, phone: vals.phone });

  function handleAdd(formData: FormData) {
    setError(null);
    startT(async () => {
      try {
        await addGuardian(formData);
        const name  = (formData.get("name") as string).trim();
        const email = (formData.get("email") as string).trim().toLowerCase();
        const phone = (formData.get("phone") as string)?.trim() || undefined;
        onAdded({ id: `temp-${Date.now()}`, name, email, phone, groupId: null, group: null });
        toast.success(`${name} přidán/a jako strážce.`);
        setOpen(false);
        formRef.current?.reset();
        setVals({});
      } catch (err) {
        setError(err instanceof Error ? err.message : "Chyba při přidávání");
      }
    });
  }

  if (!open) {
    return (
      <button type="button" className="arca-card" onClick={() => setOpen(true)}
        style={{ width:"100%", padding:"14px 18px", display:"flex", alignItems:"center",
          gap:10, borderStyle:"dashed", background:"transparent",
          color:"var(--muted)", cursor:"pointer", justifyContent:"center" }}>
        <IcPlus /> Pozvat dalšího strážce
      </button>
    );
  }

  return (
    <div className="arca-card flat" style={{ background:"var(--bg-tint)", border:"none", padding:20 }}>
      {error && (
        <p style={{ fontSize:12, color:"#C0392B", background:"rgba(192,57,43,.08)",
          borderRadius:8, padding:"8px 12px", marginBottom:12 }}>{error}</p>
      )}

      <form ref={formRef} action={handleAdd}>
        {/* Required fields */}
        <div className="arca-form-grid" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:12 }}>
          <div>
            <label className="arca-mono" style={{ color:"var(--muted)", fontSize:10, display:"block", marginBottom:5 }}>Celé jméno *</label>
            <input name="name" required placeholder="Jan Novák" className="arca-input" style={{ fontSize:13 }}
              onChange={e => setVals(v => ({ ...v, name: e.target.value }))} />
          </div>
          <div>
            <label className="arca-mono" style={{ color:"var(--muted)", fontSize:10, display:"block", marginBottom:5 }}>E-mail *</label>
            <input name="email" type="email" required placeholder="jan@example.com" className="arca-input" style={{ fontSize:13 }}
              onChange={e => setVals(v => ({ ...v, email: e.target.value }))} />
          </div>
        </div>

        {/* Expandable channel sections */}
        {CHANNEL_SECTIONS.map(section => (
          <div key={section.key} style={{ marginBottom: 10 }}>
            <button type="button"
              onClick={() => setExpanded(e => ({ ...e, [section.key]: !e[section.key] }))}
              style={{ display:"flex", alignItems:"center", gap:6, background:"none", border:"none",
                cursor:"pointer", color:"var(--muted)", fontSize:12.5, fontFamily:"var(--f-sans)",
                padding:"4px 0", width:"100%", textAlign:"left" }}>
              <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
                style={{ transform: expanded[section.key] ? "rotate(90deg)" : undefined, transition:"transform .15s" }}>
                <path d="M9 6l6 6-6 6"/>
              </svg>
              {section.label}
            </button>
            {expanded[section.key] && (
              <div className="arca-form-grid" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginTop:8 }}>
                {section.fields.map(f => (
                  <div key={f.name}>
                    <label className="arca-mono" style={{ color:"var(--muted)", fontSize:10, display:"block", marginBottom:5 }}>{f.label}</label>
                    <input name={f.name} type={f.type} placeholder={f.placeholder} className="arca-input" style={{ fontSize:13 }}
                      onChange={e => setVals(v => ({ ...v, [f.name]: e.target.value }))} />
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Security challenge */}
        <div style={{ marginBottom: 14 }}>
          <button type="button"
            onClick={() => setExpanded(e => ({ ...e, challenge: !e.challenge }))}
            style={{ display:"flex", alignItems:"center", gap:6, background:"none", border:"none",
              cursor:"pointer", color:"var(--muted)", fontSize:12.5, fontFamily:"var(--f-sans)",
              padding:"4px 0", width:"100%", textAlign:"left" }}>
            <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
              style={{ transform: expanded.challenge ? "rotate(90deg)" : undefined, transition:"transform .15s" }}>
              <path d="M9 6l6 6-6 6"/>
            </svg>
            Bezpečnostní otázka
          </button>
          {expanded.challenge && (
            <div style={{ display:"flex", flexDirection:"column", gap:8, marginTop:8 }}>
              <p className="arca-sub" style={{ fontSize:12, margin:0 }}>
                Tato otázka chrání přístup — příjemce musí znát odpověď, aby zprávu otevřel.
              </p>
              <input name="challengeQuestion" placeholder="Jak se jmenoval náš první pes?" className="arca-input" style={{ fontSize:13 }} />
              <input name="challengeAnswer" placeholder="Odpověď (uchovává se zahashovaná)" className="arca-input" style={{ fontSize:13 }} />
            </div>
          )}
        </div>

        {/* Completeness indicator */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <ContactDots score={score.score} max={score.max} color={score.color} />
            <span style={{ fontSize:11.5, color: score.color, fontFamily:"var(--f-sans)" }}>{score.label}</span>
          </div>
        </div>

        <div style={{ display:"flex", gap:8 }}>
          <button type="submit" disabled={pending} className="arca-btn arca-btn--primary sm">
            {pending ? <IcSpin /> : <IcPlus />} Přidat strážce
          </button>
          <button type="button" className="arca-btn arca-btn--ghost sm"
            onClick={() => { setOpen(false); setError(null); setVals({}); }}>
            Zrušit
          </button>
        </div>
      </form>
    </div>
  );
}

// ── CreateGroupPanel ──────────────────────────────────────────────────────────

function CreateGroupPanel({ onCreated, onClose }: {
  onCreated: (g: GuardianGroup) => void; onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [color, setColor] = useState("sage");
  const [emoji, setEmoji] = useState("");
  const [pending, startT] = useTransition();
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);

  function save() {
    if (!name.trim()) return;
    startT(async () => {
      const res = await createGroup({ name, color, emoji: emoji || undefined });
      if ("error" in res) { toast.error(res.error); return; }
      onCreated(res);
      toast.success(`Skupina „${res.name}" vytvořena.`);
      onClose();
    });
  }

  return (
    <div data-arca-theme="" style={{ background:"var(--bg-tint)", border:"1px solid var(--hairline-2)",
      borderRadius:"var(--r-lg)", padding:"16px 18px", marginBottom:14,
      animation:"gpIn .18s cubic-bezier(.22,1,.36,1) both" }}>
      <div style={{ display:"flex", gap:6, marginBottom:10, flexWrap:"wrap" }}>
        {GROUP_PRESETS.map(p => (
          <button key={p.name} type="button"
            onClick={() => { setName(p.name); setColor(p.color); setEmoji(p.emoji); ref.current?.focus(); }}
            className="arca-btn sm arca-btn--outline" style={{ fontSize:12 }}>
            {p.emoji} {p.name}
          </button>
        ))}
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 54px", gap:8, marginBottom:10 }}>
        <input ref={ref} className="arca-input" placeholder="Název skupiny…"
          value={name} onChange={e => setName(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") save(); if (e.key === "Escape") onClose(); }} />
        <input className="arca-input" placeholder="😀" value={emoji}
          onChange={e => setEmoji(e.target.value)} style={{ textAlign:"center", fontSize:17 }} maxLength={4} />
      </div>
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
        <span className="arca-mono" style={{ color:"var(--muted)", fontSize:11 }}>Barva</span>
        {COLOR_OPTIONS.map(c => (
          <button key={c.value} type="button" onClick={() => setColor(c.value)} title={c.label}
            style={{ width:18, height:18, borderRadius:"50%", border:"2px solid",
              borderColor: color === c.value ? c.text : "transparent",
              background:c.bg, cursor:"pointer",
              boxShadow: color === c.value ? `0 0 0 3px ${c.border}` : undefined }} />
        ))}
      </div>
      <div style={{ display:"flex", gap:8 }}>
        <button type="button" onClick={save} disabled={pending || !name.trim()} className="arca-btn arca-btn--primary sm">
          {pending ? <IcSpin /> : <IcPlus />} Vytvořit
        </button>
        <button type="button" onClick={onClose} className="arca-btn arca-btn--ghost sm">Zrušit</button>
      </div>
    </div>
  );
}

// ── Main GuardianListClient ───────────────────────────────────────────────────

export default function GuardianListClient({ initialGuardians, initialGroups }: {
  initialGuardians: GuardianItem[];
  initialGroups: GuardianGroup[];
}) {
  const [guardians, setGuardians] = useState(initialGuardians);
  const [groups, setGroups]       = useState(initialGroups);
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [showCreate, setShowCreate]   = useState(false);
  const [, startDeleteG] = useTransition();

  const hasGroups = groups.length > 0;

  const handleGroupAssign = useCallback((id: string, groupId: string | null) => {
    const g = groupId ? groups.find(x => x.id === groupId) ?? null : null;
    setGuardians(prev => prev.map(gd => gd.id === id ? { ...gd, groupId, group: g } : gd));
  }, [groups]);

  function handleDeleteGroup(id: string) {
    startDeleteG(async () => {
      const res = await deleteGroup(id);
      if ("error" in res) { toast.error(res.error); return; }
      toast.success("Skupina smazána.");
      setGroups(prev => prev.filter(g => g.id !== id));
      setGuardians(prev => prev.map(g => g.groupId === id ? { ...g, groupId: null, group: null } : g));
      if (activeGroup === id) setActiveGroup(null);
    });
  }

  // Build display sections
  let displayedGuardians: GuardianItem[] = [];
  let sections: { group: GuardianGroup | null; items: GuardianItem[] }[] = [];

  if (!hasGroups) {
    displayedGuardians = guardians;
  } else if (activeGroup !== null) {
    displayedGuardians = guardians.filter(g => g.groupId === activeGroup);
  } else {
    const grouped = groups.map(g => ({
      group: g,
      items: guardians.filter(gd => gd.groupId === g.id),
    })).filter(s => s.items.length > 0);
    const ungrouped = guardians.filter(g => !g.groupId);
    sections = [...grouped, ...(ungrouped.length > 0 ? [{ group: null, items: ungrouped }] : [])];
  }

  return (
    <div data-arca-theme="">

      {/* ── Group filter bar — only when groups exist ──── */}
      {hasGroups && (
        <div style={{ display:"flex", gap:6, flexWrap:"wrap", alignItems:"center", marginBottom:16 }}>
          <button type="button" onClick={() => setActiveGroup(null)}
            style={{ padding:"5px 13px", borderRadius:"var(--r-pill)", fontSize:13, fontWeight:500,
              border:"1px solid", cursor:"pointer", fontFamily:"var(--f-sans)", transition:"all .14s",
              borderColor: !activeGroup ? "var(--ink)" : "var(--hairline-2)",
              background: !activeGroup ? "var(--ink)" : "var(--surface-2)",
              color: !activeGroup ? "var(--bg)" : "var(--ink-2)" }}>
            Všichni <span style={{ opacity:.6, marginLeft:3 }}>{guardians.length}</span>
          </button>

          {groups.map(g => {
            const c = colorFor(g.color); const isSel = activeGroup === g.id;
            return (
              <div key={g.id} style={{ position:"relative", display:"flex", alignItems:"center" }}>
                <button type="button" onClick={() => setActiveGroup(isSel ? null : g.id)}
                  style={{ display:"flex", alignItems:"center", gap:5, padding:"5px 11px",
                    paddingRight:26, borderRadius:"var(--r-pill)", border:"1px solid",
                    borderColor: isSel ? c.text : c.border,
                    background: isSel ? c.bg : "var(--surface-2)",
                    color: isSel ? c.text : "var(--ink-2)",
                    fontSize:13, cursor:"pointer", fontFamily:"var(--f-sans)", transition:"all .14s" }}>
                  {g.emoji && <span>{g.emoji}</span>}
                  {g.name}
                  <span style={{ opacity:.55, fontSize:11 }}>{guardians.filter(gd => gd.groupId === g.id).length}</span>
                </button>
                <button type="button" onClick={() => handleDeleteGroup(g.id)} title="Smazat skupinu"
                  style={{ position:"absolute", right:6, top:"50%", transform:"translateY(-50%)",
                    background:"transparent", border:"none", cursor:"pointer",
                    color: isSel ? c.text : "var(--muted-2)", opacity:.5, fontSize:12 }}>×</button>
              </div>
            );
          })}

          <button type="button" onClick={() => setShowCreate(s => !s)}
            className="arca-btn sm arca-btn--ghost" style={{ gap:4 }}>
            <IcPlus /> Nová skupina
          </button>
        </div>
      )}

      {/* Create group panel */}
      {showCreate && (
        <CreateGroupPanel onCreated={g => setGroups(prev => [...prev, g])} onClose={() => setShowCreate(false)} />
      )}

      {/* ── Guardian cards ─────────────────────────────── */}
      {!hasGroups ? (
        /* Simple flat list when no groups */
        <div className="arca-stack-3">
          {guardians.map(g => (
            <GuardianCard key={g.id} guardian={g} groups={groups} showGroupChip={false}
              onRemove={id => setGuardians(prev => prev.filter(x => x.id !== id))}
              onGroupAssign={handleGroupAssign}
              onUpdated={(id, data) => setGuardians(prev => prev.map(x => x.id === id ? { ...x, ...data } : x))} />
          ))}
          {guardians.length === 0 && (
            <p className="arca-sub" style={{ fontSize:13, fontStyle:"italic" }}>Zatím žádní strážci.</p>
          )}
        </div>
      ) : sections.length > 0 ? (
        /* Grouped sections */
        <div className="arca-stack-5">
          {sections.map(section => (
            <div key={section.group?.id ?? "ungrouped"}>
              {/* Section header */}
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
                {section.group ? (
                  <>
                    <span style={{
                      display:"inline-flex", alignItems:"center", gap:4,
                      padding:"3px 10px", borderRadius:"var(--r-pill)", fontSize:11.5,
                      background: colorFor(section.group.color).bg,
                      color: colorFor(section.group.color).text, fontWeight:600,
                    }}>
                      {section.group.emoji && <span>{section.group.emoji}</span>}
                      {section.group.name}
                    </span>
                    <span className="arca-mono" style={{ color:"var(--muted)", fontSize:11 }}>
                      {section.items.length} {section.items.length < 5 ? "strážci" : "strážců"}
                    </span>
                  </>
                ) : (
                  <span className="arca-mono" style={{ color:"var(--muted)", fontSize:11, textTransform:"uppercase", letterSpacing:".06em" }}>
                    Bez skupiny · {section.items.length}
                  </span>
                )}
                <div style={{ flex:1, height:1, background:"var(--hairline)" }} />
              </div>
              <div className="arca-stack-3">
                {section.items.map(g => (
                  <GuardianCard key={g.id} guardian={g} groups={groups} showGroupChip={true}
                    onRemove={id => setGuardians(prev => prev.filter(x => x.id !== id))}
                    onGroupAssign={handleGroupAssign}
                    onUpdated={(id, data) => setGuardians(prev => prev.map(x => x.id === id ? { ...x, ...data } : x))} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Filtered view with no groups active = just the filtered cards */
        <div className="arca-stack-3">
          {displayedGuardians.map(g => (
            <GuardianCard key={g.id} guardian={g} groups={groups} showGroupChip={true}
              onRemove={id => setGuardians(prev => prev.filter(x => x.id !== id))}
              onGroupAssign={handleGroupAssign}
              onUpdated={(id, data) => setGuardians(prev => prev.map(x => x.id === id ? { ...x, ...data } : x))} />
          ))}
          {displayedGuardians.length === 0 && (
            <p className="arca-sub" style={{ fontSize:13 }}>Tato skupina nemá žádné členy.</p>
          )}
        </div>
      )}

      {/* ── Add guardian form ─────────────────────────── */}
      <div style={{ marginTop:14 }}>
        <AddGuardianForm onAdded={g => setGuardians(prev => [...prev, g])} />
      </div>

      {/* ── "Nová skupina" link when no groups yet ─────── */}
      {!hasGroups && !showCreate && (
        <button type="button" onClick={() => setShowCreate(true)}
          className="arca-btn sm arca-btn--ghost" style={{ marginTop:10, gap:4, color:"var(--muted)" }}>
          <IcPlus /> Vytvořit skupinu strážců
        </button>
      )}

      <style>{`
        @keyframes gpIn {
          from { opacity:0; transform:scale(.94) translateY(-4px); }
          to   { opacity:1; transform:none; }
        }
      `}</style>
    </div>
  );
}
