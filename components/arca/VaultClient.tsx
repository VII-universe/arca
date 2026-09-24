"use client";

import { useState, useTransition, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useTranslations, useLocale } from "next-intl";
import { createGroup, deleteGroup, updateGroup, assignPersonGroup } from "@/app/actions/groups";
import { useVibe } from "@/contexts/vibe-context";
import { createContact } from "@/app/actions/contacts";
import { Avatar } from "@/components/arca/Avatar";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface VaultGroup {
  id: string;
  name: string;
  color: string;
  emoji: string | null;
  vibeImageUrl?: string | null;
}

export interface VaultPerson {
  id: string;
  name: string;
  email: string | null;
  packs: { id: string; type: string; status: string; executeAtDate: Date | null; livingLinkHash: string }[];
  groupId: string | null;
  group: VaultGroup | null;
  avatarSignedUrl?: string | null;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const COLOR_OPTIONS: { value: string; label: string; bg: string; text: string; border: string }[] = [
  { value: "clay",  label: "Terra",   bg: "var(--accent-tint)",  text: "var(--accent-deep)", border: "var(--accent-soft)" },
  { value: "sage",  label: "Sage",    bg: "var(--sage-soft)",    text: "#4E5B3F",            border: "#C2D0B0" },
  { value: "sky",   label: "Sky",     bg: "var(--sky-soft)",     text: "#3E5A7E",            border: "#AABFD8" },
  { value: "ink",   label: "Ink",     bg: "var(--bg-tint)",      text: "var(--ink-2)",       border: "var(--hairline-2)" },
];

const GROUP_PRESET_META = [
  { key: "family",     emoji: "👨‍👩‍👧", color: "clay" },
  { key: "friends",    emoji: "🤝",    color: "sage" },
  { key: "colleagues", emoji: "💼",    color: "sky" },
  { key: "partner",    emoji: "❤️",   color: "clay" },
] as const;

function colorFor(color: string) {
  return COLOR_OPTIONS.find(c => c.value === color) ?? COLOR_OPTIONS[0];
}

const TONES = ["clay", "sage", "sky", "ink", "clay", "sage", "sky"];
function toneFor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return TONES[Math.abs(h) % TONES.length];
}
function initials(name: string): string {
  return name.split(" ").filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join("");
}

// ── Icons ─────────────────────────────────────────────────────────────────────

const IcPlus   = () => <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>;
const IcChev   = () => <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M6 9l6 6 6-6"/></svg>;
const IcCheck  = () => <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M5 12l4 4 10-10"/></svg>;
const IcRight  = () => <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round"><path d="M9 6l6 6-6 6"/></svg>;
const IcTrash  = () => <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>;
const IcEdit   = () => <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round"><path d="M11 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-5M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5Z"/></svg>;

// ── GroupPicker dropdown ───────────────────────────────────────────────────────

function GroupPicker({
  personId, currentGroupId, groups, onAssign, onClose,
}: {
  personId: string;
  currentGroupId: string | null;
  groups: VaultGroup[];
  onAssign: (personId: string, groupId: string | null) => void;
  onClose: () => void;
}) {
  const t = useTranslations("Vault");
  const ref = useRef<HTMLDivElement>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    const t = setTimeout(() => document.addEventListener("mousedown", h), 20);
    document.addEventListener("keydown", esc);
    return () => { clearTimeout(t); document.removeEventListener("mousedown", h); document.removeEventListener("keydown", esc); };
  }, [onClose]);

  function assign(groupId: string | null) {
    if (groupId === currentGroupId) { onClose(); return; }
    startTransition(async () => {
      const res = await assignPersonGroup(personId, groupId);
      if ("error" in res) { toast.error(res.error); return; }
      onAssign(personId, groupId);
      onClose();
    });
  }

  return (
    <div
      ref={ref}
      data-arca-theme=""
      style={{
        position: "absolute", bottom: "calc(100% + 6px)", left: 0,
        zIndex: 200, background: "var(--surface-2)",
        border: "1px solid var(--hairline-2)", borderRadius: "var(--r-lg)",
        boxShadow: "var(--sh-3)", minWidth: 200, overflow: "hidden",
        animation: "groupPickerIn .15s cubic-bezier(.22,1,.36,1) both",
      }}
    >
      <div style={{ padding: "6px 0" }}>
        {groups.map(g => {
          const c = colorFor(g.color);
          const isSel = g.id === currentGroupId;
          return (
            <button
              key={g.id}
              type="button"
              disabled={pending}
              onClick={() => assign(g.id)}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                width: "100%", padding: "9px 14px", border: "none",
                background: isSel ? c.bg : "transparent",
                cursor: "pointer", textAlign: "left",
                transition: "background .1s",
              }}
            >
              <span style={{
                width: 10, height: 10, borderRadius: "50%", flexShrink: 0,
                background: c.text, opacity: 0.7,
              }} />
              <span style={{ flex: 1, fontSize: 13, fontFamily: "var(--f-sans)", color: "var(--ink)" }}>
                {g.emoji && <span style={{ marginRight: 5 }}>{g.emoji}</span>}
                {g.name}
              </span>
              {isSel && <span style={{ color: "var(--muted)" }}><IcCheck /></span>}
            </button>
          );
        })}

        {groups.length > 0 && <div style={{ height: 1, background: "var(--hairline)", margin: "4px 0" }} />}

        <button
          type="button"
          disabled={pending}
          onClick={() => assign(null)}
          style={{
            display: "flex", alignItems: "center", gap: 10,
            width: "100%", padding: "9px 14px", border: "none",
            background: currentGroupId === null ? "var(--bg-tint)" : "transparent",
            cursor: "pointer", textAlign: "left",
          }}
        >
          <span style={{ width: 10, height: 10, borderRadius: "50%", flexShrink: 0, border: "1.5px dashed var(--muted-2)" }} />
          <span style={{ fontSize: 13, fontFamily: "var(--f-sans)", color: "var(--muted)" }}>{t("groupPicker.noGroup")}</span>
          {currentGroupId === null && <span style={{ color: "var(--muted)" }}><IcCheck /></span>}
        </button>
      </div>
    </div>
  );
}

