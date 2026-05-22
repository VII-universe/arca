"use client";

import { useState, useRef, useTransition, useCallback } from "react";
import { toast } from "sonner";
import { updateRecipientProfile, uploadRecipientAvatar, addMemory, deleteMemory } from "@/app/actions/recipients";

// ── Icons ─────────────────────────────────────────────────────────────────────
const Ic = ({ d, size = 14 }: { d: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);
const IcEdit    = () => <Ic d="M11 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-5M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5Z" />;
const IcCamera  = () => <Ic d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />;
const IcPlus    = () => <Ic d="M12 5v14M5 12h14" />;
const IcTrash   = () => <Ic d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />;
const IcX       = () => <Ic d="M18 6L6 18M6 6l12 12" />;
const IcCheck   = () => <Ic d="M5 12l4 4 10-10" />;
const IcCake    = () => <Ic d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 3v4M8 7c0-2.2 1.8-4 4-4s4 1.8 4 4M3 21h18" size={13} />;
const IcHeart   = () => <Ic d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10Z" size={13} />;
const IcImage   = () => <Ic d="M21 19V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2ZM9 10.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM21 15l-5-5L5 21" />;

const RELATIONSHIPS = ["máma", "táta", "partner", "partnerka", "kamarád", "kamarádka", "kolega", "kolegyně", "dítě", "sourozenec", "babička", "děda", "vlastní"];

// ── Date utilities ────────────────────────────────────────────────────────────

function daysUntilNextOccurrence(date: Date): number {
  const now = new Date();
  const next = new Date(now.getFullYear(), date.getMonth(), date.getDate());
  if (next.getTime() < now.setHours(0, 0, 0, 0)) {
    next.setFullYear(next.getFullYear() + 1);
  }
  const diff = next.getTime() - new Date().setHours(0, 0, 0, 0);
  return Math.ceil(diff / 86_400_000);
}

// ── Profile Edit Sheet ────────────────────────────────────────────────────────

interface ProfileData {
  relationship: string | null;
  birthday: Date | null;
  anniversary: Date | null;
  notes: string | null;
}

function ProfileEditSheet({
  recipientId,
  initial,
  onClose,
  onSaved,
}: {
  recipientId: string;
  initial: ProfileData;
  onClose: () => void;
  onSaved: (data: ProfileData) => void;
}) {
  const [relationship, setRelationship] = useState(initial.relationship ?? "");
  const [customRel, setCustomRel] = useState(
    initial.relationship && !RELATIONSHIPS.slice(0, -1).includes(initial.relationship)
      ? initial.relationship
      : ""
  );
  const [showCustom, setShowCustom] = useState(
    !!initial.relationship && !RELATIONSHIPS.slice(0, -1).includes(initial.relationship)
  );
  const [birthday, setBirthday] = useState(
    initial.birthday ? initial.birthday.toISOString().split("T")[0] : ""
  );
  const [anniversary, setAnniversary] = useState(
    initial.anniversary ? initial.anniversary.toISOString().split("T")[0] : ""
  );
  const [notes, setNotes] = useState(initial.notes ?? "");
  const [isPending, startTransition] = useTransition();

  const effectiveRel = showCustom ? customRel : relationship === "vlastní" ? "" : relationship;

  function save() {
    startTransition(async () => {
      const res = await updateRecipientProfile(recipientId, {
        relationship: effectiveRel || null,
        birthday: birthday || null,
        anniversary: anniversary || null,
        notes: notes || null,
      });
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      toast.success("Profil uložen.");
      onSaved({
        relationship: effectiveRel || null,
        birthday: birthday ? new Date(birthday) : null,
        anniversary: anniversary ? new Date(anniversary) : null,
        notes: notes || null,
      });
      onClose();
    });
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 400, display: "flex" }}>
      {/* backdrop */}
      <div onClick={onClose} style={{ flex: 1, background: "rgba(28,26,22,.55)", backdropFilter: "blur(4px)" }} />
      {/* panel */}
      <div
        data-arca-theme=""
        style={{
          width: 400, background: "var(--surface)", borderLeft: "1px solid var(--hairline)",
          display: "flex", flexDirection: "column", overflowY: "auto",
          boxShadow: "var(--sh-3)",
        }}
      >
        <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--hairline)", display: "flex", alignItems: "center", gap: 10 }}>
          <h3 style={{ fontFamily: "var(--f-serif)", fontWeight: 400, fontSize: 20, margin: 0, flex: 1 }}>Upravit profil</h3>
          <button type="button" onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 4 }}>
            <IcX />
          </button>
        </div>

        <div style={{ padding: "24px", flex: 1, display: "flex", flexDirection: "column", gap: 22 }}>
          {/* Vztah */}
          <div>
            <label className="arca-mono" style={{ color: "var(--muted)", fontSize: 11, display: "block", marginBottom: 8 }}>Vztah</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {RELATIONSHIPS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => {
                    if (r === "vlastní") { setShowCustom(true); setRelationship("vlastní"); }
                    else { setRelationship(r); setShowCustom(false); }
                  }}
                  style={{
                    padding: "5px 12px", borderRadius: "var(--r-pill)", fontSize: 12.5, cursor: "pointer",
                    border: "1px solid",
                    borderColor: relationship === r ? "var(--accent)" : "var(--hairline-2)",
                    background: relationship === r ? "var(--accent-tint)" : "var(--surface-2)",
                    color: relationship === r ? "var(--accent-deep)" : "var(--ink-2)",
                    fontFamily: "var(--f-sans)",
                  }}
                >
                  {r}
                </button>
              ))}
            </div>
            {showCustom && (
              <input
                autoFocus
                className="arca-input"
                style={{ marginTop: 8 }}
                placeholder="Vlastní popis vztahu…"
                value={customRel}
                onChange={e => setCustomRel(e.target.value)}
              />
            )}
          </div>

          {/* Narozeniny */}
          <div>
            <label className="arca-mono" style={{ color: "var(--muted)", fontSize: 11, display: "block", marginBottom: 6 }}>Narozeniny</label>
            <input type="date" className="arca-input" value={birthday} onChange={e => setBirthday(e.target.value)} />
          </div>

          {/* Výročí */}
          <div>
            <label className="arca-mono" style={{ color: "var(--muted)", fontSize: 11, display: "block", marginBottom: 6 }}>Výročí (setkání, svatba…)</label>
            <input type="date" className="arca-input" value={anniversary} onChange={e => setAnniversary(e.target.value)} />
          </div>

          {/* Poznámky */}
          <div>
            <label className="arca-mono" style={{ color: "var(--muted)", fontSize: 11, display: "block", marginBottom: 6 }}>Poznámky</label>
            <textarea
              className="arca-input"
              rows={4}
              placeholder="Co o této osobě víš, co bys chtěl zachovat…"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              style={{ resize: "vertical", fontFamily: "var(--f-sans)" }}
            />
          </div>
        </div>

        <div style={{ padding: "16px 24px", borderTop: "1px solid var(--hairline)", display: "flex", gap: 10 }}>
          <button
            type="button"
            onClick={save}
            disabled={isPending}
            className="arca-btn arca-btn--primary"
            style={{ flex: 1, justifyContent: "center" }}
          >
            {isPending ? "Ukládám…" : <><IcCheck /> Uložit</>}
          </button>
          <button type="button" onClick={onClose} className="arca-btn arca-btn--ghost">Zrušit</button>
        </div>
      </div>
    </div>
  );
}

