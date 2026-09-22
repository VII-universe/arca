"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { toast } from "sonner";
import { createBlueprintItem, updateBlueprintItem, deleteBlueprintItem } from "@/app/actions/blueprint";

// ── Types ─────────────────────────────────────────────────────────────────────

export type Category = "SUBSCRIPTION" | "DOCUMENT" | "INSTRUCTION" | "PROPERTY";

export interface BlueprintItem {
  id: string;
  category: string;
  title: string;
  content: string;
  isCritical: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ── Category config ───────────────────────────────────────────────────────────

export const CATEGORIES: {
  id: Category;
  label: string;
  sub: string;
  color: string;
  icon: React.ReactNode;
}[] = [
  {
    id: "SUBSCRIPTION",
    label: "Předplatné",
    sub: "Netflix, Spotify, pojistky, nájmy…",
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
    label: "Dokumenty",
    sub: "Závěť, pojistky, smlouvy, kde leží…",
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
    label: "Majetek",
    sub: "Nemovitosti, vozidla, účty, klíče…",
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
    label: "Instrukce",
    sub: "Jak na co, co zařídit, kde co najít…",
    color: "var(--bg-tint)",
    icon: (
      <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 6h16M4 12h16M4 18h10"/>
      </svg>
    ),
  },
];

const CAT_MAP = Object.fromEntries(CATEGORIES.map(c => [c.id, c]));

// ── Icons ─────────────────────────────────────────────────────────────────────

const IcClose  = () => <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>;
const IcEdit   = () => <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round"><path d="M11 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-5M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5Z"/></svg>;
const IcTrash  = () => <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>;
const IcAlert  = () => <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M12 9v4M12 17h.01"/><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg>;
const IcCheck  = () => <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M5 12l4 4 10-10"/></svg>;
const IcSpin   = () => <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ animation: "arca-spin .8s linear infinite" }}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>;

// ── Sheet ─────────────────────────────────────────────────────────────────────