// ── CreateGroupPanel ─────────────────────────────────────────────────────────

function CreateGroupPanel({
  onCreated, onClose,
}: {
  onCreated: (group: VaultGroup) => void;
  onClose: () => void;
}) {
  const t = useTranslations("Vault");
  const GROUP_PRESETS = GROUP_PRESET_META.map(p => ({ ...p, name: t(`createGroup.presets.${p.key}`) }));
  const [name, setName] = useState("");
  const [color, setColor] = useState("clay");
  const [emoji, setEmoji] = useState("");
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  function save() {
    if (!name.trim()) return;
    startTransition(async () => {
      const res = await createGroup({ name, color, emoji: emoji || undefined });
      if ("error" in res) { toast.error(res.error); return; }
      onCreated(res);
      toast.success(t("createGroup.createdToast", { name: res.name }));
      onClose();
    });
  }

  function usePreset(p: typeof GROUP_PRESETS[0]) {
    setName(p.name);
    setColor(p.color);
    setEmoji(p.emoji);
    inputRef.current?.focus();
  }

  return (
    <div
      data-arca-theme=""
      style={{
        background: "var(--surface)", border: "1px solid var(--hairline-2)",
        borderRadius: "var(--r-lg)", padding: "18px 20px",
        animation: "groupCreateIn .18s cubic-bezier(.22,1,.36,1) both",
        marginBottom: 16,
      }}
    >
      {/* Presets */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
        <span className="arca-mono" style={{ color: "var(--muted)", fontSize: 11, width: "100%", marginBottom: 2 }}>{t("createGroup.quickGroups")}</span>
        {GROUP_PRESETS.map(p => (
          <button
            key={p.name}
            type="button"
            onClick={() => usePreset(p)}
            className="arca-btn sm arca-btn--outline"
            style={{ fontSize: 12 }}
          >
            {p.emoji} {p.name}
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 60px", gap: 10, marginBottom: 12 }}>
        <input
          ref={inputRef}
          className="arca-input"
          placeholder={t("createGroup.namePlaceholder")}
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") save(); if (e.key === "Escape") onClose(); }}
        />
        <input
          className="arca-input"
          placeholder="😀"
          value={emoji}
          onChange={e => setEmoji(e.target.value)}
          style={{ textAlign: "center", fontSize: 18 }}
          maxLength={4}
        />
      </div>

      {/* Color picker */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14, alignItems: "center" }}>
        <span className="arca-mono" style={{ color: "var(--muted)", fontSize: 11 }}>{t("createGroup.colorLabel")}</span>
        {COLOR_OPTIONS.map(c => (
          <button
            key={c.value}
            type="button"
            onClick={() => setColor(c.value)}
            title={c.label}
            style={{
              width: 22, height: 22, borderRadius: "50%", border: "2px solid",
              borderColor: color === c.value ? c.text : "transparent",
              background: c.bg, cursor: "pointer",
              boxShadow: color === c.value ? `0 0 0 3px ${c.border}` : undefined,
              transition: "all .12s",
            }}
          />
        ))}
        <span style={{ marginLeft: 4, fontSize: 12, color: "var(--muted)" }}>
          {COLOR_OPTIONS.find(c => c.value === color)?.label}
        </span>
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <button
          type="button"
          onClick={save}
          disabled={pending || !name.trim()}
          className="arca-btn arca-btn--primary sm"
        >
          {pending ? t("createGroup.saving") : <><IcPlus /> {t("createGroup.createBtn")}</>}
        </button>
        <button type="button" onClick={onClose} className="arca-btn arca-btn--ghost sm">{t("createGroup.cancelBtn")}</button>
      </div>
    </div>
  );
}

// ── GroupEditModal ────────────────────────────────────────────────────────────

function GroupEditModal({
  group, people, onSave, onDelete, onClose,
}: {
  group: VaultGroup;
  people: VaultPerson[];
  onSave: (updated: VaultGroup, memberIds: Set<string>) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  const t = useTranslations("Vault");
  const [name, setName]   = useState(group.name);
  const [emoji, setEmoji] = useState(group.emoji ?? "");
  const [color, setColor] = useState(group.color);
  const [memberIds, setMemberIds] = useState<Set<string>>(
    new Set(people.filter(p => p.groupId === group.id).map(p => p.id))
  );
  const [pending, startTransition] = useTransition();

  function toggleMember(personId: string) {
    setMemberIds(prev => {
      const next = new Set(prev);
      next.has(personId) ? next.delete(personId) : next.add(personId);
      return next;
    });
  }

  function save() {
    if (!name.trim()) return;
    startTransition(async () => {
      // 1. Update group metadata
      const res = await updateGroup(group.id, { name: name.trim(), emoji: emoji || null, color });
      if ("error" in res) { toast.error(res.error); return; }

      // 2. Sync membership — only changed people
      const original = new Set(people.filter(p => p.groupId === group.id).map(p => p.id));
      const toAdd    = [...memberIds].filter(id => !original.has(id));
      const toRemove = [...original].filter(id => !memberIds.has(id));

      await Promise.all([
        ...toAdd.map(id => assignPersonGroup(id, group.id)),
        ...toRemove.map(id => assignPersonGroup(id, null)),
      ]);

      onSave({ id: group.id, name: name.trim(), emoji: emoji || null, color }, memberIds);
      toast.success(t("editGroupModal.savedToast", { name: name.trim() }));
      onClose();
    });
  }

  // Close on Escape
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  const c = colorFor(color);

  return (
    <div
      data-arca-theme=""
      style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--scrim)", backdropFilter: "blur(4px)", padding: "20px 16px" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: "var(--surface-2)", borderRadius: "var(--r-xl)", boxShadow: "var(--sh-3)", width: "100%", maxWidth: 520, maxHeight: "90vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Header */}
        <div style={{ padding: "22px 24px 18px", borderBottom: "1px solid var(--hairline)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
            <h2 style={{ margin: 0, fontFamily: "var(--f-serif)", fontWeight: 400, fontSize: 22, color: "var(--ink)" }}>{t("editGroupModal.title")}</h2>
            <button type="button" onClick={onClose} style={{ border: "none", background: "transparent", cursor: "pointer", color: "var(--muted)", padding: 6, borderRadius: 8, display: "flex" }}>
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>

          {/* Name + emoji */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 62px", gap: 10, marginBottom: 14 }}>
            <input
              className="arca-input"
              placeholder={t("createGroup.namePlaceholder")}
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") save(); }}
              autoFocus
              style={{ fontWeight: 500 }}
            />
            <input
              className="arca-input"
              placeholder="😀"
              value={emoji}
              onChange={e => setEmoji(e.target.value)}
              style={{ textAlign: "center", fontSize: 20 }}
              maxLength={4}
            />
          </div>

          {/* Color picker */}
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ fontFamily: "var(--f-mono)", fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".1em" }}>{t("editGroupModal.colorLabel")}</span>
            {COLOR_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setColor(opt.value)}
                title={opt.label}
                style={{ width: 24, height: 24, borderRadius: "50%", border: "2px solid", borderColor: color === opt.value ? opt.text : "transparent", background: opt.bg, cursor: "pointer", boxShadow: color === opt.value ? `0 0 0 3px ${opt.border}` : undefined, transition: "all .12s" }}
              />
            ))}
            <span style={{ fontSize: 12, color: c.text, background: c.bg, padding: "2px 8px", borderRadius: "var(--r-pill)", border: `1px solid ${c.border}` }}>{emoji || ""} {name || t("editGroupModal.groupFallback")}</span>
          </div>
        </div>

        {/* Member list */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>
          <div style={{ fontFamily: "var(--f-mono)", fontSize: 11, textTransform: "uppercase", letterSpacing: ".1em", color: "var(--muted)", marginBottom: 12 }}>
            {t("editGroupModal.membersLabel")} · {t("editGroupModal.membersCount", { selected: memberIds.size, total: people.length })}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {people.map(p => {
              const isMember = memberIds.has(p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => toggleMember(p.id)}
                  style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: "var(--r-md)", border: `1.5px solid ${isMember ? "var(--ink)" : "var(--hairline)"}`, background: isMember ? "var(--ink)" : "var(--surface)", color: isMember ? "var(--bg)" : "var(--ink)", cursor: "pointer", transition: "all .15s", textAlign: "left", fontFamily: "var(--f-sans)" }}
                >
                  <span className={`arca-avatar sm ${toneFor(p.name)}`} style={{ background: isMember ? "color-mix(in srgb, var(--bg) 15%, transparent)" : undefined, flexShrink: 0 }}>{initials(p.name)}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 550, fontSize: 13.5 }}>{p.name}</div>
                    {p.email && <div style={{ fontSize: 12, opacity: .65 }}>{p.email}</div>}
                  </div>
                  <div style={{ width: 20, height: 20, borderRadius: "50%", border: `1.5px solid ${isMember ? "color-mix(in srgb, var(--bg) 40%, transparent)" : "var(--hairline-2)"}`, display: "grid", placeItems: "center", flexShrink: 0, background: isMember ? "color-mix(in srgb, var(--bg) 15%, transparent)" : "transparent" }}>
                    {isMember && <IcCheck />}
                  </div>
                </button>
              );
            })}
            {people.length === 0 && (
              <p style={{ color: "var(--muted)", fontSize: 13, margin: 0, textAlign: "center", padding: "20px 0" }}>{t("editGroupModal.noContacts")}</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: "16px 24px", borderTop: "1px solid var(--hairline)", display: "flex", gap: 8, justifyContent: "space-between", alignItems: "center" }}>
          <button
            type="button"
            onClick={() => { onDelete(group.id); onClose(); }}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: "var(--r-md)", border: "none", background: "transparent", color: "#C0392B", cursor: "pointer", fontSize: 13, fontFamily: "var(--f-sans)" }}
          >
            <IcTrash /> {t("editGroupModal.deleteBtn")}
          </button>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" onClick={onClose} className="arca-btn arca-btn--ghost sm">{t("editGroupModal.cancelBtn")}</button>
            <button type="button" onClick={save} disabled={pending || !name.trim()} className="arca-btn arca-btn--primary sm">
              {pending ? t("createGroup.saving") : t("editGroupModal.saveBtn")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── FilterBar ────────────────────────────────────────────────────────────────

function FilterBar({
  groups, activeGroupId, people, onFilter, onCreateGroup, onDeleteGroup, onUpdateGroup,
}: {
  groups: VaultGroup[];
  activeGroupId: string | null;
  people: VaultPerson[];
  onFilter: (id: string | null) => void;
  onCreateGroup: () => void;
  onDeleteGroup: (id: string) => void;
  onUpdateGroup: (updated: VaultGroup, memberIds: Set<string>) => void;
}) {
  const t = useTranslations("Vault");
  const [manageId, setManageId]   = useState<string | null>(null);
  const [editGroup, setEditGroup] = useState<VaultGroup | null>(null);
  const [, startDelete] = useTransition();

  function handleDelete(id: string) {
    startDelete(async () => {
      const res = await deleteGroup(id);
      if ("error" in res) { toast.error(res.error); return; }
      toast.success(t("filterBar.groupDeletedToast"));
      onDeleteGroup(id);
      if (activeGroupId === id) onFilter(null);
    });
  }

  const countFor = (gId: string) => people.filter(p => p.groupId === gId).length;

  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", marginBottom: 22 }}>
      {/* All */}
      <button
        type="button"
        onClick={() => onFilter(null)}
        style={{
          padding: "6px 14px", borderRadius: "var(--r-pill)", border: "1px solid",
          borderColor: activeGroupId === null ? "var(--ink)" : "var(--hairline-2)",
          background: activeGroupId === null ? "var(--ink)" : "var(--surface-2)",
          color: activeGroupId === null ? "var(--bg)" : "var(--ink-2)",
          fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "var(--f-sans)",
          transition: "all .14s",
        }}
      >
        {t("filterBar.all")} <span style={{ opacity: .6, marginLeft: 3 }}>{people.length}</span>
      </button>

      {/* Group chips */}
      {groups.map(g => {
        const c = colorFor(g.color);
        const isSel = activeGroupId === g.id;
        const cnt = countFor(g.id);
        return (
          <div key={g.id} style={{ position: "relative", display: "flex", alignItems: "center" }}>
            <button
              type="button"
              onClick={() => onFilter(isSel ? null : g.id)}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "6px 12px", paddingRight: 32,
                borderRadius: "var(--r-pill)", border: "1px solid",
                borderColor: isSel ? c.text : c.border,
                background: isSel ? c.bg : "var(--surface-2)",
                color: isSel ? c.text : "var(--ink-2)",
                fontSize: 13, fontWeight: isSel ? 600 : 450,
                cursor: "pointer", fontFamily: "var(--f-sans)",
                transition: "all .14s",
              }}
            >
              {g.emoji && <span style={{ fontSize: 14 }}>{g.emoji}</span>}
              {g.name}
              <span style={{ opacity: .55, fontSize: 12 }}>{cnt}</span>
            </button>

            {/* Group options button */}
            <button
              type="button"
              onClick={() => setManageId(manageId === g.id ? null : g.id)}
              style={{
                position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
                width: 18, height: 18, borderRadius: "50%", border: "none",
                background: "transparent", cursor: "pointer", display: "flex",
                alignItems: "center", justifyContent: "center", color: isSel ? c.text : "var(--muted-2)",
                opacity: 0.7,
              }}
              title={t("filterBar.groupOptions")}
            >
              <svg width={10} height={10} viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>
            </button>

            {/* Group mini-menu */}
            {manageId === g.id && (
              <div
                data-arca-theme=""
                style={{
                  position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 100,
                  background: "var(--surface-2)", border: "1px solid var(--hairline-2)",
                  borderRadius: "var(--r-lg)", boxShadow: "var(--sh-3)",
                  minWidth: 160, overflow: "hidden",
                  animation: "groupPickerIn .15s cubic-bezier(.22,1,.36,1) both",
                }}
              >
                <button
                  type="button"
                  onClick={() => { setEditGroup(g); setManageId(null); }}
                  style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "10px 14px", border: "none", background: "transparent", cursor: "pointer", color: "var(--ink)", fontSize: 13, fontFamily: "var(--f-sans)" }}
                >
                  <IcEdit /> {t("filterBar.editGroup")}
                </button>
                <div style={{ height: 1, background: "var(--hairline)", margin: "0 10px" }} />
                <button
                  type="button"
                  onClick={() => { handleDelete(g.id); setManageId(null); }}
                  style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "10px 14px", border: "none", background: "transparent", cursor: "pointer", color: "#c00", fontSize: 13, fontFamily: "var(--f-sans)" }}
                >
                  <IcTrash /> {t("filterBar.deleteGroup")}
                </button>
              </div>
            )}
          </div>
        );
      })}

      {/* Create group */}
      <button
        type="button"
        onClick={onCreateGroup}
        className="arca-btn sm arca-btn--ghost"
        style={{ gap: 5 }}
      >
        <IcPlus /> {t("filterBar.newGroup")}
      </button>

      {/* Group edit modal */}
      {editGroup && (
        <GroupEditModal
          group={editGroup}
          people={people}
          onSave={(updated, memberIds) => {
            onUpdateGroup(updated, memberIds);
            setEditGroup(null);
          }}
          onDelete={(id) => { handleDelete(id); setEditGroup(null); }}
          onClose={() => setEditGroup(null)}
        />
      )}
    </div>
  );
}

