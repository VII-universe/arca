"use client";

import { useState, useTransition, useRef, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { addGuardian, removeGuardian } from "@/app/actions/guardians";
import { assignGuardianGroup, createGroup, deleteGroup } from "@/app/actions/groups";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface GuardianGroup {
  id: string;
  name: string;
  color: string;
  emoji: string | null;
}

export interface GuardianItem {
  id: string;
  name: string;
  email: string;
  groupId: string | null;
  group: GuardianGroup | null;
}

// ── Color system ─────────────────────────────────────────────────────────────

const COLOR_OPTIONS = [
  { value: "clay", bg: "var(--accent-tint)", text: "var(--accent-deep)", border: "var(--accent-soft)", label: "Terra" },
  { value: "sage", bg: "var(--sage-soft)",   text: "#4E5B3F",            border: "#C2D0B0",             label: "Sage"  },
  { value: "sky",  bg: "var(--sky-soft)",    text: "#3E5A7E",            border: "#AABFD8",             label: "Sky"   },
  { value: "ink",  bg: "var(--bg-tint)",     text: "var(--ink-2)",       border: "var(--hairline-2)",   label: "Ink"   },
];
const GROUP_PRESETS = [
  { name: "Rodina",    emoji: "👨‍👩‍👧", color: "clay" },
  { name: "Přátelé",  emoji: "🤝",    color: "sage" },
  { name: "Kolegové", emoji: "💼",    color: "sky"  },
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

// ── Icons ─────────────────────────────────────────────────────────────────────
const IcPlus  = () => <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>;
const IcTrash = () => <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>;
const IcChev  = () => <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M6 9l6 6 6-6"/></svg>;
const IcCheck = () => <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M5 12l4 4 10-10"/></svg>;
const IcSpin  = () => <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ animation: "arca-spin .8s linear infinite" }}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>;
const IcShield = () => <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round"><path d="M12 3l8 3v5c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-3Z"/></svg>;

// ── GroupPicker ───────────────────────────────────────────────────────────────

function GroupPicker({
  guardianId, currentGroupId, groups, onAssign, onClose,
}: {
  guardianId: string;
  currentGroupId: string | null;
  groups: GuardianGroup[];
  onAssign: (gId: string, groupId: string | null) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    const t = setTimeout(() => document.addEventListener("mousedown", h), 20);
    document.addEventListener("keydown", esc);
    return () => { clearTimeout(t); document.removeEventListener("mousedown", h); document.removeEventListener("keydown", esc); };
  }, [onClose]);

  function assign(groupId: string | null) {
    if (groupId === currentGroupId) { onClose(); return; }
    startTransition(async () => {
      const res = await assignGuardianGroup(guardianId, groupId);
      if ("error" in res) { toast.error(res.error); return; }
      onAssign(guardianId, groupId);
      onClose();
    });
  }

  return (
    <div
      ref={ref}
      data-arca-theme=""
      style={{
        position: "absolute", bottom: "calc(100% + 6px)", left: 0, zIndex: 200,
        background: "var(--surface-2)", border: "1px solid var(--hairline-2)",
        borderRadius: "var(--r-lg)", boxShadow: "var(--sh-3)", minWidth: 190,
        overflow: "hidden", animation: "guardianGroupPickerIn .15s cubic-bezier(.22,1,.36,1) both",
      }}
    >
      <div style={{ padding: "6px 0" }}>
        {groups.map(g => {
          const c = colorFor(g.color);
          const sel = g.id === currentGroupId;
          return (
            <button key={g.id} type="button" disabled={pending} onClick={() => assign(g.id)}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                width: "100%", padding: "9px 14px", border: "none",
                background: sel ? c.bg : "transparent",
                cursor: "pointer", textAlign: "left", transition: "background .1s",
              }}>
              <span style={{ width: 9, height: 9, borderRadius: "50%", background: c.text, opacity: .7, flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: 13, fontFamily: "var(--f-sans)", color: "var(--ink)" }}>
                {g.emoji && <span style={{ marginRight: 5 }}>{g.emoji}</span>}{g.name}
              </span>
              {sel && <IcCheck />}
            </button>
          );
        })}
        {groups.length > 0 && <div style={{ height: 1, background: "var(--hairline)", margin: "4px 0" }} />}
        <button type="button" disabled={pending} onClick={() => assign(null)}
          style={{
            display: "flex", alignItems: "center", gap: 10,
            width: "100%", padding: "9px 14px", border: "none",
            background: !currentGroupId ? "var(--bg-tint)" : "transparent",
            cursor: "pointer", textAlign: "left",
          }}>
          <span style={{ width: 9, height: 9, borderRadius: "50%", border: "1.5px dashed var(--muted-2)", flexShrink: 0 }} />
          <span style={{ fontSize: 13, fontFamily: "var(--f-sans)", color: "var(--muted)" }}>Bez skupiny</span>
          {!currentGroupId && <IcCheck />}
        </button>
      </div>
    </div>
  );
}