// ── Memory Add Sheet ──────────────────────────────────────────────────────────

function MemoryAddSheet({
  recipientId,
  onClose,
  onAdded,
  initialFile,
}: {
  recipientId: string;
  onClose: () => void;
  onAdded: () => void;
  initialFile?: File | null;
}) {
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [happenedAt, setHappenedAt] = useState("");
  const [file, setFile] = useState<File | null>(initialFile ?? null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (f: File) => {
    setFile(f);
    if (f.type.startsWith("image/")) {
      const url = URL.createObjectURL(f);
      setPreview(url);
    }
  };

  function save() {
    startTransition(async () => {
      const res = await addMemory(recipientId, {
        title: title || undefined,
        note: note || undefined,
        happenedAt: happenedAt || null,
        mediaFile: file ?? null,
      });
      if ("error" in res) { toast.error(res.error); return; }
      toast.success("Okamžik uložen.");
      onAdded();
      onClose();
    });
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 400, display: "flex" }}>
      <div onClick={onClose} style={{ flex: 1, background: "rgba(28,26,22,.55)", backdropFilter: "blur(4px)" }} />
      <div
        data-arca-theme=""
        style={{
          width: 420, background: "var(--surface)", borderLeft: "1px solid var(--hairline)",
          display: "flex", flexDirection: "column", overflowY: "auto", boxShadow: "var(--sh-3)",
        }}
      >
        <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--hairline)", display: "flex", alignItems: "center", gap: 10 }}>
          <h3 style={{ fontFamily: "var(--f-serif)", fontWeight: 400, fontSize: 20, margin: 0, flex: 1 }}>Uložit okamžik</h3>
          <button type="button" onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 4 }}><IcX /></button>
        </div>

        <div style={{ padding: 24, flex: 1, display: "flex", flexDirection: "column", gap: 18 }}>
          {/* Media drop zone */}
          <div
            onClick={() => fileRef.current?.click()}
            style={{
              border: "1.5px dashed var(--hairline-2)", borderRadius: "var(--r-lg)",
              background: "var(--bg-tint)", display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", gap: 8,
              minHeight: preview ? "auto" : 120, cursor: "pointer", overflow: "hidden",
              transition: "border-color .15s",
            }}
          >
            {preview ? (
              <img src={preview} alt="" style={{ width: "100%", borderRadius: "var(--r-lg)", display: "block" }} />
            ) : (
              <>
                <span style={{ color: "var(--muted)", opacity: 0.6 }}><IcImage /></span>
                <span className="arca-sub" style={{ fontSize: 12 }}>Klikni nebo přetáhni fotku / audio</span>
              </>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*,audio/*,video/*" style={{ display: "none" }}
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />

          <div>
            <label className="arca-mono" style={{ color: "var(--muted)", fontSize: 11, display: "block", marginBottom: 6 }}>Název (volitelný)</label>
            <input className="arca-input" placeholder="Název vzpomínky…" value={title} onChange={e => setTitle(e.target.value)} />
          </div>

          <div>
            <label className="arca-mono" style={{ color: "var(--muted)", fontSize: 11, display: "block", marginBottom: 6 }}>Příběh</label>
            <textarea className="arca-input" rows={4} placeholder="Co se stalo, proč to pro tebe znamená…"
              value={note} onChange={e => setNote(e.target.value)}
              style={{ resize: "vertical", fontFamily: "var(--f-sans)" }} />
          </div>

          <div>
            <label className="arca-mono" style={{ color: "var(--muted)", fontSize: 11, display: "block", marginBottom: 6 }}>Datum (kdy se to stalo)</label>
            <input type="date" className="arca-input" value={happenedAt} onChange={e => setHappenedAt(e.target.value)} />
          </div>
        </div>

        <div style={{ padding: "16px 24px", borderTop: "1px solid var(--hairline)", display: "flex", gap: 10 }}>
          <button type="button" onClick={save} disabled={isPending}
            className="arca-btn arca-btn--primary" style={{ flex: 1, justifyContent: "center" }}>
            {isPending ? "Ukládám…" : <><IcCheck /> Uložit okamžik</>}
          </button>
          <button type="button" onClick={onClose} className="arca-btn arca-btn--ghost">Zrušit</button>
        </div>
      </div>
    </div>
  );
}

// ── Memory Card ───────────────────────────────────────────────────────────────

function MemoryCard({
  memory,
  onDelete,
}: {
  memory: {
    id: string;
    title: string | null;
    note: string | null;
    mediaUrl: string | null;
    mediaType: string | null;
    happenedAt: Date | null;
    signedUrl: string | null;
  };
  onDelete: (id: string) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, startDelete] = useTransition();

  function handleDelete() {
    startDelete(async () => {
      const res = await deleteMemory(memory.id);
      if ("error" in res) { toast.error(res.error); return; }
      toast.success("Okamžik odstraněn.");
      onDelete(memory.id);
      setConfirming(false);
    });
  }

  return (
    <div className="arca-card" style={{ overflow: "hidden" }}>
      {memory.signedUrl && memory.mediaType === "image" && (
        <img src={memory.signedUrl} alt={memory.title ?? ""} style={{ width: "100%", aspectRatio: "4/3", objectFit: "cover", display: "block" }} />
      )}
      <div style={{ padding: "14px 16px" }}>
        {memory.title && <div style={{ fontWeight: 550, fontSize: 13.5, marginBottom: 4 }}>{memory.title}</div>}
        {memory.happenedAt && (
          <div className="arca-mono" style={{ color: "var(--muted)", fontSize: 11, marginBottom: 6 }}>
            {new Date(memory.happenedAt).toLocaleDateString("cs-CZ", { day: "numeric", month: "long", year: "numeric" })}
          </div>
        )}
        {memory.note && (
          <p style={{ fontFamily: "var(--f-serif)", fontSize: 14, lineHeight: 1.55, color: "var(--ink-2)", margin: 0 }}>
            {memory.note}
          </p>
        )}
        <div style={{ marginTop: 10, display: "flex", justifyContent: "flex-end" }}>
          {confirming ? (
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <span className="arca-sub" style={{ fontSize: 12 }}>Opravdu?</span>
              <button type="button" onClick={handleDelete} disabled={deleting}
                className="arca-btn sm" style={{ color: "#c00", borderColor: "#fcc" }}>
                {deleting ? "…" : "Smazat"}
              </button>
              <button type="button" onClick={() => setConfirming(false)} className="arca-btn sm arca-btn--ghost">Ne</button>
            </div>
          ) : (
            <button type="button" onClick={() => setConfirming(true)}
              className="arca-btn sm arca-btn--ghost" style={{ color: "var(--muted)" }}>
              <IcTrash />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main exported component ───────────────────────────────────────────────────

export interface RecipientProfileEditorProps {
  recipientId: string;
  recipientName: string;
  initialProfile: ProfileData;
  initialAvatarUrl: string | null; // already signed URL or null
  initialMemories: Array<{
    id: string;
    title: string | null;
    note: string | null;
    mediaUrl: string | null;
    mediaType: string | null;
    happenedAt: Date | null;
    signedUrl: string | null;
  }>;
  tone: string;
  initials: string;
}

export default function RecipientProfileEditor({
  recipientId,
  recipientName,
  initialProfile,
  initialAvatarUrl,
  initialMemories,
  tone,
  initials,
}: RecipientProfileEditorProps) {
  const [profile, setProfile] = useState<ProfileData>(initialProfile);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialAvatarUrl);
  const [memories, setMemories] = useState(initialMemories);
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [showMemoryAdd, setShowMemoryAdd] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [pendingDropFile, setPendingDropFile] = useState<File | null>(null);
  const [uploadingAvatar, startAvatarUpload] = useTransition();
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Avatar upload
  const handleAvatarFile = useCallback((file: File) => {
    startAvatarUpload(async () => {
      const fd = new FormData();
      fd.set("file", file);
      const res = await uploadRecipientAvatar(recipientId, fd);
      if ("error" in res) { toast.error(res.error); return; }
      const blobUrl = URL.createObjectURL(file);
      setAvatarUrl(blobUrl);
      toast.success("Foto uloženo.");
    });
  }, [recipientId]);

  // Global drag & drop over the whole gallery area
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = Array.from(e.dataTransfer.files)[0];
    if (!file) return;
    setPendingDropFile(file);
    setShowMemoryAdd(true);
  };

  // Milestones calculation
  const milestones: Array<{ label: string; days: number; type: "birthday" | "anniversary"; icon: React.ReactNode }> = [];
  if (profile.birthday) {
    const days = daysUntilNextOccurrence(profile.birthday);
    milestones.push({ label: "Narozeniny", days, type: "birthday", icon: <IcCake /> });
  }
  if (profile.anniversary) {
    const days = daysUntilNextOccurrence(profile.anniversary);
    milestones.push({ label: "Výročí", days, type: "anniversary", icon: <IcHeart /> });
  }

  return (
    <div data-arca-theme="" style={{ color: "var(--ink)" }}>

      {/* ── Avatar section ───────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
        <div style={{ position: "relative" }}>
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={recipientName}
              style={{
                width: 68, height: 68, borderRadius: "50%", objectFit: "cover",
                border: "3px solid var(--surface)", boxShadow: "var(--sh-2)",
                opacity: uploadingAvatar ? 0.5 : 1,
              }}
            />
          ) : (
            <span
              className={`arca-avatar xl ${tone}`}
              style={{ border: "3px solid var(--surface)", boxShadow: "var(--sh-2)", opacity: uploadingAvatar ? 0.5 : 1 }}
            >
              {initials}
            </span>
          )}
          <button
            type="button"
            title="Změnit foto"
            onClick={() => avatarInputRef.current?.click()}
            style={{
              position: "absolute", right: -4, bottom: -4,
              width: 26, height: 26, borderRadius: "50%",
              background: "var(--ink)", color: "var(--bg)",
              border: "2px solid var(--surface)",
              display: "grid", placeItems: "center", cursor: "pointer",
            }}
          >
            <IcCamera />
          </button>
          <input ref={avatarInputRef} type="file" accept="image/*" style={{ display: "none" }}
            onChange={e => { const f = e.target.files?.[0]; if (f) handleAvatarFile(f); e.target.value = ""; }} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          {profile.relationship && (
            <span className="arca-chip clay" style={{ marginBottom: 6, display: "inline-flex" }}>
              {profile.relationship}
            </span>
          )}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" onClick={() => setShowProfileEdit(true)} className="arca-btn sm arca-btn--ghost">
              <IcEdit /> Upravit profil
            </button>
          </div>
        </div>
      </div>

      {/* ── Poznámky ─────────────────────────────────────────────── */}
      {profile.notes && (
        <div className="arca-card flat" style={{ background: "var(--bg-tint)", border: "none", padding: "14px 16px", marginBottom: 20 }}>
          <p style={{ fontFamily: "var(--f-serif)", fontSize: 14, lineHeight: 1.6, color: "var(--ink-2)", margin: 0 }}>
            {profile.notes}
          </p>
        </div>
      )}

      {/* ── Milníky ──────────────────────────────────────────────── */}
      {milestones.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
          {milestones.map((m) => {
            const urgent = m.days <= 7;
            const soon = m.days <= 30;
            return (
              <div
                key={m.type}
                className="arca-card"
                style={{
                  padding: "12px 16px",
                  background: urgent ? "var(--accent-tint)" : soon ? "var(--bg-tint)" : "var(--surface)",
                  border: urgent ? "1px solid var(--accent-soft)" : "1px solid var(--hairline)",
                  display: "flex", alignItems: "center", gap: 12,
                  boxShadow: urgent ? "0 0 0 3px var(--accent-tint)" : "var(--sh-1)",
                  position: "relative",
                }}
              >
                {urgent && (
                  <span style={{
                    position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)",
                    width: 7, height: 7, borderRadius: "50%",
                    background: "var(--accent)",
                    animation: "arca-pulse 2s ease-in-out infinite",
                    boxShadow: "0 0 0 3px var(--accent-tint)",
                  }} />
                )}
                <span style={{ color: "var(--accent)", flexShrink: 0 }}>{m.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 550, fontSize: 13 }}>
                    {m.label} za {m.days} {m.days === 1 ? "den" : m.days < 5 ? "dny" : "dní"}
                  </div>
                  <div className="arca-sub" style={{ fontSize: 12 }}>
                    {urgent ? "Brzy — napiš zprávu teď" : "Máš čas připravit se"}
                  </div>
                </div>
                <a
                  href={`/dashboard/arca/new?recipientId=${recipientId}&occasion=${m.type}`}
                  className="arca-btn sm arca-btn--clay"
                >
                  Napsat zprávu
                </a>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Galerie okamžiků ─────────────────────────────────────── */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        style={{
          borderRadius: "var(--r-lg)", padding: dragOver ? 4 : 0,
          border: dragOver ? "2px dashed var(--accent)" : "2px solid transparent",
          background: dragOver ? "var(--accent-tint)" : "transparent",
          transition: "all .15s",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <h3 className="arca-h3">Galerie okamžiků <span className="arca-mono" style={{ color: "var(--muted)", fontWeight: 400 }}>({memories.length})</span></h3>
          <button type="button" onClick={() => { setPendingDropFile(null); setShowMemoryAdd(true); }} className="arca-btn sm arca-btn--clay">
            <IcPlus /> Uložit okamžik
          </button>
        </div>

        {memories.length === 0 ? (
          <div className="arca-card flat" style={{
            background: "var(--bg-tint)", border: "1.5px dashed var(--hairline-2)",
            padding: "36px 24px", textAlign: "center",
          }}>
            <p className="arca-sub" style={{ fontSize: 13 }}>
              Přetáhni sem fotku nebo klikni „Uložit okamžik" — každý příběh si zaslouží místo.
            </p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 14 }}>
            {memories.map(m => (
              <MemoryCard
                key={m.id}
                memory={m}
                onDelete={id => setMemories(prev => prev.filter(x => x.id !== id))}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Sheets ───────────────────────────────────────────────── */}
      {showProfileEdit && (
        <ProfileEditSheet
          recipientId={recipientId}
          initial={profile}
          onClose={() => setShowProfileEdit(false)}
          onSaved={data => setProfile(data)}
        />
      )}
      {showMemoryAdd && (
        <MemoryAddSheet
          recipientId={recipientId}
          initialFile={pendingDropFile}
          onClose={() => { setShowMemoryAdd(false); setPendingDropFile(null); }}
          onAdded={() => {
            // Optimistic: reload via revalidatePath; for now the parent will refetch on next navigation
            // A full real-time refresh would require router.refresh() call in the sheet
            window.location.reload();
          }}
        />
      )}

      <style>{`
        @keyframes arca-pulse {
          0%, 100% { box-shadow: 0 0 0 3px var(--accent-tint); }
          50% { box-shadow: 0 0 0 6px transparent; }
        }
      `}</style>
    </div>
  );
}