// ── AddPersonForm ─────────────────────────────────────────────────────────────

const PERSON_SECTIONS = [
  {
    key: "channels",
    fields: [
      { name: "phone",     type: "tel"  },
      { name: "whatsapp",  type: "tel"  },
    ],
  },
  {
    key: "social",
    fields: [
      { name: "facebook",  type: "text" },
      { name: "instagram", type: "text" },
    ],
  },
  {
    key: "address",
    fields: [
      { name: "address",   type: "text" },
    ],
  },
  {
    key: "personal",
    fields: [
      { name: "relationship", type: "text" },
      { name: "birthday",     type: "date" },
      { name: "anniversary",  type: "date" },
    ],
  },
] as const;

function AddPersonForm({ onAdded }: { onAdded: (p: VaultPerson) => void }) {
  const t = useTranslations("Vault");
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [pending, startT] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (open) nameRef.current?.focus(); }, [open]);

  function toggle(key: string) { setExpanded(e => ({ ...e, [key]: !e[key] })); }

  function handleSubmit(formData: FormData) {
    setError(null);
    startT(async () => {
      const res = await createContact(formData);
      if ("error" in res) { setError(res.error); return; }
      onAdded({
        id: res.id,
        name: res.name,
        email: res.email,
        // livingLinkHash is never read for a DRAFT pack (the "Otevřít" link
        // only ever shows for TRIGGERED/DELIVERED) — createContact doesn't
        // return it, so this is just a type-satisfying placeholder.
        packs: [{ id: res.packId, type: "EMOTIONAL", status: "DRAFT", executeAtDate: null, livingLinkHash: "" }],
        groupId: null,
        group: null,
      });
      toast.success(t("addPerson.addedToast", { name: res.name }));
      setOpen(false);
      setExpanded({});
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="arca-recip"
        style={{ borderStyle: "dashed", justifyContent: "center", background: "transparent", color: "var(--muted)", gap: 8, cursor: "pointer", border: "1px dashed var(--hairline-2)" }}
      >
        <IcPlus /> {t("addPerson.addAnother")}
      </button>
    );
  }

  return (
    <form
      action={handleSubmit}
      className="arca-recip"
      style={{ flexDirection: "column", alignItems: "stretch", gap: 10, padding: "18px 18px", gridColumn: "1 / -1" }}
    >
      {error && <p style={{ fontSize: 12, color: "#C0392B", margin: 0 }}>{error}</p>}

      {/* Required fields */}
      <div className="arca-form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div>
          <label className="arca-mono" style={{ color: "var(--muted)", fontSize: 10, display: "block", marginBottom: 5 }}>{t("addPerson.fullName")}</label>
          <input ref={nameRef} name="name" required placeholder={t("addPerson.namePlaceholder")} className="arca-input" style={{ fontSize: 13 }} />
        </div>
        <div>
          <label className="arca-mono" style={{ color: "var(--muted)", fontSize: 10, display: "block", marginBottom: 5 }}>{t("addPerson.email")}</label>
          <input name="email" type="email" placeholder="name@example.com" className="arca-input" style={{ fontSize: 13 }} />
        </div>
      </div>

      {/* Expandable channel sections */}
      {PERSON_SECTIONS.map(section => (
        <div key={section.key}>
          <button
            type="button"
            onClick={() => toggle(section.key)}
            style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: "var(--muted)", fontSize: 12.5, fontFamily: "var(--f-sans)", padding: "2px 0", width: "100%", textAlign: "left" }}
          >
            <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
              style={{ transition: "transform .15s", transform: expanded[section.key] ? "rotate(90deg)" : undefined }}>
              <path d="M9 6l6 6-6 6"/>
            </svg>
            {t(`addPerson.sections.${section.key}.label`)}
          </button>
          {expanded[section.key] && (
            <div className="arca-form-grid" style={{ display: "grid", gridTemplateColumns: section.fields.length > 1 ? "1fr 1fr" : "1fr", gap: 10, marginTop: 8 }}>
              {section.fields.map(f => (
                <div key={f.name}>
                  <label className="arca-mono" style={{ color: "var(--muted)", fontSize: 10, display: "block", marginBottom: 5 }}>{t(`addPerson.sections.${section.key}.${f.name}.label`)}</label>
                  <input name={f.name} type={f.type} placeholder={f.type === "date" ? "" : t(`addPerson.sections.${section.key}.${f.name}.placeholder`)} className="arca-input" style={{ fontSize: 13 }} />
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {/* Notes */}
      {expanded.notes ? (
        <div>
          <label className="arca-mono" style={{ color: "var(--muted)", fontSize: 10, display: "block", marginBottom: 5 }}>{t("addPerson.notes")}</label>
          <textarea name="notes" rows={3} placeholder={t("addPerson.notesPlaceholder")} className="arca-input" style={{ fontSize: 13, resize: "vertical" }} />
        </div>
      ) : (
        <button type="button" onClick={() => setExpanded(e => ({ ...e, notes: true }))}
          style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: "var(--muted)", fontSize: 12.5, fontFamily: "var(--f-sans)", padding: "2px 0", textAlign: "left" }}>
          <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M9 6l6 6-6 6"/></svg>
          {t("addPerson.notes")}
        </button>
      )}

      {/* Security challenge */}
      <div>
        <button type="button" onClick={() => toggle("challenge")}
          style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: "var(--muted)", fontSize: 12.5, fontFamily: "var(--f-sans)", padding: "2px 0", width: "100%", textAlign: "left" }}>
          <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
            style={{ transition: "transform .15s", transform: expanded.challenge ? "rotate(90deg)" : undefined }}>
            <path d="M9 6l6 6-6 6"/>
          </svg>
          {t("addPerson.securityQuestion")}
        </button>
        {expanded.challenge && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
            <p className="arca-sub" style={{ fontSize: 12, margin: 0 }}>{t("addPerson.securityHint")}</p>
            <input name="challengeQuestion" placeholder={t("addPerson.challengeQuestionPlaceholder")} className="arca-input" style={{ fontSize: 13 }} />
            <input name="challengeAnswer" placeholder={t("addPerson.challengeAnswerPlaceholder")} className="arca-input" style={{ fontSize: 13 }} />
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 2 }}>
        <button type="submit" disabled={pending} className="arca-btn arca-btn--primary sm">
          {pending ? t("addPerson.saving") : <><IcPlus /> {t("addPerson.addBtn")}</>}
        </button>
        <button type="button" onClick={() => { setOpen(false); setError(null); setExpanded({}); }} className="arca-btn arca-btn--ghost sm">
          {t("addPerson.cancelBtn")}
        </button>
      </div>
    </form>
  );
}

// ── PersonCard ────────────────────────────────────────────────────────────────

function PersonCard({
  person, groups, onGroupAssign, myEmail, appUrl,
}: {
  person: VaultPerson;
  groups: VaultGroup[];
  onGroupAssign: (personId: string, groupId: string | null) => void;
  myEmail: string | null;
  appUrl: string;
}) {
  const t = useTranslations("Vault");
  const dateLocale = useLocale() === "cs" ? "cs-CZ" : "en-GB";
  const [pickerOpen, setPickerOpen] = useState(false);
  const tone = toneFor(person.name);
  const init = initials(person.name);
  const activePacks = person.packs.filter(p => p.status === "ACTIVE").length;
  const nextDate = person.packs
    .filter(p => p.executeAtDate)
    .sort((a, b) => a.executeAtDate!.getTime() - b.executeAtDate!.getTime())[0]?.executeAtDate;
  const group = person.group;
  const c = group ? colorFor(group.color) : null;

  // "Otevřít" only makes sense when this card IS the logged-in user — their
  // own copy of a letter, not just someone they're writing to.
  const isMe = !!myEmail && person.email === myEmail;
  const deliveredPack = isMe
    ? person.packs.find(p => p.status === "TRIGGERED" || p.status === "DELIVERED")
    : undefined;

  return (
    <div style={{ position: "relative" }}>
      <Link href={`/dashboard/vault/${person.id}`} style={{ textDecoration: "none" }}>
        <div
          className="arca-recip"
          style={{ color: "var(--ink)", alignItems: "flex-start", paddingTop: 16, paddingBottom: 16, gap: 14 }}
        >
          <Avatar
            src={person.avatarSignedUrl}
            initials={init}
            tone={tone}
            size="lg"
            style={{ flexShrink: 0, marginTop: 2 }}
          />

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 550, fontSize: 14.5 }}>{person.name}</div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
              {person.email ?? t("personCard.noEmail")}
              {nextDate && ` · ${nextDate.toLocaleDateString(dateLocale, { day: "numeric", month: "short" })}`}
            </div>
            <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap", alignItems: "center" }}>
              <span className="arca-tag">{t("personCard.packsTag", { count: person.packs.length })}</span>
              {activePacks > 0 && <span className="arca-tag clay">{t("personCard.activeTag", { count: activePacks })}</span>}
              {deliveredPack && (
                // A plain <button>, not a nested <a> — this card is already
                // wrapped in a <Link>, and an anchor-in-anchor is invalid
                // HTML (matches the existing group-chip button below).
                <button
                  type="button"
                  onClick={e => {
                    e.preventDefault(); e.stopPropagation();
                    window.open(`${appUrl}/arca/${deliveredPack.livingLinkHash}`, "_blank", "noopener,noreferrer");
                  }}
                  className="arca-tag sage"
                  style={{ border: "none", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4, fontFamily: "var(--f-sans)" }}
                >
                  {t("personCard.deliveredOpen")}
                </button>
              )}

              {/* Group chip — click to change */}
              <button
                type="button"
                onClick={e => { e.preventDefault(); e.stopPropagation(); setPickerOpen(o => !o); }}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  padding: "3px 9px", borderRadius: "var(--r-pill)", border: "1px solid",
                  borderColor: c ? c.border : "var(--hairline-2)",
                  background: c ? c.bg : "var(--surface-2)",
                  color: c ? c.text : "var(--muted-2)",
                  fontSize: 11.5, fontWeight: 500, cursor: "pointer",
                  fontFamily: "var(--f-sans)", transition: "all .12s",
                  lineHeight: 1,
                }}
                title={t("personCard.changeGroupTitle")}
              >
                {group?.emoji && <span style={{ fontSize: 12 }}>{group.emoji}</span>}
                <span>{group?.name ?? t("personCard.groupFallback")}</span>
                <IcChev />
              </button>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0, marginTop: 2 }}>
            <span style={{ fontFamily: "var(--f-serif)", fontSize: 24, lineHeight: 1 }}>{person.packs.length}</span>
            <span className="arca-mono" style={{ color: "var(--muted)", fontSize: 11 }}>{t("personCard.packsMono")}</span>
          </div>

          <IcRight />
        </div>
      </Link>

      {pickerOpen && (
        <div style={{ position: "absolute", bottom: 20, left: 60, zIndex: 100 }}>
          <GroupPicker
            personId={person.id}
            currentGroupId={person.groupId}
            groups={groups}
            onAssign={(pid, gid) => {
              onGroupAssign(pid, gid);
            }}
            onClose={() => setPickerOpen(false)}
          />
        </div>
      )}
    </div>
  );
}