// ── CreateGroupPanel ──────────────────────────────────────────────────────────

function CreateGroupPanel({ onCreated, onClose }: {
  onCreated: (g: GuardianGroup) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [color, setColor] = useState("sage");
  const [emoji, setEmoji] = useState("");
  const [pending, startTransition] = useTransition();
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => { ref.current?.focus(); }, []);

  function save() {
    if (!name.trim()) return;
    startTransition(async () => {
      const res = await createGroup({ name, color, emoji: emoji || undefined });
      if ("error" in res) { toast.error(res.error); return; }
      onCreated(res);
      toast.success(`Skupina „${res.name}" vytvořena.`);
      onClose();
    });
  }

  return (
    <div data-arca-theme="" style={{
      background: "var(--bg-tint)", border: "1px solid var(--hairline-2)",
      borderRadius: "var(--r-lg)", padding: "16px 18px", marginBottom: 16,
      animation: "guardianGroupPickerIn .18s cubic-bezier(.22,1,.36,1) both",
    }}>
      {/* Quick presets */}
      <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
        {GROUP_PRESETS.map(p => (
          <button key={p.name} type="button"
            onClick={() => { setName(p.name); setColor(p.color); setEmoji(p.emoji); ref.current?.focus(); }}
            className="arca-btn sm arca-btn--outline" style={{ fontSize: 12 }}>
            {p.emoji} {p.name}
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 56px", gap: 8, marginBottom: 10 }}>
        <input ref={ref} className="arca-input" placeholder="Název skupiny…"
          value={name} onChange={e => setName(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") save(); if (e.key === "Escape") onClose(); }} />
        <input className="arca-input" placeholder="😀" value={emoji}
          onChange={e => setEmoji(e.target.value)}
          style={{ textAlign: "center", fontSize: 17 }} maxLength={4} />
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <span className="arca-mono" style={{ color: "var(--muted)", fontSize: 11 }}>Barva</span>
        {COLOR_OPTIONS.map(c => (
          <button key={c.value} type="button" onClick={() => setColor(c.value)} title={c.label}
            style={{
              width: 20, height: 20, borderRadius: "50%", border: "2px solid",
              borderColor: color === c.value ? c.text : "transparent",
              background: c.bg, cursor: "pointer",
              boxShadow: color === c.value ? `0 0 0 3px ${c.border}` : undefined,
              transition: "all .1s",
            }} />
        ))}
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <button type="button" onClick={save} disabled={pending || !name.trim()} className="arca-btn arca-btn--primary sm">
          {pending ? <IcSpin /> : <IcPlus />} Vytvořit
        </button>
        <button type="button" onClick={onClose} className="arca-btn arca-btn--ghost sm">Zrušit</button>
      </div>
    </div>
  );
}

// ── GuardianCard ──────────────────────────────────────────────────────────────

function GuardianCard({
  guardian, groups, onRemove, onGroupAssign,
}: {
  guardian: GuardianItem;
  groups: GuardianGroup[];
  onRemove: (id: string) => void;
  onGroupAssign: (id: string, groupId: string | null) => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [removing, startRemove] = useTransition();

  const tone = toneFor(guardian.name);
  const init = initials(guardian.name);
  const c = guardian.group ? colorFor(guardian.group.color) : null;

  function handleRemove() {
    startRemove(async () => {
      await removeGuardian(guardian.id);
      onRemove(guardian.id);
      toast.success(`${guardian.name} odebrán ze strážců.`);
    });
  }

  return (
    <div className="arca-card" style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: 14 }}>
      <span className={`arca-avatar lg ${tone}`}>{init}</span>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontWeight: 550, fontSize: 14.5 }}>{guardian.name}</span>
          <span className="arca-chip sage" style={{ fontSize: 11 }}>
            <svg width={9} height={9} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M5 12l4 4 10-10"/></svg>
            Potvrzeno
          </span>
        </div>
        <div className="arca-sub" style={{ fontSize: 12.5, marginTop: 2 }}>{guardian.email}</div>

        {/* Group chip */}
        <div style={{ marginTop: 8, position: "relative", display: "inline-block" }}>
          <button
            type="button"
            onClick={() => setPickerOpen(o => !o)}
            style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              padding: "3px 9px", borderRadius: "var(--r-pill)", border: "1px solid",
              borderColor: c ? c.border : "var(--hairline-2)",
              background: c ? c.bg : "var(--surface-2)",
              color: c ? c.text : "var(--muted-2)",
              fontSize: 11.5, cursor: "pointer", fontFamily: "var(--f-sans)",
              transition: "all .12s",
            }}
          >
            {guardian.group?.emoji && <span style={{ fontSize: 12 }}>{guardian.group.emoji}</span>}
            <span>{guardian.group?.name ?? "Skupina"}</span>
            <IcChev />
          </button>

          {pickerOpen && (
            <GroupPicker
              guardianId={guardian.id}
              currentGroupId={guardian.groupId}
              groups={groups}
              onAssign={(id, gid) => {
                const g = gid ? groups.find(x => x.id === gid) ?? null : null;
                onGroupAssign(id, gid);
                toast.success(g ? `Přiřazeno do skupiny „${g.name}".` : "Skupina odebrána.");
              }}
              onClose={() => setPickerOpen(false)}
            />
          )}
        </div>
      </div>

      {/* Remove */}
      {confirming ? (
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <span className="arca-sub" style={{ fontSize: 12 }}>Odebrat?</span>
          <button type="button" onClick={handleRemove} disabled={removing}
            className="arca-btn sm" style={{ color: "#c00", borderColor: "#fcc" }}>
            {removing ? <IcSpin /> : "Ano"}
          </button>
          <button type="button" onClick={() => setConfirming(false)} className="arca-btn sm arca-btn--ghost">Ne</button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="arca-btn sm arca-btn--ghost"
          style={{ color: "var(--muted)", padding: "6px 8px" }}
          title="Odebrat strážce"
        >
          <IcTrash />
        </button>
      )}
    </div>
  );
}

