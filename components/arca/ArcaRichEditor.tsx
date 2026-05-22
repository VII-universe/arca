"use client";

import { useRef, useCallback, useEffect, useState } from "react";
import { useEditor, EditorContent, ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import TiptapImage from "@tiptap/extension-image";
import { createClient } from "@/lib/supabase/client";
import type { NodeViewProps } from "@tiptap/react";

// ── Upload helper (reused from RichTextEditor) ────────────────────────────────

async function uploadInlineImage(file: File, userId?: string, packId?: string): Promise<string | null> {
  if (!file.type.startsWith("image/")) return null;
  if (file.size > 10 * 1024 * 1024) return null;
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;
  const ts = Date.now();
  const safe = file.name.toLowerCase().replace(/[^a-z0-9.\-_]/g, "_").slice(0, 80);
  const path = userId && packId
    ? `${userId}/inline/${packId}/${ts}_${safe}`
    : `anonymous/${ts}_${safe}`;
  const { error } = await supabase.storage.from("arca-media").upload(path, file, { contentType: file.type, upsert: false });
  if (error) return null;
  const { data } = await supabase.storage.from("arca-media").createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
  return data?.signedUrl ?? null;
}

// ── Crop helper via canvas ────────────────────────────────────────────────────

async function cropImageToBlob(
  src: string,
  cropX: number, cropY: number,
  cropW: number, cropH: number,
  natW: number, natH: number,
  displayW: number, displayH: number
): Promise<Blob | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const scaleX = img.naturalWidth / displayW;
      const scaleY = img.naturalHeight / displayH;
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(cropW * scaleX);
      canvas.height = Math.round(cropH * scaleY);
      const ctx = canvas.getContext("2d");
      if (!ctx) { resolve(null); return; }
      ctx.drawImage(img, cropX * scaleX, cropY * scaleY, cropW * scaleX, cropH * scaleY, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((b) => resolve(b), "image/jpeg", 0.92);
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

// ── Resizable Image NodeView ──────────────────────────────────────────────────

function ImageNode({ node, updateAttributes, selected }: NodeViewProps) {
  const { src, alt, width, align } = node.attrs as { src: string; alt?: string; width?: number; align?: string };
  const imgRef = useRef<HTMLImageElement>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [showCrop, setShowCrop] = useState(false);
  const [cropRect, setCropRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const cropStart = useRef<{ x: number; y: number } | null>(null);
  const cropOverlayRef = useRef<HTMLDivElement>(null);

  // ── Resize via corner drag ──────────────────────────────────────────────
  const startResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startW = imgRef.current?.getBoundingClientRect().width ?? (width ?? 300);

    const onMove = (ev: MouseEvent) => {
      const newW = Math.max(60, Math.round(startW + (ev.clientX - startX)));
      updateAttributes({ width: newW });
    };
    const onUp = () => {
      setIsResizing(false);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    setIsResizing(true);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [width, updateAttributes]);

  // ── Crop drag on overlay ────────────────────────────────────────────────
  const startCropDrag = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = cropOverlayRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    cropStart.current = { x, y };
    setCropRect({ x, y, w: 0, h: 0 });

    const onMove = (ev: MouseEvent) => {
      if (!cropStart.current) return;
      const cx = ev.clientX - rect.left;
      const cy = ev.clientY - rect.top;
      setCropRect({
        x: Math.min(cropStart.current.x, cx),
        y: Math.min(cropStart.current.y, cy),
        w: Math.abs(cx - cropStart.current.x),
        h: Math.abs(cy - cropStart.current.y),
      });
    };
    const onUp = () => {
      cropStart.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, []);

  const applyCrop = useCallback(async () => {
    if (!cropRect || !imgRef.current) return;
    const displayRect = imgRef.current.getBoundingClientRect();
    const blob = await cropImageToBlob(
      src, cropRect.x, cropRect.y, cropRect.w, cropRect.h,
      imgRef.current.naturalWidth, imgRef.current.naturalHeight,
      displayRect.width, displayRect.height
    );
    if (!blob) return;
    const file = new File([blob], "cropped.jpg", { type: "image/jpeg" });
    const url = await uploadInlineImage(file);
    if (url) {
      updateAttributes({ src: url, width: Math.round(cropRect.w) });
    }
    setShowCrop(false);
    setCropRect(null);
  }, [cropRect, src, updateAttributes]);

  const alignStyle = align === "center" ? { margin: "12px auto" }
    : align === "right" ? { margin: "12px 0 12px auto" }
    : { margin: "12px 0" };

  return (
    <NodeViewWrapper style={{ display: "inline-block", position: "relative", maxWidth: "100%" }}>
      <div style={{ position: "relative", display: "inline-block" }}>
        <img
          ref={imgRef}
          src={src}
          alt={alt ?? ""}
          draggable={false}
          style={{
            width: width ? `${width}px` : "100%",
            maxWidth: "100%",
            height: "auto",
            borderRadius: 8,
            display: "block",
            userSelect: "none",
            outline: selected ? "2px solid var(--accent)" : "none",
            outlineOffset: 2,
            ...alignStyle,
          }}
        />

        {/* ── Controls when selected ─────────────────────────────── */}
        {selected && !showCrop && (
          <>
            {/* Alignment + crop toolbar above image */}
            <div style={{
              position: "absolute", top: -38, left: "50%", transform: "translateX(-50%)",
              display: "flex", gap: 4, background: "var(--ink)", borderRadius: 8,
              padding: "4px 6px", boxShadow: "var(--sh-2)", zIndex: 10, whiteSpace: "nowrap",
            }}>
              {[
                { v: "left",   label: "←" },
                { v: "center", label: "⊞" },
                { v: "right",  label: "→" },
              ].map(a => (
                <button key={a.v} type="button" onMouseDown={e => { e.preventDefault(); updateAttributes({ align: a.v }); }}
                  style={{ background: align === a.v ? "rgba(255,255,255,0.2)" : "transparent", border: "none", cursor: "pointer", color: "var(--bg)", borderRadius: 4, padding: "2px 7px", fontSize: 13, lineHeight: 1.4 }}>
                  {a.label}
                </button>
              ))}
              <div style={{ width: 1, background: "rgba(255,255,255,0.15)", margin: "2px 2px" }} />
              <button type="button" onMouseDown={e => { e.preventDefault(); setShowCrop(true); }}
                style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--bg)", borderRadius: 4, padding: "2px 7px", fontSize: 11, fontFamily: "var(--f-mono)", letterSpacing: "0.03em" }}>
                CROP
              </button>
            </div>

            {/* Corner resize handle */}
            <div
              onMouseDown={startResize}
              style={{
                position: "absolute", right: -5, bottom: -5,
                width: 14, height: 14, background: "var(--accent)", borderRadius: 3,
                cursor: "se-resize", zIndex: 10,
                boxShadow: "0 0 0 2px var(--surface)",
              }}
            />
            {/* Right-edge resize handle */}
            <div
              onMouseDown={startResize}
              style={{
                position: "absolute", right: -5, top: "50%", transform: "translateY(-50%)",
                width: 10, height: 24, background: "var(--accent)", borderRadius: 3,
                cursor: "e-resize", zIndex: 10, opacity: 0.7,
                boxShadow: "0 0 0 2px var(--surface)",
              }}
            />
          </>
        )}

        {/* ── Crop overlay ───────────────────────────────────────── */}
        {showCrop && (
          <div
            ref={cropOverlayRef}
            onMouseDown={startCropDrag}
            style={{
              position: "absolute", inset: 0,
              cursor: "crosshair", zIndex: 20,
              background: "rgba(0,0,0,0.45)",
              borderRadius: 8,
              userSelect: "none",
            }}
          >
            {cropRect && cropRect.w > 4 && cropRect.h > 4 && (
              <div style={{
                position: "absolute",
                left: cropRect.x, top: cropRect.y,
                width: cropRect.w, height: cropRect.h,
                border: "2px dashed rgba(255,255,255,0.9)",
                background: "rgba(255,255,255,0.08)",
              }} />
            )}
            {/* Crop action buttons */}
            <div style={{ position: "absolute", bottom: 8, right: 8, display: "flex", gap: 6 }}>
              <button type="button" onClick={applyCrop} disabled={!cropRect || cropRect.w < 10}
                style={{ background: "var(--accent)", color: "#fff", border: "none", borderRadius: 6, padding: "5px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "var(--f-sans)" }}>
                Použít
              </button>
              <button type="button" onClick={() => { setShowCrop(false); setCropRect(null); }}
                style={{ background: "rgba(255,255,255,0.15)", color: "#fff", border: "none", borderRadius: 6, padding: "5px 10px", fontSize: 12, cursor: "pointer", fontFamily: "var(--f-sans)" }}>
                Zrušit
              </button>
            </div>
            <div style={{ position: "absolute", top: 8, left: "50%", transform: "translateX(-50%)", background: "rgba(0,0,0,0.7)", color: "#fff", fontSize: 11, borderRadius: 4, padding: "3px 8px", fontFamily: "var(--f-mono)", whiteSpace: "nowrap" }}>
              Přetáhni pro výběr oblasti
            </div>
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
}

// ── Extended Image extension with extra attrs ─────────────────────────────────

const ResizableImage = TiptapImage.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: { default: null, parseHTML: el => el.getAttribute("width"), renderHTML: attrs => attrs.width ? { width: attrs.width, style: `width:${attrs.width}px` } : {} },
      align: { default: "left", parseHTML: el => el.getAttribute("data-align") ?? "left", renderHTML: attrs => ({ "data-align": attrs.align }) },
    };
  },
  addNodeView() {
    return ReactNodeViewRenderer(ImageNode);
  },
});

// ── Toolbar ───────────────────────────────────────────────────────────────────

function ToolBtn({ onClick, title, children, active }: { onClick: () => void; title: string; children: React.ReactNode; active?: boolean }) {
  return (
    <button type="button" title={title} onMouseDown={e => { e.preventDefault(); onClick(); }}
      style={{
        width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center",
        borderRadius: 6, border: "none", cursor: "pointer", fontFamily: "inherit",
        background: active ? "var(--hover-strong)" : "transparent",
        color: active ? "var(--ink)" : "var(--muted)",
        transition: "background 0.15s, color 0.15s",
        fontSize: 13,
      }}
      onMouseEnter={e => { if (!active) (e.target as HTMLElement).style.background = "var(--hover)"; (e.target as HTMLElement).style.color = "var(--ink)"; }}
      onMouseLeave={e => { if (!active) (e.target as HTMLElement).style.background = "transparent"; (e.target as HTMLElement).style.color = "var(--muted)"; }}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div style={{ width: 1, height: 16, background: "var(--hairline-2)", margin: "0 3px" }} />;
}

// ── Main editor component ─────────────────────────────────────────────────────

interface ArcaRichEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  packId?: string;
  userId?: string;
  minHeight?: number;
}

export default function ArcaRichEditor({
  content,
  onChange,
  placeholder = "Začni psát…",
  packId,
  userId,
  minHeight = 260,
}: ArcaRichEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder }),
      ResizableImage.configure({ inline: false, allowBase64: false }),
    ],
    content,
    onUpdate: ({ editor: e }) => onChange(e.getHTML()),
  });

  const insertImage = useCallback(async (file: File) => {
    if (!editor) return;
    const url = await uploadInlineImage(file, userId, packId);
    if (url) editor.chain().focus().setImage({ src: url, alt: file.name }).run();
  }, [editor, userId, packId]);

  const insertImageUrl = useCallback(() => {
    const url = window.prompt("URL obrázku:");
    if (url && editor) editor.chain().focus().setImage({ src: url }).run();
  }, [editor]);

  // Paste & drop
  const editorWrapRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = editorWrapRef.current;
    if (!el || !editor) return;
    const onPaste = async (e: ClipboardEvent) => {
      const img = Array.from(e.clipboardData?.items ?? []).find(i => i.type.startsWith("image/"));
      if (!img) return;
      const file = img.getAsFile();
      if (!file) return;
      e.preventDefault();
      await insertImage(file);
    };
    const onDrop = async (e: DragEvent) => {
      const img = Array.from(e.dataTransfer?.files ?? []).find(f => f.type.startsWith("image/"));
      if (!img) return;
      e.preventDefault();
      await insertImage(img);
    };
    el.addEventListener("paste", onPaste);
    el.addEventListener("drop", onDrop);
    return () => { el.removeEventListener("paste", onPaste); el.removeEventListener("drop", onDrop); };
  }, [editor, insertImage]);

  const charCount = editor?.getText().length ?? 0;

  return (
    <div className="arca-card" style={{ padding: 0, overflow: "hidden" }}>
      {/* Toolbar */}
      <div style={{
        padding: "8px 12px",
        borderBottom: "1px solid var(--hairline)",
        display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap",
        background: "var(--bg-tint)",
      }}>
        <ToolBtn title="Tučné" onClick={() => editor?.chain().focus().toggleBold().run()} active={editor?.isActive("bold")}>
          <strong style={{ fontFamily: "var(--f-serif)", fontSize: 14 }}>B</strong>
        </ToolBtn>
        <ToolBtn title="Kurzíva" onClick={() => editor?.chain().focus().toggleItalic().run()} active={editor?.isActive("italic")}>
          <em style={{ fontFamily: "var(--f-serif)", fontSize: 14 }}>I</em>
        </ToolBtn>
        <ToolBtn title="Citát" onClick={() => editor?.chain().focus().toggleBlockquote().run()} active={editor?.isActive("blockquote")}>
          <span style={{ fontSize: 16 }}>"</span>
        </ToolBtn>

        <Divider />

        {/* Image from file */}
        <ToolBtn title="Vložit obrázek ze souboru" onClick={() => fileInputRef.current?.click()}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round"><rect x="3.5" y="5" width="17" height="14" rx="2"/><circle cx="9" cy="10.5" r="1.5"/><path d="M4 17l5-4 4 3 3-2 4 3"/></svg>
        </ToolBtn>

        {/* Image from URL */}
        <ToolBtn title="Vložit obrázek z URL" onClick={insertImageUrl}>
          <span style={{ fontSize: 10, fontFamily: "var(--f-mono)", letterSpacing: "0.02em" }}>url</span>
        </ToolBtn>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={async e => {
            const f = e.target.files?.[0];
            if (f) await insertImage(f);
            e.target.value = "";
          }}
        />

        <Divider />

        <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--muted-2)", fontFamily: "var(--f-mono)" }}>
          {charCount} znaků
        </span>
      </div>

      {/* Editor content */}
      <div ref={editorWrapRef} style={{ padding: "18px 22px" }}>
        <style>{`
          .arca-prose .tiptap { outline: none; min-height: ${minHeight}px; }
          .arca-prose p { font-family: var(--f-serif); font-size: 18px; line-height: 1.6; color: var(--ink); margin: 0 0 12px; }
          .arca-prose strong { font-weight: 700; color: var(--ink); }
          .arca-prose em { font-style: italic; color: var(--ink-2); }
          .arca-prose blockquote { border-left: 3px solid var(--accent); margin: 16px 0; padding: 4px 0 4px 16px; color: var(--muted); font-style: italic; font-family: var(--f-serif); }
          .arca-prose img { border-radius: 8px; max-width: 100%; }
          .arca-prose .tiptap p.is-editor-empty:first-child::before {
            content: attr(data-placeholder);
            float: left; color: var(--muted-2); pointer-events: none; height: 0;
            font-family: var(--f-serif); font-size: 18px;
          }
        `}</style>
        <div className="arca-prose">
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
}
