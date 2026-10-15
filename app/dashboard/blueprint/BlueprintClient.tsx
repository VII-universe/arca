"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import {
  createBlueprintItem, updateBlueprintItem, deleteBlueprintItem,
  uploadBlueprintAttachment, removeBlueprintAttachment, getBlueprintAttachmentUrl,
} from "@/app/actions/blueprint";

// ── Types ─────────────────────────────────────────────────────────────────────

export type Category = "SUBSCRIPTION" | "DOCUMENT" | "INSTRUCTION" | "PROPERTY";

export interface BlueprintItem {
  id: string;
  category: string;
  title: string;
  content: string;
  isCritical: boolean;
  attachmentPath?: string | null;
  attachmentName?: string | null;
  url?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface BlueprintSuggestion {
  category: Category;
  title: string;
  why: string;
}

// ── Category config ───────────────────────────────────────────────────────────

const CATEGORY_META: { id: Category; color: string; icon: React.ReactNode }[] = [
  {
    id: "SUBSCRIPTION",
    color: "var(--sky-soft)",
    icon: (
      <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="5" width="20" height="14" rx="2"/>
        <path d="M2 10h20"/>
      </svg>
    ),
  },
  {
    id: "DOCUMENT",
    color: "var(--accent-tint)",
    icon: (
      <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>
      </svg>
    ),
  },
  {
    id: "PROPERTY",
    color: "var(--sage-soft)",
    icon: (
      <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 12.5L12 4l9 8.5"/>
        <path d="M5 11.5V20h14V11.5"/>
        <path d="M10 20v-6h4v6"/>
      </svg>
    ),
  },
  {
    id: "INSTRUCTION",
    color: "var(--bg-tint)",
    icon: (
      <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 6h16M4 12h16M4 18h10"/>
      </svg>
    ),
  },
];

function useCategories() {
  const t = useTranslations("Blueprint");
  const categories = CATEGORY_META.map(c => ({
    ...c,
    label: t(`categories.${c.id}.label`),
    sub: t(`categories.${c.id}.sub`),
  }));
  const catMap = Object.fromEntries(categories.map(c => [c.id, c]));
  return { categories, catMap };
}
type CategoryWithLabels = ReturnType<typeof useCategories>["categories"][number];

// ── Icons ─────────────────────────────────────────────────────────────────────

const IcClose  = () => <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>;
const IcEdit   = () => <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round"><path d="M11 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-5M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5Z"/></svg>;
const IcTrash  = () => <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>;
const IcAlert  = () => <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M12 9v4M12 17h.01"/><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg>;
const IcCheck  = () => <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M5 12l4 4 10-10"/></svg>;
const IcSpin   = () => <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ animation: "arca-spin .8s linear infinite" }}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>;
const IcSparkle= () => <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}><path d="M12 4v4M12 16v4M4 12h4M16 12h4M6.5 6.5l2.8 2.8M14.7 14.7l2.8 2.8M17.5 6.5l-2.8 2.8M9.3 14.7L6.5 17.5"/></svg>;
const IcPaperclip = () => <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>;
const IcDownload = () => <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v12m0 0l-4-4m4 4l4-4M4 21h16"/></svg>;
const IcLink = () => <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.07 0l2.83-2.83a5 5 0 0 0-7.07-7.07L11 5"/><path d="M14 11a5 5 0 0 0-7.07 0L4.1 13.83a5 5 0 0 0 7.07 7.07L13 19"/></svg>;
const IcEye = () => <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg>;
const IcEyeOff = () => <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-7 0-11-7-11-7a18.5 18.5 0 0 1 4.22-5.19M9.9 4.24A10.4 10.4 0 0 1 12 4c7 0 11 7 11 7a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><path d="M1 1l22 22"/></svg>;

// Days since the item was last touched — used for the "last updated" badge.
function daysSince(date: Date) {
  return Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
}

// ── Sheet ─────────────────────────────────────────────────────────────────────