// ── AddGuardianForm ───────────────────────────────────────────────────────────

function AddGuardianForm({ onAdded }: { onAdded: (g: GuardianItem) => void }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function handleAdd(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        await addGuardian(formData);
        const name  = (formData.get("name") as string).trim();
        const email = (formData.get("email") as string).trim().toLowerCase();
        onAdded({ id: `temp-${Date.now()}`, name, email, groupId: null, group: null });
        toast.success(`${name} přidán/a jako strážce.`);
        setOpen(false);
        formRef.current?.reset();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Chyba");
      }
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        className="arca-card"
        style={{
          width: "100%", padding: "14px 18px", display: "flex", alignItems: "center",
          gap: 10, borderStyle: "dashed", background: "transparent",
          color: "var(--muted)", cursor: "pointer", justifyContent: "center",
        }}
        onClick={() => setOpen(true)}
      >
        <IcPlus /> Pozvat dalšího strážce
      </button>
    );
  }

  return (
    <div className="arca-card flat" style={{ background: "var(--bg-tint)", border: "none", padding: 18 }}>
      {error && (
        <p style={{ fontSize: 12, color: "#C0392B", background: "rgba(192,57,43,.08)", borderRadius: 8, padding: "8px 12px", marginBottom: 12 }}>
          {error}
        </p>
      )}
      <form ref={formRef} action={handleAdd}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
          <input name="name" required placeholder="Celé jméno" className="arca-input" style={{ fontSize: 13 }} />
          <input name="email" type="email" required placeholder="email@example.com" className="arca-input" style={{ fontSize: 13 }} />
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="submit" disabled={pending} className="arca-btn arca-btn--primary sm">
            {pending ? <IcSpin /> : <IcPlus />} Přidat strážce
          </button>
          <button type="button" className="arca-btn arca-btn--ghost sm" onClick={() => { setOpen(false); setError(null); }}>
            Zrušit
          </button>
        </div>
      </form>
    </div>
  );
}

