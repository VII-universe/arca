"use client";

import { useRef, useCallback, useEffect, useState } from "react";
import { useEditor, EditorContent, ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import TiptapImage from "@tiptap/extension-image";
import { TextStyle } from "@tiptap/extension-text-style";
import { FontFamily } from "@tiptap/extension-font-family";
import { Extension } from "@tiptap/core";
import { createClient } from "@/lib/supabase/client";

// ── Font-size TipTap extension ────────────────────────────────────────────────
const FontSize = Extension.create({
  name: "fontSize",
  addGlobalAttributes() {
    return [{
      types: ["textStyle"],
      attributes: {
        fontSize: {
          default: null,
          parseHTML: el => el.style.fontSize || null,
          renderHTML: attrs => attrs.fontSize ? { style: `font-size:${attrs.fontSize}` } : {},
        },
      },
    }];
  },
});

// ── Upload helper ─────────────────────────────────────────────────────────────
// Returns a persistent Supabase signed URL, or null on failure.
// Always resolves — never throws.

async function uploadToSupabase(file: File, userId?: string, packId?: string): Promise<string | null> {
  try {
    const supabase = createClient();
    // Get the user ID — either from prop or from current session
    const { data: { user } } = await supabase.auth.getUser();
    const uid = userId ?? user?.id;
    if (!uid) return null;

    const ts = Date.now();
    const safe = (file.name || "image.jpg").toLowerCase().replace(/[^a-z0-9.\-_]/g, "_").slice(0, 80);
    const path = packId
      ? `${uid}/inline/${packId}/${ts}_${safe}`
      : `${uid}/inline/${ts}_${safe}`;

    const { error } = await supabase.storage
      .from("arca-media")
      .upload(path, file, { contentType: file.type, upsert: false });
    if (error) { console.warn("[ArcaRichEditor] upload failed:", error.message); return null; }

    const { data } = await supabase.storage
      .from("arca-media")
      .createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
    return data?.signedUrl ?? null;
  } catch (err) {
    console.warn("[ArcaRichEditor] upload error:", err);
    return null;
  }
}

// ── Crop helper ───────────────────────────────────────────────────────────────

async function cropAndUpload(
  src: string,
  crop: { x: number; y: number; w: number; h: number },
  display: { w: number; h: number },
  userId?: string, packId?: string
): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = async () => {
      const sx = (crop.x / display.w) * img.naturalWidth;
      const sy = (crop.y / display.h) * img.naturalHeight;
      const sw = (crop.w / display.w) * img.naturalWidth;
      const sh = (crop.h / display.h) * img.naturalHeight;
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(sw);
      canvas.height = Math.round(sh);
      const ctx = canvas.getContext("2d");
      if (!ctx) { resolve(null); return; }
      // Leave canvas transparent — toBlob with PNG preserves alpha channel.
      // Do NOT fill with white so PNGs with transparent backgrounds stay transparent.
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(async (blob) => {
        if (!blob) { resolve(null); return; }
        const file = new File([blob], "cropped.png", { type: "image/png" });
        const url = await uploadToSupabase(file, userId, packId);
        resolve(url);
      }, "image/png");
    };
    img.onerror = () => resolve(null);
    img.crossOrigin = "anonymous";
    img.src = src;
  });
}

// ── Image extension with width/align attributes ───────────────────────────────

const ImageWithAttrs = TiptapImage.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: el => el.getAttribute("width"),
        renderHTML: attrs => attrs.width ? { width: attrs.width, style: `width:${attrs.width}px;max-width:100%` } : {},
      },
      align: {
        default: "left",
        parseHTML: el => el.getAttribute("data-align") ?? "left",
        renderHTML: attrs => ({ "data-align": attrs.align }),
      },
    };
  },
});

// ── Crop overlay component ────────────────────────────────────────────────────

