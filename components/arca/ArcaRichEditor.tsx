"use client";

import { useRef, useCallback, useEffect, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import TiptapImage from "@tiptap/extension-image";
import { createClient } from "@/lib/supabase/client";

// ── Upload helper ─────────────────────────────────────────────────────────────

async function uploadInlineImage(file: File, userId?: string, packId?: string): Promise<string | null> {
  if (!file.type.startsWith("image/")) return null;
  if (file.size > 10 * 1024 * 1024) return null;
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;
  const ts = Date.now();
  const safe = (file.name || "image.jpg").toLowerCase().replace(/[^a-z0-9.\-_]/g, "_").slice(0, 80);
  const path = userId && packId
    ? `${userId}/inline/${packId}/${ts}_${safe}`
    : `inline/${ts}_${safe}`;
  const { error } = await supabase.storage.from("arca-media").upload(path, file, { contentType: file.type, upsert: false });
  if (error) { console.error("[upload]", error.message); return null; }
  const { data } = await supabase.storage.from("arca-media").createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
  return data?.signedUrl ?? null;
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
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(async (blob) => {
        if (!blob) { resolve(null); return; }
        const file = new File([blob], "cropped.jpg", { type: "image/jpeg" });
        const url = await uploadInlineImage(file, userId, packId);
        resolve(url);
      }, "image/jpeg", 0.92);
    };
    img.onerror = () => resolve(null);
    // No crossOrigin — signed URLs don't need it for canvas in same-origin context
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

// ── Main component ────────────────────────────────────────────────────────────

interface ArcaRichEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  packId?: string;
  userId?: string;
  minHeight?: number;
}

export default function ArcaRichEditor({
  content, onChange,
  placeholder = "Začni psát…",
  packId, userId,
  minHeight = 260,
}: ArcaRichEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cropImg, setCropImg] = useState<HTMLImageElement | null>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder }),
      ImageWithAttrs.configure({ inline: true, allowBase64: false }),
    ],
    content,
    onUpdate: ({ editor: e }) => onChange(e.getHTML()),
  });

  const insertImage = useCallback(async (file: File) => {
    if (!editor) return;
    const url = await uploadInlineImage(file, userId, packId);
    if (url) {
      editor.chain().focus().setImage({ src: url, alt: file.name }).run();
    }
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
        <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--muted-2)", fontFamily: "var(--f-mono)" }}>
          {charCount} znaků
        </span>
      </div>

      {/* BubbleMenu — floating toolbar above selected image */}
      {editor && (
        <BubbleMenu
          editor={editor}
          shouldShow={({ editor: ed }) => ed.isActive("image")}
        >
          <div style={{
            display: "flex", alignItems: "center", gap: 3,
            background: "var(--ink)", borderRadius: 8, padding: "5px 8px",
            boxShadow: "var(--sh-3)",
          }}>
            {/* Resize */}
            <button type="button" onMouseDown={e => { e.preventDefault(); setWidth(-20); }}
              style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--bg)", padding: "2px 7px", borderRadius: 4, fontSize: 16, lineHeight: 1 }}>−</button>
            <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 10, fontFamily: "var(--f-mono)", padding: "0 3px" }}>vel.</span>
            <button type="button" onMouseDown={e => { e.preventDefault(); setWidth(20); }}
              style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--bg)", padding: "2px 7px", borderRadius: 4, fontSize: 16, lineHeight: 1 }}>+</button>

            <div style={{ width: 1, background: "rgba(255,255,255,0.15)", height: 16, margin: "0 3px" }} />

            {/* Alignment */}
            {[
              { v: "left",   icon: "←" },
              { v: "center", icon: "⊞" },
              { v: "right",  icon: "→" },
            ].map(a => (
              <button key={a.v} type="button"
                onMouseDown={e => { e.preventDefault(); setAlign(a.v); }}
                style={{
                  background: "transparent", border: "none", cursor: "pointer",
                  color: "var(--bg)", padding: "2px 7px", borderRadius: 4, fontSize: 14,
                  lineHeight: 1, opacity: 0.8,
                }}
              >
                {a.icon}
              </button>
            ))}

            <div style={{ width: 1, background: "rgba(255,255,255,0.15)", height: 16, margin: "0 3px" }} />

            {/* Crop */}
            <button type="button" onMouseDown={e => { e.preventDefault(); openCrop(); }}
              style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--bg)", padding: "2px 8px", borderRadius: 4, fontSize: 11, fontFamily: "var(--f-mono)", letterSpacing: "0.04em", lineHeight: 1.4 }}>
              CROP
            </button>
          </div>
        </BubbleMenu>
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