function Sheet({
  open, onClose, preCategory, preTitle, editItem,
  onCreated, onUpdated,
}: {
  open: boolean;
  onClose: () => void;
  preCategory: Category | null;
  preTitle: string | null;
  editItem: BlueprintItem | null;
  onCreated: (item: BlueprintItem) => void;
  onUpdated: (item: BlueprintItem) => void;
}) {
  const t = useTranslations("Blueprint");
  const { categories, catMap } = useCategories();
  const [category, setCategory] = useState<Category>(preCategory ?? "SUBSCRIPTION");
  const [isCritical, setIsCritical] = useState(false);
  const [pending, startT] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [existingAttachmentName, setExistingAttachmentName] = useState<string | null>(null);
  const [removeExistingAttachment, setRemoveExistingAttachment] = useState(false);

  // Resets the form fields and focuses the title input whenever the sheet
  // opens (for a new item or to edit a different one) — the focus call
  // genuinely needs an effect (DOM must be mounted first); bundled with it
  // here rather than split into a separate render-time state adjustment.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (open) {
      setCategory(preCategory ?? editItem?.category as Category ?? "SUBSCRIPTION");
      setIsCritical(editItem?.isCritical ?? false);
      setError(null);
      setAttachmentFile(null);
      setExistingAttachmentName(editItem?.attachmentName ?? null);
      setRemoveExistingAttachment(false);
      setTimeout(() => titleRef.current?.focus(), 80);
    }
  }, [open, preCategory, editItem]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  function handleSubmit(formData: FormData) {
    formData.set("category", category);
    formData.set("isCritical", String(isCritical));
    setError(null);

    startT(async () => {
      let itemId: string;
      let base: BlueprintItem;

      if (editItem) {
        const res = await updateBlueprintItem(editItem.id, formData);
        if ("error" in res) { setError(res.error); return; }
        itemId = editItem.id;
        base = {
          ...editItem,
          title: formData.get("title") as string,
          content: formData.get("content") as string,
          isCritical,
          url: (formData.get("url") as string)?.trim() || null,
          updatedAt: new Date(),
        };
      } else {
        const res = await createBlueprintItem(formData);
        if ("error" in res) { setError(res.error); return; }
        itemId = res.id;
        base = res as BlueprintItem;
      }

      if (attachmentFile) {
        const fd = new FormData();
        fd.set("file", attachmentFile);
        const upRes = await uploadBlueprintAttachment(itemId, fd);
        if ("error" in upRes) {
          toast.error(upRes.error);
        } else {
          base = { ...base, attachmentName: upRes.attachmentName };
        }
      } else if (removeExistingAttachment && editItem?.attachmentPath) {
        await removeBlueprintAttachment(itemId);
        base = { ...base, attachmentPath: null, attachmentName: null };
      }

      if (editItem) { onUpdated(base); toast.success(t("sheet.savedToast")); }
      else { onCreated(base); toast.success(t("sheet.createdToast")); }
      onClose();
    });
  }

  if (!open) return null;
  const cat = catMap[category];

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{ position: "fixed", inset: 0, zIndex: 400, background: "var(--scrim)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)", animation: "bpFadeIn .18s ease" }}
      />

      {/* Panel */}
      <div
        data-arca-theme=""
        style={{
          position: "fixed", top: 0, right: 0, bottom: 0, width: "100%", maxWidth: 420,
          zIndex: 401, background: "var(--bg)", borderLeft: "1px solid var(--hairline)",
          display: "flex", flexDirection: "column", overflowY: "auto",
          animation: "bpSlideIn .22s cubic-bezier(.22,1,.36,1)",
          boxShadow: "var(--sh-3)",
        }}
      >
        {/* Header */}
        <div style={{ padding: "22px 24px 18px", borderBottom: "1px solid var(--hairline)", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div className="arca-mono" style={{ fontSize: 10, color: "var(--muted)", marginBottom: 4 }}>
              {editItem ? t("sheet.editTitle") : t("sheet.newTitle")}
            </div>
            <h2 style={{ margin: 0, fontFamily: "var(--f-serif)", fontSize: 20, fontWeight: 400 }}>
              {cat?.label ?? t("sheet.itemFallback")}
            </h2>
          </div>
          <button onClick={onClose} className="arca-btn arca-btn--ghost icon-btn" aria-label={t("sheet.close")}><IcClose /></button>
        </div>

        <form action={handleSubmit} style={{ flex: 1, padding: "22px 24px", display: "flex", flexDirection: "column", gap: 18 }}>
          {error && <p style={{ fontSize: 12.5, color: "#C0392B", background: "rgba(192,57,43,.07)", borderRadius: 8, padding: "9px 13px", margin: 0 }}>{error}</p>}

          {/* Category selector (hidden when editing) */}
          {!editItem && (
            <div>
              <label className="arca-mono" style={{ fontSize: 10, color: "var(--muted)", display: "block", marginBottom: 8 }}>{t("sheet.categoryLabel")}</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {categories.map(c => (
                  <button
                    key={c.id} type="button"
                    onClick={() => setCategory(c.id)}
                    style={{
                      display: "flex", alignItems: "center", gap: 8, padding: "9px 12px",
                      borderRadius: "var(--r-md)", border: "1.5px solid",
                      borderColor: category === c.id ? "var(--accent)" : "var(--hairline-2)",
                      background: category === c.id ? "var(--accent-tint)" : "var(--surface-2)",
                      cursor: "pointer", textAlign: "left", fontFamily: "var(--f-sans)",
                      transition: "all .12s",
                    }}
                  >
                    <span style={{ color: category === c.id ? "var(--accent)" : "var(--muted)" }}>{c.icon}</span>
                    <span style={{ fontSize: 12.5, fontWeight: 500, color: category === c.id ? "var(--ink)" : "var(--ink-2)" }}>{c.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="arca-mono" style={{ fontSize: 10, color: "var(--muted)", display: "block", marginBottom: 6 }}>{t("sheet.nameLabel")}</label>
            <input
              ref={titleRef}
              name="title"
              required
              defaultValue={editItem?.title ?? preTitle ?? ""}
              placeholder={t(`placeholders.title.${category}`)}
              className="arca-input"
              style={{ fontSize: 14 }}
            />
          </div>

          {/* Content */}
          <div style={{ flex: 1 }}>
            <label className="arca-mono" style={{ fontSize: 10, color: "var(--muted)", display: "block", marginBottom: 6 }}>{t("sheet.contentLabel")}</label>
            <textarea
              name="content"
              required
              defaultValue={editItem?.content ?? ""}
              placeholder={t(`placeholders.content.${category}`)}
              className="arca-input"
              rows={7}
              style={{ fontSize: 13.5, resize: "vertical", minHeight: 140 }}
            />
          </div>

          {/* Link */}
          <div>
            <label className="arca-mono" style={{ fontSize: 10, color: "var(--muted)", display: "block", marginBottom: 6 }}>{t("sheet.urlLabel")}</label>
            <input
              name="url"
              type="url"
              defaultValue={editItem?.url ?? ""}
              placeholder={t("sheet.urlPlaceholder")}
              className="arca-input"
              style={{ fontSize: 13.5 }}
            />
          </div>

          {/* Attachment */}
          <div>
            <label className="arca-mono" style={{ fontSize: 10, color: "var(--muted)", display: "block", marginBottom: 6 }}>{t("sheet.attachmentLabel")}</label>
            {attachmentFile ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", borderRadius: "var(--r-md)", border: "1px solid var(--hairline-2)", background: "var(--surface-2)" }}>
                <IcPaperclip />
                <span style={{ fontSize: 12.5, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>{attachmentFile.name}</span>
                <button type="button" onClick={() => setAttachmentFile(null)} className="arca-btn sm arca-btn--ghost" style={{ padding: "3px 8px" }}><IcClose /></button>
              </div>
            ) : existingAttachmentName && !removeExistingAttachment ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", borderRadius: "var(--r-md)", border: "1px solid var(--hairline-2)", background: "var(--surface-2)" }}>
                <IcPaperclip />
                <span style={{ fontSize: 12.5, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>{existingAttachmentName}</span>
                <button type="button" onClick={() => setRemoveExistingAttachment(true)} className="arca-btn sm arca-btn--ghost" style={{ padding: "3px 8px", color: "var(--danger-deep)" }}>{t("sheet.attachmentRemove")}</button>
              </div>
            ) : (
              <label className="arca-btn sm arca-btn--outline" style={{ cursor: "pointer", display: "inline-flex" }}>
                <IcPaperclip /> {t("sheet.attachmentAdd")}
                <input
                  type="file"
                  style={{ display: "none" }}
                  onChange={e => { setAttachmentFile(e.target.files?.[0] ?? null); setRemoveExistingAttachment(false); }}
                />
              </label>
            )}
            <p style={{ fontSize: 11, color: "var(--muted)", margin: "6px 0 0" }}>{t("sheet.attachmentHint")}</p>
          </div>

          {/* Critical toggle */}
          <label style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer", padding: "12px 14px", borderRadius: "var(--r-md)", background: isCritical ? "var(--danger-tint)" : "var(--surface-2)", border: `1px solid ${isCritical ? "var(--danger-soft)" : "var(--hairline-2)"}`, transition: "all .15s" }}>
            <div
              onClick={() => setIsCritical(v => !v)}
              style={{
                width: 36, height: 20, borderRadius: 10, flexShrink: 0,
                background: isCritical ? "var(--danger)" : "var(--hairline-2)",
                position: "relative", transition: "background .15s", cursor: "pointer",
              }}
            >
              <div style={{
                position: "absolute", top: 3, left: isCritical ? 19 : 3,
                width: 14, height: 14, borderRadius: "50%", background: "#fff",
                transition: "left .15s", boxShadow: "0 1px 3px rgba(0,0,0,.2)",
              }} />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 550, color: isCritical ? "var(--danger-deep)" : "var(--ink)" }}>{t("sheet.criticalLabel")}</div>
              <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 1 }}>{t("sheet.criticalHint")}</div>
            </div>
          </label>

          <button type="submit" disabled={pending} className="arca-btn arca-btn--primary" style={{ marginTop: "auto" }}>
            {pending ? <IcSpin /> : <IcCheck />}
            {editItem ? t("sheet.saveChangesBtn") : t("sheet.addBtn")}
          </button>
        </form>
      </div>
    </>
  );
}

// ── ItemCard ──────────────────────────────────────────────────────────────────

function ItemCard({
  item, onEdit, onDelete,
}: {
  item: BlueprintItem;
  onEdit: (item: BlueprintItem) => void;
  onDelete: (id: string) => void;
}) {
  const t = useTranslations("Blueprint");
  const { catMap } = useCategories();
  const [confirming, setConfirming] = useState(false);
  const [expanded,   setExpanded]   = useState(false);
  const [revealed,   setRevealed]   = useState(false);
  const [deleting,   startDel]      = useTransition();
  const [opening,    setOpening]    = useState(false);

  async function handleOpenAttachment() {
    setOpening(true);
    try {
      const res = await getBlueprintAttachmentUrl(item.id);
      if ("error" in res) { toast.error(res.error); return; }
      window.open(res.url, "_blank", "noopener,noreferrer");
    } finally {
      setOpening(false);
    }
  }

  function handleDelete() {
    startDel(async () => {
      const res = await deleteBlueprintItem(item.id);
      if ("error" in res) { toast.error(res.error); return; }
      onDelete(item.id);
      toast.success(t("card.deletedToast"));
    });
  }

  const cat = catMap[item.category as Category];
  const preview = item.content.length > 130 ? item.content.slice(0, 130) + "…" : item.content;
  const masked = "•".repeat(Math.min(Math.max(preview.length, 18), 60));
  const barColor = item.isCritical ? "var(--danger)" : (cat?.color ?? "var(--hairline)");

  const staleDays = daysSince(item.updatedAt);
  const isStale = staleDays > 180;
  const isVeryStale = staleDays > 365;

  return (
    <div
      id={`bp-item-${item.id}`}
      className="arca-card"
      style={{
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        borderLeft: `3px solid ${barColor}`,
        transition: "box-shadow .5s ease, border-color .5s ease",
      }}
    >
      <div style={{ padding: "16px 18px", flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
        {/* Meta row */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "var(--muted)" }}>
            <span style={{ opacity: .8, display: "flex" }}>{cat?.icon}</span>
            <span className="arca-mono" style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".06em" }}>{cat?.label}</span>
          </span>
          {isStale && (
            <span
              title={t("card.staleTitle")}
              style={{ fontSize: 10.5, color: isVeryStale ? "var(--danger-deep)" : "var(--muted)", background: isVeryStale ? "var(--danger-tint)" : "var(--surface-2)", padding: "2px 8px", borderRadius: 20, fontFamily: "var(--f-mono)" }}
            >
              {t("card.staleBadge", { days: staleDays })}
            </span>
          )}
          {item.isCritical && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10.5, fontWeight: 600, color: "var(--danger-deep)", background: "var(--danger-tint)", padding: "2px 8px", borderRadius: 20, fontFamily: "var(--f-mono)", marginLeft: "auto" }}>
              <IcAlert /> {t("card.urgentBadge")}
            </span>
          )}
        </div>

        {/* Title + body */}
        <div>
          <div style={{ fontWeight: 600, fontSize: 14.5, lineHeight: 1.35 }}>{item.title}</div>
          <p
            style={{
              margin: "5px 0 0", fontSize: 12.5, lineHeight: 1.55,
              color: revealed ? "var(--muted)" : "var(--hairline-2)",
              letterSpacing: revealed ? undefined : "1px",
              userSelect: revealed ? undefined : "none",
            }}
          >
            {revealed ? (expanded ? item.content : preview) : masked}
          </p>
          <div style={{ display: "flex", gap: 14, marginTop: 2 }}>
            <button
              type="button"
              onClick={() => setRevealed(v => !v)}
              style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5, color: "var(--accent)", fontWeight: 500, background: "none", border: "none", cursor: "pointer", padding: "5px 0 0", fontFamily: "var(--f-sans)" }}
            >
              {revealed ? <IcEyeOff /> : <IcEye />} {revealed ? t("card.hide") : t("card.reveal")}
            </button>
            {revealed && item.content.length > 130 && (
              <button
                type="button"
                onClick={() => setExpanded(v => !v)}
                style={{ fontSize: 11.5, color: "var(--accent)", fontWeight: 500, background: "none", border: "none", cursor: "pointer", padding: "5px 0 0", fontFamily: "var(--f-sans)" }}
              >
                {expanded ? t("card.less") : t("card.fullText")}
              </button>
            )}
          </div>
          {(item.attachmentName || item.url) && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
              {item.url && (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11.5, color: "var(--accent)", fontWeight: 500, background: "var(--accent-tint)", borderRadius: "var(--r-pill)", padding: "4px 10px", fontFamily: "var(--f-sans)", textDecoration: "none" }}
                >
                  <IcLink />
                  <span style={{ maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis" }}>{t("card.linkLabel")}</span>
                </a>
              )}
              {item.attachmentName && (
                <button
                  type="button"
                  onClick={handleOpenAttachment}
                  disabled={opening}
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11.5, color: "var(--accent)", fontWeight: 500, background: "var(--accent-tint)", border: "none", borderRadius: "var(--r-pill)", cursor: "pointer", padding: "4px 10px", fontFamily: "var(--f-sans)" }}
                >
                  {opening ? <IcSpin /> : <IcDownload />}
                  <span style={{ maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis" }}>{item.attachmentName}</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Actions — pinned to the bottom so cards of different text length still align */}
        <div style={{ display: "flex", gap: 4, marginTop: "auto", paddingTop: 4 }}>
          <button type="button" onClick={() => onEdit(item)} className="arca-btn sm arca-btn--ghost" style={{ color: "var(--muted)", padding: "5px 9px" }} title={t("card.editTitle")}>
            <IcEdit /> {t("card.editBtn")}
          </button>
          {confirming ? (
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: "auto" }}>
              <span style={{ fontSize: 11.5, color: "var(--muted)" }}>{t("card.deleteConfirm")}</span>
              <button type="button" onClick={handleDelete} disabled={deleting} className="arca-btn sm" style={{ color: "var(--danger-deep)", borderColor: "var(--danger-soft)", background: "var(--danger-tint)", padding: "4px 10px" }}>
                {deleting ? <IcSpin /> : t("card.yes")}
              </button>
              <button type="button" onClick={() => setConfirming(false)} className="arca-btn sm arca-btn--ghost" style={{ padding: "4px 10px" }}>{t("card.no")}</button>
            </div>
          ) : (
            <button type="button" onClick={() => setConfirming(true)} className="arca-btn sm arca-btn--ghost" style={{ color: "var(--muted)", padding: "5px 9px", marginLeft: "auto" }} title={t("card.deleteTitle")}>
              <IcTrash />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── CategorySection ───────────────────────────────────────────────────────────

function CategorySection({
  category, items, onEdit, onDelete, onAdd,
}: {
  category: CategoryWithLabels;
  items: BlueprintItem[];
  onEdit: (item: BlueprintItem) => void;
  onDelete: (id: string) => void;
  onAdd: (cat: Category) => void;
}) {
  const t = useTranslations("Blueprint");
  if (items.length === 0) return null;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <span style={{
          width: 32, height: 32, borderRadius: 9, flexShrink: 0,
          display: "grid", placeItems: "center",
          background: category.color, color: "var(--ink-2)",
        }}>
          {category.icon}
        </span>
        <span style={{ fontWeight: 600, fontSize: 14 }}>{category.label}</span>
        <span className="arca-mono" style={{ fontSize: 11, color: "var(--muted)" }}>{items.length}</span>
        <div style={{ flex: 1, height: 1, background: "var(--hairline)" }} />
        <button
          type="button"
          onClick={() => onAdd(category.id)}
          style={{ fontSize: 11.5, color: "var(--muted)", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--f-sans)", padding: "2px 6px" }}
        >
          {t("section.addBtn")}
        </button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
        {items.map(item => (
          <ItemCard key={item.id} item={item} onEdit={onEdit} onDelete={onDelete} />
        ))}
      </div>
    </div>
  );
}

// ── BlueprintClient (main) ────────────────────────────────────────────────────

export default function BlueprintClient({ initialItems }: { initialItems: BlueprintItem[] }) {
  const t = useTranslations("Blueprint");
  const { categories } = useCategories();
  const [items, setItems] = useState<BlueprintItem[]>(initialItems);
  const [sheetOpen, setSheetOpen]       = useState(false);
  const [preCategory, setPreCategory]   = useState<Category | null>(null);
  const [preTitle, setPreTitle]         = useState<string | null>(null);
  const [editItem, setEditItem]         = useState<BlueprintItem | null>(null);

  const criticalItems = items.filter(i => i.isCritical);

  function openNew(cat: Category | null = null, title: string | null = null) {
    setEditItem(null);
    setPreCategory(cat);
    setPreTitle(title);
    setSheetOpen(true);
  }
  function openEdit(item: BlueprintItem) {
    setEditItem(item);
    setPreCategory(null);
    setPreTitle(null);
    setSheetOpen(true);
  }

  // ── AI completeness check ────────────────────────────────────────────────
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<BlueprintSuggestion[] | null>(null);

  async function runAiCheck() {
    setAiLoading(true);
    setAiError(null);
    try {
      // Only category + title ever leave the browser — never an item's
      // content (that's where passwords/account numbers live).
      const res = await fetch("/api/arca/ai-blueprint-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: items.map(i => ({ category: i.category, title: i.title })) }),
      });
      const data = await res.json();
      if (!res.ok || data.error) { setAiError(data.error ?? t("aiCheck.genericError")); return; }
      setAiSuggestions(data.suggestions ?? []);
    } catch {
      setAiError(t("aiCheck.connectionError"));
    } finally {
      setAiLoading(false);
    }
  }

  function addSuggestion(s: BlueprintSuggestion) {
    openNew(s.category, s.title);
    setAiSuggestions(prev => prev?.filter(x => x !== s) ?? null);
  }

  const grouped = Object.fromEntries(
    categories.map(c => [c.id, items.filter(i => i.category === c.id)])
  );

  function focusItem(id: string) {
    const el = document.getElementById(`bp-item-${id}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.style.boxShadow = "0 0 0 3px var(--danger-soft)";
    setTimeout(() => { el.style.boxShadow = ""; }, 1400);
  }

  return (
    <div data-arca-theme="">

      {/* ── Critical alert banner ──────────────────────────────── */}
      {criticalItems.length > 0 && (
        <div style={{ display: "flex", gap: 14, padding: "16px 20px", background: "var(--danger-tint)", border: "1px solid var(--danger-soft)", borderRadius: "var(--r-lg)", marginBottom: 24 }}>
          <span style={{
            width: 34, height: 34, borderRadius: 10, flexShrink: 0,
            display: "grid", placeItems: "center",
            background: "var(--danger)", color: "#fff",
          }}>
            <IcAlert />
          </span>
          <div style={{ minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 13.5, color: "var(--danger-deep)", fontWeight: 600 }}>
              {t("criticalBanner", { count: criticalItems.length })}
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
              {criticalItems.map(i => (
                <button
                  key={i.id}
                  type="button"
                  onClick={() => focusItem(i.id)}
                  style={{
                    fontSize: 12, fontWeight: 500, color: "var(--danger-deep)",
                    background: "color-mix(in srgb, var(--danger) 12%, var(--surface))",
                    border: "1px solid var(--danger-soft)", borderRadius: "var(--r-pill)",
                    padding: "3px 11px", cursor: "pointer", fontFamily: "var(--f-sans)",
                  }}
                >
                  {i.title}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── AI completeness check ─────────────────────────────── */}
      <div className="arca-card" style={{ padding: "18px 20px", marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <span style={{
            width: 34, height: 34, borderRadius: 10, flexShrink: 0,
            display: "grid", placeItems: "center",
            background: "var(--gradient-primary)", color: "var(--on-accent)",
          }}>
            <IcSparkle />
          </span>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)" }}>{t("aiCheck.title")}</div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 1 }}>{t("aiCheck.subtitle")}</div>
          </div>
          <button
            type="button"
            onClick={runAiCheck}
            disabled={aiLoading}
            className="arca-btn sm arca-btn--outline"
          >
            {aiLoading ? <><IcSpin /> {t("aiCheck.loading")}</> : t("aiCheck.button")}
          </button>
        </div>

        {aiError && <p style={{ fontSize: 12.5, color: "#C0392B", margin: "12px 0 0" }}>{aiError}</p>}

        {aiSuggestions && (
          aiSuggestions.length === 0 ? (
            <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "12px 0 0" }}>{t("aiCheck.empty")}</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 14 }}>
              {aiSuggestions.map((s, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: "var(--r-md)", background: "var(--surface-2)", border: "1px solid var(--hairline-2)" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 550 }}>{s.title}</div>
                    <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 2 }}>{s.why}</div>
                  </div>
                  <button type="button" onClick={() => addSuggestion(s)} className="arca-btn sm arca-btn--clay" style={{ flexShrink: 0 }}>
                    {t("aiCheck.addBtn")}
                  </button>
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {/* ── Quick-add cards ────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 32 }}>
        {categories.map(cat => (
          <button
            key={cat.id}
            type="button"
            onClick={() => openNew(cat.id)}
            className="arca-card"
            style={{
              background: cat.color, border: "none", cursor: "pointer", padding: "18px 16px",
              display: "flex", flexDirection: "column", gap: 10, alignItems: "flex-start",
              textAlign: "left", transition: "transform .12s, box-shadow .12s",
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLElement).style.boxShadow = "var(--sh-2)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ""; (e.currentTarget as HTMLElement).style.boxShadow = ""; }}
          >
            <span style={{
              width: 36, height: 36, borderRadius: 10, flexShrink: 0,
              display: "grid", placeItems: "center",
              background: "color-mix(in srgb, var(--ink) 8%, transparent)", color: "var(--ink-2)",
            }}>
              {cat.icon}
            </span>
            <div>
              <div style={{ fontWeight: 600, fontSize: 13, color: "var(--ink)" }}>{cat.label}</div>
              <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 3, lineHeight: 1.4 }}>{cat.sub}</div>
            </div>
          </button>
        ))}
      </div>

      {/* ── Items grouped by category ──────────────────────────── */}
      {items.length === 0 ? (
        <div className="arca-card flat" style={{ background: "var(--bg-tint)", border: "none", padding: "40px 28px", textAlign: "center" }}>
          <p className="arca-sub" style={{ fontSize: 13.5, marginBottom: 16 }}>
            {t("empty.text")}
          </p>
          <button type="button" onClick={() => openNew()} className="arca-btn arca-btn--primary" style={{ margin: "0 auto" }}>
            {t("empty.addFirstBtn")}
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          {categories.map(cat => (
            <CategorySection
              key={cat.id}
              category={cat}
              items={grouped[cat.id] ?? []}
              onEdit={openEdit}
              onDelete={id => setItems(prev => prev.filter(i => i.id !== id))}
              onAdd={openNew}
            />
          ))}
        </div>
      )}

      {/* ── Sheet ──────────────────────────────────────────────── */}
      <Sheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        preCategory={preCategory}
        preTitle={preTitle}
        editItem={editItem}
        onCreated={item => setItems(prev => [...prev, item])}
        onUpdated={updated => setItems(prev => prev.map(i => i.id === updated.id ? updated : i))}
      />

      <style>{`
        @keyframes bpFadeIn  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes bpSlideIn { from { transform: translateX(100%); } to { transform: none; } }
      `}</style>
    </div>
  );
}