function CropOverlay({
  imgEl,
  onDone,
  onCancel,
  userId,
  packId,
  onNewSrc,
}: {
  imgEl: HTMLImageElement;
  onDone: () => void;
  onCancel: () => void;
  userId?: string;
  packId?: string;
  onNewSrc: (src: string) => void;
}) {
  const [rect, setRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [applying, setApplying] = useState(false);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const imgRect = imgEl.getBoundingClientRect();

  const onMouseDown = (e: React.MouseEvent) => {
    const or = overlayRef.current?.getBoundingClientRect();
    if (!or) return;
    const x = e.clientX - or.left;
    const y = e.clientY - or.top;
    startRef.current = { x, y };
    setRect({ x, y, w: 0, h: 0 });

    const onMove = (ev: MouseEvent) => {
      if (!startRef.current) return;
      const cx = ev.clientX - or.left;
      const cy = ev.clientY - or.top;
      setRect({
        x: Math.min(startRef.current.x, cx),
        y: Math.min(startRef.current.y, cy),
        w: Math.abs(cx - startRef.current.x),
        h: Math.abs(cy - startRef.current.y),
      });
    };
    const onUp = () => {
      startRef.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const apply = async () => {
    if (!rect || rect.w < 10 || rect.h < 10) return;
    setApplying(true);
    const url = await cropAndUpload(imgEl.src, rect, { w: imgRect.width, h: imgRect.height }, userId, packId);
    if (url) onNewSrc(url);
    setApplying(false);
    onDone();
  };

  return (
    <div
      ref={overlayRef}
      onMouseDown={onMouseDown}
      style={{
        position: "fixed",
        left: imgRect.left, top: imgRect.top,
        width: imgRect.width, height: imgRect.height,
        cursor: "crosshair", zIndex: 9999,
        background: "rgba(0,0,0,0.5)",
        borderRadius: 8,
        userSelect: "none",
      }}
    >
      {rect && rect.w > 4 && rect.h > 4 && (
        <div style={{
          position: "absolute",
          left: rect.x, top: rect.y,
          width: rect.w, height: rect.h,
          border: "2px dashed rgba(255,255,255,0.9)",
          background: "rgba(255,255,255,0.1)",
          pointerEvents: "none",
        }} />
      )}
      <div style={{ position: "absolute", top: 6, left: "50%", transform: "translateX(-50%)", background: "rgba(0,0,0,0.75)", color: "#fff", fontSize: 11, borderRadius: 4, padding: "3px 10px", whiteSpace: "nowrap", pointerEvents: "none" }}>
        Přetáhni oblast k ořezu
      </div>
      <div style={{ position: "absolute", bottom: 8, right: 8, display: "flex", gap: 6 }} onMouseDown={e => e.stopPropagation()}>
        <button
          onClick={apply}
          disabled={applying || !rect || rect.w < 10}
          style={{ background: "#B6754A", color: "#fff", border: "none", borderRadius: 6, padding: "6px 14px", fontSize: 12, fontWeight: 600, cursor: applying ? "wait" : "pointer", opacity: (!rect || rect.w < 10) ? 0.5 : 1 }}
        >
          {applying ? "Ukládám…" : "Použít ořez"}
        </button>
        <button
          onClick={onCancel}
          style={{ background: "rgba(255,255,255,0.15)", color: "#fff", border: "none", borderRadius: 6, padding: "6px 12px", fontSize: 12, cursor: "pointer" }}
        >
          Zrušit
        </button>
      </div>
    </div>
  );
}

// ── Toolbar helpers ───────────────────────────────────────────────────────────

function ToolBtn({ onClick, title, children, active }: { onClick: () => void; title: string; children: React.ReactNode; active?: boolean }) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={e => { e.preventDefault(); onClick(); }}
      style={{
        width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center",
        borderRadius: 6, border: "none", cursor: "pointer", fontFamily: "inherit",
        background: active ? "var(--hover-strong)" : "transparent",
        color: active ? "var(--ink)" : "var(--muted)",
        transition: "all 0.12s",
        fontSize: 13, flexShrink: 0,
      }}
    >
      {children}
    </button>
  );
}
const TDivider = () => <div style={{ width: 1, height: 16, background: "var(--hairline-2)", margin: "0 3px", flexShrink: 0 }} />;

// ── Custom dropdown for toolbar ───────────────────────────────────────────────

function ToolSelect({
  value, onChange, options, width = 110, title,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string; style?: React.CSSProperties }[];
  width?: number;
  title?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = options.find(o => o.value === value) ?? options[0];

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative", flexShrink: 0 }} title={title}>
      <button
        type="button"
        onMouseDown={e => { e.preventDefault(); setOpen(o => !o); }}
        style={{
          display: "flex", alignItems: "center", gap: 4,
          background: "var(--surface-2)", border: "1px solid var(--hairline-2)",
          borderRadius: 6, padding: "3px 8px 3px 8px", cursor: "pointer",
          fontSize: 12, color: "var(--ink)", fontFamily: "var(--f-sans)",
          width, justifyContent: "space-between", height: 26,
          ...(current.style ?? {}),
        }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, textAlign: "left" }}>
          {current.label}
        </span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ flexShrink: 0, opacity: 0.5 }}>
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0,
          minWidth: width, background: "var(--surface-2)",
          border: "1px solid var(--hairline-2)", borderRadius: 8,
          boxShadow: "var(--sh-3)", zIndex: 200,
          overflow: "hidden", padding: "3px 0",
        }}>
          {options.map(opt => (
            <button
              key={opt.value}
              type="button"
              onMouseDown={e => { e.preventDefault(); onChange(opt.value); setOpen(false); }}
              style={{
                display: "block", width: "100%", textAlign: "left",
                padding: "6px 12px", border: "none", cursor: "pointer",
                background: opt.value === value ? "var(--hover-strong)" : "transparent",
                color: "var(--ink)", fontSize: 13,
                fontFamily: "var(--f-sans)",
                ...(opt.style ?? {}),
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Resizable Image NodeView ──────────────────────────────────────────────────

function ResizableImageView({ node, updateAttributes, selected }: NodeViewProps) {
  const { src, alt, width, align } = node.attrs as {
    src: string; alt?: string; width?: number; align?: string;
  };
  const imgRef = useRef<HTMLImageElement>(null);
  const [dragging, setDragging] = useState(false);
  const [liveWidth, setLiveWidth] = useState<number | null>(null);

  const startResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startW = imgRef.current?.getBoundingClientRect().width ?? (width ?? 320);
    setDragging(true);

    const onMove = (ev: MouseEvent) => {
      const newW = Math.max(60, Math.round(startW + ev.clientX - startX));
      setLiveWidth(newW);
    };
    const onUp = (ev: MouseEvent) => {
      const finalW = Math.max(60, Math.round(startW + ev.clientX - startX));
      updateAttributes({ width: finalW });
      setLiveWidth(null);
      setDragging(false);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [width, updateAttributes]);

  const displayWidth = liveWidth ?? width;
  const alignStyle: React.CSSProperties =
    align === "center" ? { display: "block", margin: "12px auto" } :
    align === "right"  ? { display: "block", margin: "12px 0 12px auto" } :
                         { display: "block", margin: "12px 0" };

  return (
    <NodeViewWrapper as="div" style={{ ...alignStyle, display: "inline-block", maxWidth: "100%", position: "relative", lineHeight: 0, userSelect: "none" }}>
      <img
        ref={imgRef}
        src={src}
        alt={alt ?? ""}
        draggable={false}
        style={{
          width: displayWidth ? `${displayWidth}px` : "100%",
          maxWidth: "100%",
          height: "auto",
          borderRadius: 8,
          display: "block",
          boxShadow: "0 2px 8px rgba(28,26,22,0.12)",
          outline: selected ? "2px solid var(--accent)" : "none",
          outlineOffset: 2,
          cursor: dragging ? "ew-resize" : "default",
          transition: dragging ? "none" : "outline 0.1s",
          background: "repeating-conic-gradient(#d0ccca 0% 25%, #f0ede9 0% 50%) 0 0 / 12px 12px",
        }}
      />

      {/* Drag handle — bottom-right corner, visible when selected */}
      {selected && (
        <>
          {/* SE corner handle */}
          <div
            onMouseDown={startResize}
            title="Táhni pro změnu velikosti"
            style={{
              position: "absolute", right: -6, bottom: -6,
              width: 14, height: 14,
              background: "var(--accent)",
              border: "2px solid var(--surface)",
              borderRadius: 3,
              cursor: "se-resize",
              zIndex: 10,
            }}
          />
          {/* Right-edge handle */}
          <div
            onMouseDown={startResize}
            title="Táhni pro změnu šířky"
            style={{
              position: "absolute", right: -5, top: "50%",
              transform: "translateY(-50%)",
              width: 8, height: 28,
              background: "var(--accent)",
              border: "2px solid var(--surface)",
              borderRadius: 3,
              cursor: "e-resize",
              zIndex: 10,
              opacity: 0.75,
            }}
          />
          {/* Width tooltip during drag */}
          {dragging && liveWidth && (
            <div style={{
              position: "absolute", top: -28, left: "50%", transform: "translateX(-50%)",
              background: "var(--ink)", color: "var(--bg)",
              fontSize: 11, fontFamily: "var(--f-mono)",
              padding: "2px 8px", borderRadius: 4, whiteSpace: "nowrap",
              pointerEvents: "none",
            }}>
              {liveWidth}px
            </div>
          )}
        </>
      )}
    </NodeViewWrapper>
  );
}

// ── Image extension with NodeView + extra attributes ──────────────────────────

const ResizableImage = TiptapImage.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: el => el.getAttribute("width"),
        renderHTML: attrs => attrs.width
          ? { width: attrs.width, style: `width:${attrs.width}px;max-width:100%` }
          : {},
      },
      align: {
        default: "left",
        parseHTML: el => el.getAttribute("data-align") ?? "left",
        renderHTML: attrs => ({ "data-align": attrs.align }),
      },
    };
  },
  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageView);
  },
});