// ── Main GuardianListClient ───────────────────────────────────────────────────

interface Props {
  initialGuardians: GuardianItem[];
  initialGroups: GuardianGroup[];
}

export default function GuardianListClient({ initialGuardians, initialGroups }: Props) {
  const [guardians, setGuardians] = useState<GuardianItem[]>(initialGuardians);
  const [groups, setGroups]       = useState<GuardianGroup[]>(initialGroups);
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [showCreate, setShowCreate]   = useState(false);
  const [deletingGid, startDeleteG]   = useTransition();

  const handleGroupAssign = useCallback((id: string, groupId: string | null) => {
    const g = groupId ? groups.find(x => x.id === groupId) ?? null : null;
    setGuardians(prev => prev.map(guardian => guardian.id === id ? { ...guardian, groupId, group: g } : guardian));
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

  // Build grouped sections
  const groupedSections: { group: GuardianGroup | null; items: GuardianItem[] }[] = [];

  if (activeGroup !== null) {
    // Filtered view
    groupedSections.push({
      group: groups.find(g => g.id === activeGroup) ?? null,
      items: guardians.filter(g => g.groupId === activeGroup),
    });
  } else {
    // All grouped
    const grouped = groups.map(g => ({
      group: g,
      items: guardians.filter(gd => gd.groupId === g.id),
    })).filter(s => s.items.length > 0);

    const ungrouped = guardians.filter(g => !g.groupId);
    groupedSections.push(...grouped);
    if (ungrouped.length > 0) groupedSections.push({ group: null, items: ungrouped });
  }

  const countFor = (gId: string) => guardians.filter(g => g.groupId === gId).length;

  return (
    <div data-arca-theme="">

      {/* Filter + group management bar */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginBottom: 20 }}>
        <button type="button" onClick={() => setActiveGroup(null)}
          style={{
            padding: "6px 14px", borderRadius: "var(--r-pill)", fontSize: 13, fontWeight: 500,
            border: "1px solid", cursor: "pointer", fontFamily: "var(--f-sans)",
            transition: "all .14s",
            borderColor: !activeGroup ? "var(--ink)" : "var(--hairline-2)",
            background: !activeGroup ? "var(--ink)" : "var(--surface-2)",
            color: !activeGroup ? "var(--bg)" : "var(--ink-2)",
          }}>
          Všichni <span style={{ opacity: .6, marginLeft: 3 }}>{guardians.length}</span>
        </button>

        {groups.map(g => {
          const c = colorFor(g.color);
          const isSel = activeGroup === g.id;
          const cnt = countFor(g.id);
          return (
            <div key={g.id} style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <button type="button" onClick={() => setActiveGroup(isSel ? null : g.id)}
                style={{
                  display: "flex", alignItems: "center", gap: 6, padding: "6px 12px",
                  paddingRight: 30, borderRadius: "var(--r-pill)", border: "1px solid",
                  borderColor: isSel ? c.text : c.border,
                  background: isSel ? c.bg : "var(--surface-2)",
                  color: isSel ? c.text : "var(--ink-2)",
                  fontSize: 13, fontWeight: isSel ? 600 : 450,
                  cursor: "pointer", fontFamily: "var(--f-sans)", transition: "all .14s",
                }}>
                {g.emoji && <span style={{ fontSize: 14 }}>{g.emoji}</span>}
                {g.name}
                <span style={{ opacity: .55, fontSize: 12 }}>{cnt}</span>
              </button>
              {/* Delete mini button */}
              <button type="button" onClick={() => handleDeleteGroup(g.id)} title="Smazat skupinu"
                style={{
                  position: "absolute", right: 7, top: "50%", transform: "translateY(-50%)",
                  background: "transparent", border: "none", cursor: "pointer",
                  color: isSel ? c.text : "var(--muted-2)", opacity: .6, fontSize: 11,
                }}>
                ×
              </button>
            </div>
          );
        })}

        <button type="button" onClick={() => setShowCreate(s => !s)}
          className="arca-btn sm arca-btn--ghost" style={{ gap: 5 }}>
          <IcPlus /> Nová skupina
        </button>
      </div>

      {/* Create group panel */}
      {showCreate && (
        <CreateGroupPanel
          onCreated={g => setGroups(prev => [...prev, g])}
          onClose={() => setShowCreate(false)}
        />
      )}

      {/* Grouped sections */}
      <div className="arca-stack-5">
        {groupedSections.map((section, si) => (
          <div key={section.group?.id ?? "ungrouped"}>
            {/* Section header */}
            {(activeGroup === null && (groups.length > 0 || guardians.some(g => !g.groupId))) && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                {section.group ? (
                  <>
                    <span style={{
                      display: "inline-flex", alignItems: "center", gap: 5,
                      padding: "3px 10px", borderRadius: "var(--r-pill)", fontSize: 11.5,
                      background: colorFor(section.group.color).bg,
                      color: colorFor(section.group.color).text,
                      fontWeight: 600, fontFamily: "var(--f-sans)",
                    }}>
                      {section.group.emoji && <span>{section.group.emoji}</span>}
                      {section.group.name}
                    </span>
                    <span className="arca-mono" style={{ color: "var(--muted)", fontSize: 11 }}>
                      {section.items.length} {section.items.length === 1 ? "strážce" : section.items.length < 5 ? "strážci" : "strážců"}
                    </span>
                  </>
                ) : (
                  <span className="arca-mono" style={{ color: "var(--muted)", fontSize: 11, textTransform: "uppercase", letterSpacing: ".06em" }}>
                    Bez skupiny · {section.items.length}
                  </span>
                )}
                <div style={{ flex: 1, height: 1, background: "var(--hairline)" }} />
              </div>
            )}

            <div className="arca-stack-3">
              {section.items.map(g => (
                <GuardianCard
                  key={g.id}
                  guardian={g}
                  groups={groups}
                  onRemove={id => setGuardians(prev => prev.filter(x => x.id !== id))}
                  onGroupAssign={handleGroupAssign}
                />
              ))}
            </div>
          </div>
        ))}

        {guardians.length === 0 && (
          <p className="arca-sub" style={{ fontSize: 13, fontStyle: "italic" }}>Zatím žádní strážci.</p>
        )}
      </div>

      {/* Add guardian form */}
      <div style={{ marginTop: 16 }}>
        <AddGuardianForm onAdded={g => setGuardians(prev => [...prev, g])} />
      </div>

      <style>{`
        @keyframes guardianGroupPickerIn {
          from { opacity: 0; transform: scale(0.94) translateY(-4px); }
          to   { opacity: 1; transform: none; }
        }
      `}</style>
    </div>
  );
}