// ── Main VaultClient ──────────────────────────────────────────────────────────

interface Props {
  initialPeople: VaultPerson[];
  initialGroups: VaultGroup[];
  initialGroupId?: string | null;
  myEmail: string | null;
  appUrl: string;
}

export default function VaultClient({ initialPeople, initialGroups, initialGroupId, myEmail, appUrl }: Props) {
  const t = useTranslations("Vault");
  const [people, setPeople] = useState<VaultPerson[]>(initialPeople);
  const [groups, setGroups] = useState<VaultGroup[]>(initialGroups);
  const [activeGroup, setActiveGroup] = useState<string | null>(initialGroupId ?? null);
  const [showCreate, setShowCreate] = useState(false);
  const { setGroupImageOverride } = useVibe();

  const filtered = activeGroup === null
    ? people
    : people.filter(p => p.groupId === activeGroup);

  // Swap the one global VibeBackground's image for the active group's own
  // photo instead of mounting a second full-viewport background layer here
  // — two independent `position:fixed` backgrounds (each with its own dark
  // scrim) stacking on top of each other was producing the cut/clipped
  // look reported on this page. Clear the override on unmount so leaving
  // Schránka restores the user's own global vibe.
  useEffect(() => {
    const activeUrl = activeGroup ? groups.find(g => g.id === activeGroup)?.vibeImageUrl ?? null : null;
    setGroupImageOverride(activeUrl);
    return () => setGroupImageOverride(null);
  }, [activeGroup, groups, setGroupImageOverride]);

  const handleGroupAssign = useCallback((personId: string, groupId: string | null) => {
    const g = groupId ? groups.find(x => x.id === groupId) ?? null : null;
    setPeople(prev => prev.map(p => p.id === personId ? { ...p, groupId, group: g } : p));
    toast.success(g ? t("personCard.assignedToast", { name: g.name }) : t("personCard.unassignedToast"));
  }, [groups, t]);

  return (
    <div data-arca-theme="">

      {/* Filter bar */}
      <FilterBar
        groups={groups}
        activeGroupId={activeGroup}
        people={people}
        onFilter={setActiveGroup}
        onCreateGroup={() => setShowCreate(s => !s)}
        onDeleteGroup={(id) => {
          setGroups(prev => prev.filter(g => g.id !== id));
          setPeople(prev => prev.map(p => p.groupId === id ? { ...p, groupId: null, group: null } : p));
        }}
        onUpdateGroup={(updated, memberIds) => {
          setGroups(prev => prev.map(g => g.id === updated.id ? updated : g));
          setPeople(prev => prev.map(p => {
            const shouldBe = memberIds.has(p.id);
            const isMember = p.groupId === updated.id;
            if (shouldBe && !isMember) return { ...p, groupId: updated.id, group: updated };
            if (!shouldBe && isMember) return { ...p, groupId: null, group: null };
            if (isMember) return { ...p, group: updated };
            return p;
          }));
        }}
      />

      {/* Create group panel */}
      {showCreate && (
        <CreateGroupPanel
          onCreated={(g) => setGroups(prev => [...prev, g])}
          onClose={() => setShowCreate(false)}
        />
      )}

      {/* Person grid */}
      {filtered.length === 0 ? (
        <div className="arca-card flat" style={{ background: "var(--bg-tint)", border: "none", padding: "36px 28px", textAlign: "center" }}>
          <p className="arca-sub" style={{ fontSize: 13 }}>
            {activeGroup
              ? t("empty.groupNoMembers")
              : t("empty.noRecipients")}
          </p>
          {!activeGroup && (
            <Link href="/dashboard/arca/new" className="arca-btn arca-btn--primary" style={{ marginTop: 14, display: "inline-flex" }}>
              <IcPlus /> {t("newMessageBtn")}
            </Link>
          )}
        </div>
      ) : (
        <div className="arca-persons-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
          {filtered.map(p => (
            <PersonCard
              key={p.id}
              person={p}
              groups={groups}
              onGroupAssign={handleGroupAssign}
              myEmail={myEmail}
              appUrl={appUrl}
            />
          ))}

          {/* Add person inline form */}
          {activeGroup === null && (
            <AddPersonForm onAdded={(p) => setPeople(prev => [...prev, p])} />
          )}
        </div>
      )}

      <style>{`
        @keyframes groupPickerIn {
          from { opacity: 0; transform: scale(0.95) translateY(-4px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes groupCreateIn {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: none; }
        }
      `}</style>
    </div>
  );
}