// ── AI Assist panel ───────────────────────────────────────────────────────────

const AI_OCCASIONS = [
  { value: "narozeniny", label: "Narozeniny" },
  { value: "poděkování", label: "Poděkování" },
  { value: "omluva", label: "Omluva" },
  { value: "rozloučení", label: "Rozloučení" },
  { value: "povzbuzení", label: "Povzbuzení" },
  { value: "výročí", label: "Výročí" },
  { value: "osobní zpráva", label: "Osobní zpráva" },
];

interface AIVersion { label: string; content: string; }

function AiAssistPanel({
  onInsert,
  onClose,
  recipientName,
  relationship,
  existingContent,
}: {
  onInsert: (html: string) => void;
  onClose: () => void;
  recipientName?: string;
  relationship?: string;
  existingContent?: string;
}) {
  const [occasion, setOccasion] = useState(AI_OCCASIONS[0].value);
  const [userNotes, setUserNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [versions, setVersions] = useState<AIVersion[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    if (!userNotes.trim()) return;
    setLoading(true);
    setError(null);
    setVersions([]);
    try {
      const res = await fetch("/api/arca/ai-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientName, relationship, occasion, userNotes, existingContent }),
      });
      const data = await res.json();
      if (!res.ok || data.error) { setError(data.error ?? "Chyba."); return; }
      setVersions(data.versions ?? []);
    } catch {
      setError("Nepodařilo se spojit s AI.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 500, display: "flex",
    }}>
      {/* backdrop */}
      <div onClick={onClose} style={{ flex: 1, background: "rgba(28,26,22,.45)", backdropFilter: "blur(3px)" }} />

      {/* panel */}
      <div
        data-arca-theme=""
        style={{
          width: 440, background: "var(--surface)", borderLeft: "1px solid var(--hairline)",
          display: "flex", flexDirection: "column", overflowY: "auto",
          boxShadow: "var(--sh-3)", fontFamily: "var(--f-sans)",
        }}
      >
        {/* Header */}
        <div style={{ padding: "18px 22px", borderBottom: "1px solid var(--hairline)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth={1.6}><path d="M12 4v4M12 16v4M4 12h4M16 12h4M6.5 6.5l2.8 2.8M14.7 14.7l2.8 2.8M17.5 6.5l-2.8 2.8M9.3 14.7L6.5 17.5"/></svg>
            <h3 style={{ fontFamily: "var(--f-serif)", fontWeight: 400, fontSize: 19, margin: 0 }}>AI Pomoc</h3>
            <button type="button" onClick={onClose} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 4 }}>
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>
          {/* Privacy disclaimer */}
          <div style={{
            background: "var(--bg-tint)", borderRadius: "var(--r-md)", padding: "10px 14px",
            border: "1px solid var(--hairline)",
          }}>
            <p style={{ margin: 0, fontSize: 11.5, color: "var(--muted)", lineHeight: 1.55 }}>
              <strong style={{ color: "var(--ink-2)" }}>Soukromí</strong> — ARCA dbá na absolutní soukromí. Text, který zadáš do tohoto pole, bude anonymně zpracován AI modelem pro vygenerování inspirace a není nikde ukládán na našich serverech.
            </p>
          </div>
        </div>

        {/* Form */}
        <div style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 16, flex: 1 }}>
          {/* Occasion */}
          <div>
            <label className="arca-mono" style={{ color: "var(--muted)", fontSize: 11, display: "block", marginBottom: 8 }}>Příležitost</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {AI_OCCASIONS.map(o => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => setOccasion(o.value)}
                  style={{
                    padding: "5px 12px", borderRadius: "var(--r-pill)", fontSize: 12.5, cursor: "pointer",
                    border: "1px solid",
                    borderColor: occasion === o.value ? "var(--accent)" : "var(--hairline-2)",
                    background: occasion === o.value ? "var(--accent-tint)" : "var(--surface-2)",
                    color: occasion === o.value ? "var(--accent-deep)" : "var(--ink-2)",
                    fontFamily: "var(--f-sans)",
                  }}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="arca-mono" style={{ color: "var(--muted)", fontSize: 11, display: "block", marginBottom: 6 }}>Klíčové myšlenky</label>
            <textarea
              className="arca-input"
              rows={4}
              placeholder={"Napiš pár slov, co chceš vyjádřit… např. chci jí poděkovat za to, jak mě podržela"}
              value={userNotes}
              onChange={e => setUserNotes(e.target.value)}
              style={{ resize: "vertical", fontFamily: "var(--f-sans)" }}
            />
          </div>

          <button
            type="button"
            onClick={generate}
            disabled={loading || !userNotes.trim()}
            className="arca-btn arca-btn--primary"
            style={{ justifyContent: "center" }}
          >
            {loading ? (
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ animation: "arca-spin .8s linear infinite" }}>
                  <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                </svg>
                Generuji…
              </span>
            ) : "Vygenerovat návrhy"}
          </button>

          {error && (
            <p style={{ fontSize: 13, color: "#c00", margin: 0 }}>{error}</p>
          )}

          {/* Results */}
          {versions.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <hr style={{ border: 0, height: 1, background: "var(--hairline)", margin: "4px 0" }} />
              {versions.map((v, i) => (
                <div key={i} className="arca-card" style={{ padding: "16px 18px" }}>
                  <div className="arca-mono" style={{ fontSize: 11, color: "var(--muted)", marginBottom: 8 }}>{v.label}</div>
                  <p style={{ fontFamily: "var(--f-serif)", fontSize: 14.5, lineHeight: 1.6, margin: "0 0 14px", color: "var(--ink-2)" }}>
                    {v.content}
                  </p>
                  <button
                    type="button"
                    onClick={() => { onInsert(`<p>${v.content.replace(/\n/g, "</p><p>")}</p>`); onClose(); }}
                    className="arca-btn sm arca-btn--clay"
                  >
                    Použít tento text
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface ArcaRichEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  packId?: string;
  userId?: string;
  minHeight?: number;
  recipientName?: string;
  relationship?: string;
}

export default function ArcaRichEditor({
  content, onChange,
  placeholder = "Začni psát…",
  packId, userId,
  minHeight = 260,
  recipientName,
  relationship,
}: ArcaRichEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cropImg, setCropImg] = useState<HTMLImageElement | null>(null);
  const [showAiPanel, setShowAiPanel] = useState(false);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      TextStyle,
      FontFamily.configure({ types: ["textStyle"] }),
      FontSize,
      Placeholder.configure({ placeholder }),
      ResizableImage.configure({ inline: false, allowBase64: false }),
    ],
    content,
    onUpdate: ({ editor: e }) => onChange(e.getHTML()),
  });

  const insertImage = useCallback(async (file: File) => {
    if (!editor) return;
    if (!file.type.startsWith("image/")) return;

    // 1. Insert immediately with a local blob URL so the user sees it right away
    const blobUrl = URL.createObjectURL(file);
    editor.chain().focus().setImage({ src: blobUrl, alt: file.name }).run();

    // 2. Upload to Supabase in the background and swap the src when done
    const persistentUrl = await uploadToSupabase(file, userId, packId);
    if (!persistentUrl) return; // keep blob URL — works for the current session

    // Replace blob URL with the persistent signed URL in the document
    const editorState = editor.state;
    let found = false;
    editorState.doc.descendants((node, pos) => {
      if (found) return false;
      if (node.type.name === "image" && node.attrs.src === blobUrl) {
        const tr = editorState.tr.setNodeMarkup(pos, undefined, {
          ...node.attrs,
          src: persistentUrl,
        });
        editor.view.dispatch(tr);
        URL.revokeObjectURL(blobUrl);
        found = true;
        return false;
      }
    });
  }, [editor, userId, packId]);

  const insertImageUrl = useCallback(() => {
    const url = window.prompt("URL obrázku:");
    if (url && editor) editor.chain().focus().setImage({ src: url }).run();
  }, [editor]);

  // Paste & drop images
  const wrapRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || !editor) return;
    const onPaste = async (e: ClipboardEvent) => {
      const item = Array.from(e.clipboardData?.items ?? []).find(i => i.type.startsWith("image/"));
      if (!item) return;
      const file = item.getAsFile();
      if (!file) return;
      e.preventDefault();
      await insertImage(file);
    };
    const onDrop = async (e: DragEvent) => {
      const file = Array.from(e.dataTransfer?.files ?? []).find(f => f.type.startsWith("image/"));
      if (!file) return;
      e.preventDefault();
      await insertImage(file);
    };
    el.addEventListener("paste", onPaste);
    el.addEventListener("drop", onDrop);
    return () => { el.removeEventListener("paste", onPaste); el.removeEventListener("drop", onDrop); };
  }, [editor, insertImage]);

  // Helpers to resize the currently selected image
  const getSelectedImg = () => {
    if (!editor) return null;
    const { from } = editor.state.selection;
    const node = editor.state.doc.nodeAt(from);
    if (node?.type.name !== "image") return null;
    return node.attrs;
  };
  const setWidth = (delta: number) => {
    if (!editor) return;
    const attrs = getSelectedImg();
    if (!attrs) return;
    const cur = attrs.width ?? 300;
    editor.chain().focus().updateAttributes("image", { width: Math.max(60, cur + delta) }).run();
  };
  const setAlign = (align: string) => {
    if (!editor) return;
    editor.chain().focus().updateAttributes("image", { align }).run();
  };

  const openCrop = () => {
    if (!editor) return;
    // Find the img DOM element that's currently selected
    const editorEl = wrapRef.current?.querySelector(".tiptap");
    if (!editorEl) return;
    const { from } = editor.state.selection;
    const node = editor.state.doc.nodeAt(from);
    if (node?.type.name !== "image") return;
    const src = node.attrs.src as string;
    // Find the img tag with this src
    const imgEl = Array.from(editorEl.querySelectorAll("img")).find(img => img.src === src || img.getAttribute("src") === src);
    if (imgEl) setCropImg(imgEl as HTMLImageElement);
  };

  const isImageSelected = editor?.isActive("image") ?? false;
  const charCount = editor?.getText().length ?? 0;

  return (
    <div className="arca-card" style={{ padding: 0, overflow: "hidden" }}>
      {/* Toolbar */}
      <div style={{ padding: "8px 12px", borderBottom: "1px solid var(--hairline)", display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap", background: "var(--bg-tint)" }}>
        <ToolBtn title="Tučné (Ctrl+B)" onClick={() => editor?.chain().focus().toggleBold().run()} active={editor?.isActive("bold")}>
          <strong style={{ fontFamily: "var(--f-serif)", fontSize: 14 }}>B</strong>
        </ToolBtn>
        <ToolBtn title="Kurzíva (Ctrl+I)" onClick={() => editor?.chain().focus().toggleItalic().run()} active={editor?.isActive("italic")}>
          <em style={{ fontFamily: "var(--f-serif)", fontSize: 14 }}>I</em>
        </ToolBtn>
        <ToolBtn title="Citát" onClick={() => editor?.chain().focus().toggleBlockquote().run()} active={editor?.isActive("blockquote")}>
          <span style={{ fontSize: 16 }}>"</span>
        </ToolBtn>
        <TDivider />
        <ToolBtn title="Vložit obrázek ze souboru" onClick={() => fileInputRef.current?.click()}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round">
            <rect x="3.5" y="5" width="17" height="14" rx="2"/>
            <circle cx="9" cy="10.5" r="1.5"/>
            <path d="M4 17l5-4 4 3 3-2 4 3"/>
          </svg>
        </ToolBtn>
        <ToolBtn title="Vložit obrázek z URL" onClick={insertImageUrl}>
          <span style={{ fontSize: 10, fontFamily: "var(--f-mono)", letterSpacing: "0.02em" }}>url</span>
        </ToolBtn>
        <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }}
          onChange={async e => { const f = e.target.files?.[0]; if (f) await insertImage(f); e.target.value = ""; }}
        />
        <TDivider />
        {/* Font family */}
        <ToolSelect
          title="Změnit písmo"
          width={118}
          value={editor?.getAttributes("textStyle").fontFamily ?? ""}
          onChange={val => {
            if (!editor) return;
            val ? editor.chain().focus().setFontFamily(val).run()
                : editor.chain().focus().unsetFontFamily().run();
          }}
          options={[
            { value: "", label: "Serif" },
            { value: "'Instrument Serif',Georgia,serif", label: "Instrument", style: { fontFamily: "Georgia,serif" } },
            { value: "Georgia,serif",                   label: "Georgia",    style: { fontFamily: "Georgia,serif" } },
            { value: "'Times New Roman',serif",         label: "Times New Roman", style: { fontFamily: "'Times New Roman',serif" } },
            { value: "Arial,sans-serif",                label: "Arial",      style: { fontFamily: "Arial,sans-serif" } },
            { value: "system-ui,sans-serif",            label: "Sans-serif", style: { fontFamily: "system-ui,sans-serif" } },
            { value: "'Courier New',monospace",         label: "Courier New",style: { fontFamily: "'Courier New',monospace" } },
          ]}
        />
        {/* Font size */}
        <ToolSelect
          title="Velikost písma"
          width={72}
          value={editor?.getAttributes("textStyle").fontSize ?? ""}
          onChange={val => {
            if (!editor) return;
            if (val) {
              editor.chain().focus().setMark("textStyle", { fontSize: val }).run();
            } else {
              editor.chain().focus().setMark("textStyle", { fontSize: null }).run();
            }
          }}
          options={[
            { value: "",     label: "Norm." },
            { value: "12px", label: "12" },
            { value: "14px", label: "14" },
            { value: "16px", label: "16" },
            { value: "18px", label: "18" },
            { value: "22px", label: "22" },
            { value: "28px", label: "28" },
            { value: "36px", label: "36" },
          ]}
        />
        <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--muted-2)", fontFamily: "var(--f-mono)" }}>
          {charCount} znaků
        </span>
        <TDivider />
        <button
          type="button"
          title="AI Pomoc — vygeneruje inspiraci pro tvůj text"
          onMouseDown={e => { e.preventDefault(); setShowAiPanel(o => !o); }}
          style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            padding: "3px 10px", borderRadius: "var(--r-pill)",
            background: showAiPanel ? "var(--accent-tint)" : "var(--surface-2)",
            border: "1px solid",
            borderColor: showAiPanel ? "var(--accent-soft)" : "var(--hairline-2)",
            color: showAiPanel ? "var(--accent-deep)" : "var(--ink-2)",
            fontSize: 11.5, fontFamily: "var(--f-sans)", cursor: "pointer",
            fontWeight: 500, flexShrink: 0, height: 26, transition: "all .15s",
          }}
        >
          <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
            <path d="M12 4v4M12 16v4M4 12h4M16 12h4M6.5 6.5l2.8 2.8M14.7 14.7l2.8 2.8M17.5 6.5l-2.8 2.8M9.3 14.7L6.5 17.5"/>
          </svg>
          Nevím, jak začít
        </button>
      </div>

      {/* BubbleMenu — floating toolbar above selected image */}
      {editor && (
        <BubbleMenu
          editor={editor}
          shouldShow={({ editor: ed }) => ed.isActive("image")}
        >
          <div style={{
            display: "flex", alignItems: "center", gap: 2,
            background: "var(--ink)", borderRadius: 8, padding: "5px 8px",
            boxShadow: "var(--sh-3)",
          }}>
            {/* Alignment */}
            {[
              { v: "left",   icon: "←", title: "Vlevo" },
              { v: "center", icon: "⊞", title: "Na střed" },
              { v: "right",  icon: "→", title: "Vpravo" },
            ].map(a => (
              <button key={a.v} type="button" title={a.title}
                onMouseDown={e => { e.preventDefault(); setAlign(a.v); }}
                style={{
                  background: "transparent", border: "none", cursor: "pointer",
                  color: "var(--bg)", padding: "3px 8px", borderRadius: 4, fontSize: 14,
                  lineHeight: 1,
                }}
              >
                {a.icon}
              </button>
            ))}

            <div style={{ width: 1, background: "rgba(255,255,255,0.15)", height: 16, margin: "0 4px" }} />

            {/* Crop */}
            <button type="button" title="Ořezat obrázek"
              onMouseDown={e => { e.preventDefault(); openCrop(); }}
              style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--bg)", padding: "3px 8px", borderRadius: 4, fontSize: 11, fontFamily: "var(--f-mono)", letterSpacing: "0.04em", lineHeight: 1.4 }}>
              CROP
            </button>
          </div>
        </BubbleMenu>
      )}

      {/* AI Assist panel */}
      {showAiPanel && (
        <AiAssistPanel
          recipientName={recipientName}
          relationship={relationship}
          existingContent={content}
          onInsert={(html) => {
            if (editor) editor.commands.setContent(html);
            onChange(html);
          }}
          onClose={() => setShowAiPanel(false)}
        />
      )}

      {/* Crop overlay (portal-like, positioned fixed over selected image) */}
      {cropImg && (
        <CropOverlay
          imgEl={cropImg}
          userId={userId}
          packId={packId}
          onNewSrc={(url) => {
            if (!editor) return;
            editor.chain().focus().updateAttributes("image", { src: url }).run();
          }}
          onDone={() => setCropImg(null)}
          onCancel={() => setCropImg(null)}
        />
      )}

      {/* Editor */}
      <div ref={wrapRef} style={{ padding: "18px 22px" }}>
        <style>{`
          .arca-prose .tiptap { outline: none; min-height: ${minHeight}px; caret-color: var(--ink); }
          .arca-prose .tiptap p { font-family: var(--f-serif); font-size: 18px; line-height: 1.65; color: var(--ink); margin: 0 0 10px; }
          .arca-prose .tiptap p.is-editor-empty:first-child::before {
            content: attr(data-placeholder);
            float: left; color: var(--muted-2); pointer-events: none; height: 0;
            font-family: var(--f-serif); font-size: 18px; font-style: italic;
          }
          .arca-prose .tiptap strong { font-weight: 700; color: var(--ink); }
          .arca-prose .tiptap em { font-style: italic; }
          .arca-prose .tiptap blockquote { border-left: 3px solid var(--accent); margin: 14px 0; padding: 2px 0 2px 16px; color: var(--muted); font-style: italic; font-family: var(--f-serif); }
          .arca-prose .tiptap img {
            border-radius: 8px; max-width: 100%; cursor: pointer;
            box-shadow: 0 2px 8px rgba(28,26,22,0.12);
            transition: outline 0.1s;
            background: repeating-conic-gradient(#d0ccca 0% 25%, #f0ede9 0% 50%)
                        0 0 / 12px 12px;
          }
          .arca-prose .tiptap img.ProseMirror-selectednode { outline: 2px solid var(--accent); outline-offset: 2px; }
          .arca-prose .tiptap img[data-align="center"] { display: block; margin: 12px auto; }
          .arca-prose .tiptap img[data-align="right"]  { display: block; margin: 12px 0 12px auto; }
          .arca-prose .tiptap img[data-align="left"]   { display: block; margin: 12px 0; }
        `}</style>
        <div className="arca-prose">
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
}