function Sheet({
  open, onClose, preCategory, editItem,
  onCreated, onUpdated,
}: {
  open: boolean;
  onClose: () => void;
  preCategory: Category | null;
  editItem: BlueprintItem | null;
  onCreated: (item: BlueprintItem) => void;
  onUpdated: (item: BlueprintItem) => void;
}) {
  const [category, setCategory] = useState<Category>(preCategory ?? "SUBSCRIPTION");
  const [isCritical, setIsCritical] = useState(false);
  const [pending, startT] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setCategory(preCategory ?? editItem?.category as Category ?? "SUBSCRIPTION");
      setIsCritical(editItem?.isCritical ?? false);
      setError(null);
      setTimeout(() => titleRef.current?.focus(), 80);
    }
  }, [open, preCategory, editItem]);

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
      if (editItem) {
        const res = await updateBlueprintItem(editItem.id, formData);
        if ("error" in res) { setError(res.error); return; }
        onUpdated({
          ...editItem,
          title: formData.get("title") as string,
          content: formData.get("content") as string,
          isCritical,
          updatedAt: new Date(),
        });
        toast.success("Položka upravena.");
      } else {
        const res = await createBlueprintItem(formData);
        if ("error" in res) { setError(res.error); return; }
        onCreated(res as BlueprintItem);
        toast.success("Položka přidána do manuálu.");
      }
      onClose();
    });
  }

  if (!open) return null;
  const cat = CAT_MAP[category];

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
              {editItem ? "Upravit položku" : "Nová položka"}
            </div>
            <h2 style={{ margin: 0, fontFamily: "var(--f-serif)", fontSize: 20, fontWeight: 400 }}>
              {cat?.label ?? "Položka"}
            </h2>
          </div>
          <button onClick={onClose} className="arca-btn arca-btn--ghost icon-btn" aria-label="Zavřít"><IcClose /></button>
        </div>

        <form action={handleSubmit} style={{ flex: 1, padding: "22px 24px", display: "flex", flexDirection: "column", gap: 18 }}>
          {error && <p style={{ fontSize: 12.5, color: "#C0392B", background: "rgba(192,57,43,.07)", borderRadius: 8, padding: "9px 13px", margin: 0 }}>{error}</p>}

          {/* Category selector (hidden when editing) */}
          {!editItem && (
            <div>
              <label className="arca-mono" style={{ fontSize: 10, color: "var(--muted)", display: "block", marginBottom: 8 }}>Kategorie</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {CATEGORIES.map(c => (
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
            <label className="arca-mono" style={{ fontSize: 10, color: "var(--muted)", display: "block", marginBottom: 6 }}>Název *</label>
            <input
              ref={titleRef}
              name="title"
              required
              defaultValue={editItem?.title ?? ""}
              placeholder={category === "SUBSCRIPTION" ? "Netflix Premium" : category === "DOCUMENT" ? "Závěť u notáře" : category === "PROPERTY" ? "Chata Jeseníky" : "Popis instrukce"}
              className="arca-input"
              style={{ fontSize: 14 }}
            />
          </div>

          {/* Content */}
          <div style={{ flex: 1 }}>
            <label className="arca-mono" style={{ fontSize: 10, color: "var(--muted)", display: "block", marginBottom: 6 }}>Instrukce / popis *</label>
            <textarea
              name="content"
              required
              defaultValue={editItem?.content ?? ""}
              placeholder={
                category === "SUBSCRIPTION"
                  ? "Platba každý měsíc, karta končí 12/27. Zrušit přes web netflix.com/cancel."
                  : category === "DOCUMENT"
                  ? "Uloženo v červené složce v horní zásuvce pracovního stolu. Kopie u notáře Jana Nováka."
                  : category === "PROPERTY"
                  ? "Klíče visí na háčku v předsíni. Pojistná smlouva v Google Drive, složka Pojistky."
                  : "Krok za krokem — co udělat jako první, na koho se obrátit…"
              }
              className="arca-input"
              rows={7}
              style={{ fontSize: 13.5, resize: "vertical", minHeight: 140 }}
            />
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
              <div style={{ fontSize: 13, fontWeight: 550, color: isCritical ? "var(--danger-deep)" : "var(--ink)" }}>Kritické — řešit urgentně</div>
              <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 1 }}>Zobrazí se s výrazným upozorněním</div>
            </div>
          </label>

          <button type="submit" disabled={pending} className="arca-btn arca-btn--primary" style={{ marginTop: "auto" }}>
            {pending ? <IcSpin /> : <IcCheck />}
            {editItem ? "Uložit změny" : "Přidat do manuálu"}
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
  const [confirming, setConfirming] = useState(false);
  const [expanded,   setExpanded]   = useState(false);
  const [deleting,   startDel]      = useTransition();

  function handleDelete() {
    startDel(async () => {
      const res = await deleteBlueprintItem(item.id);
      if ("error" in res) { toast.error(res.error); return; }
      onDelete(item.id);
      toast.success("Položka smazána.");
    });
  }

  const cat = CAT_MAP[item.category as Category];
  const preview = item.content.length > 130 ? item.content.slice(0, 130) + "…" : item.content;
  const barColor = item.isCritical ? "var(--danger)" : (cat?.color ?? "var(--hairline)");

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
          {item.isCritical && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10.5, fontWeight: 600, color: "var(--danger-deep)", background: "var(--danger-tint)", padding: "2px 8px", borderRadius: 20, fontFamily: "var(--f-mono)", marginLeft: "auto" }}>
              <IcAlert /> Urgentní
            </span>
          )}
        </div>

        {/* Title + body */}
        <div>
          <div style={{ fontWeight: 600, fontSize: 14.5, lineHeight: 1.35 }}>{item.title}</div>
          <p style={{ margin: "5px 0 0", fontSize: 12.5, color: "var(--muted)", lineHeight: 1.55 }}>
            {expanded ? item.content : preview}
          </p>
          {item.content.length > 130 && (
            <button
              type="button"
              onClick={() => setExpanded(v => !v)}
              style={{ fontSize: 11.5, color: "var(--accent)", fontWeight: 500, background: "none", border: "none", cursor: "pointer", padding: "5px 0 0", fontFamily: "var(--f-sans)" }}
            >
              {expanded ? "Méně ▲" : "Celý text ▼"}
            </button>
          )}
        </div>

        {/* Actions — pinned to the bottom so cards of different text length still align */}
        <div style={{ display: "flex", gap: 4, marginTop: "auto", paddingTop: 4 }}>
          <button type="button" onClick={() => onEdit(item)} className="arca-btn sm arca-btn--ghost" style={{ color: "var(--muted)", padding: "5px 9px" }} title="Upravit">
            <IcEdit /> Upravit
          </button>
          {confirming ? (
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: "auto" }}>
              <span style={{ fontSize: 11.5, color: "var(--muted)" }}>Smazat?</span>
              <button type="button" onClick={handleDelete} disabled={deleting} className="arca-btn sm" style={{ color: "var(--danger-deep)", borderColor: "var(--danger-soft)", background: "var(--danger-tint)", padding: "4px 10px" }}>
                {deleting ? <IcSpin /> : "Ano"}
              </button>
              <button type="button" onClick={() => setConfirming(false)} className="arca-btn sm arca-btn--ghost" style={{ padding: "4px 10px" }}>Ne</button>
            </div>
          ) : (
            <button type="button" onClick={() => setConfirming(true)} className="arca-btn sm arca-btn--ghost" style={{ color: "var(--muted)", padding: "5px 9px", marginLeft: "auto" }} title="Smazat">
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
  category: typeof CATEGORIES[0];
  items: BlueprintItem[];
  onEdit: (item: BlueprintItem) => void;
  onDelete: (id: string) => void;
  onAdd: (cat: Category) => void;
}) {
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
          + přidat
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
  const [items, setItems] = useState<BlueprintItem[]>(initialItems);
  const [sheetOpen, setSheetOpen]       = useState(false);
  const [preCategory, setPreCategory]   = useState<Category | null>(null);
  const [editItem, setEditItem]         = useState<BlueprintItem | null>(null);

  const criticalItems = items.filter(i => i.isCritical);

  function openNew(cat: Category | null = null) {
    setEditItem(null);
    setPreCategory(cat);
    setSheetOpen(true);
  }
  function openEdit(item: BlueprintItem) {
    setEditItem(item);
    setPreCategory(null);
    setSheetOpen(true);
  }

  const grouped = Object.fromEntries(
    CATEGORIES.map(c => [c.id, items.filter(i => i.category === c.id)])
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
              {criticalItems.length} urgentní {criticalItems.length === 1 ? "položka vyžaduje" : "položky vyžadují"} okamžitou pozornost
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

      {/* ── Quick-add cards ────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 32 }}>
        {CATEGORIES.map(cat => (
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
            Manuál je zatím prázdný. Začni přidáním první položky výše.
          </p>
          <button type="button" onClick={() => openNew()} className="arca-btn arca-btn--primary" style={{ margin: "0 auto" }}>
            Přidat první položku
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          {CATEGORIES.map(cat => (
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
