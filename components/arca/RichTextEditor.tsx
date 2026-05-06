"use client";

import { useRef, useCallback, useEffect } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import TiptapImage from "@tiptap/extension-image";
import { createClient } from "@/lib/supabase/client";
import EmojiPicker from "./EmojiPicker";
import GifPicker from "./GifPicker";

interface Props {
  content: string;
  onChange: (html: string) => void;
  packId: string;
  userId: string;
}

// ─── Image upload ─────────────────────────────────────────────────────────────

function sanitizeFilename(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9.\-_]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 100);
}

async function uploadInlineImage(
  file: File,
  userId: string,
  packId: string
): Promise<string | null> {
  if (!file.type.startsWith("image/")) return null;
  if (file.size > 10 * 1024 * 1024) return null; // 10 MB max for inline

  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return null;

  const timestamp = Date.now();
  const safeName = sanitizeFilename(file.name || "image.jpg");
  const path = `${userId}/inline/${packId}/${timestamp}_${safeName}`;

  const { error } = await supabase.storage.from("arca-media").upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) {
    console.error("[inline-upload]", error.message);
    return null;
  }

  // 10-year signed URL — inline images live with the text content
  const { data } = await supabase.storage
    .from("arca-media")
    .createSignedUrl(path, 60 * 60 * 24 * 365 * 10);

  return data?.signedUrl ?? null;
}

// ─── Toolbar helpers ──────────────────────────────────────────────────────────

function Btn({
  onClick,
  isActive = false,
  title,
  children,
}: {
  onClick: () => void;
  isActive?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
      className={[
        "flex items-center justify-center w-7 h-7 rounded text-xs transition-all duration-150 select-none",
        isActive
          ? "bg-white/15 text-zinc-100"
          : "text-zinc-500 hover:text-zinc-200 hover:bg-white/8",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function Sep() {
  return <div className="w-px h-4 bg-white/8 mx-0.5 shrink-0" />;
}

// ─── Toolbar ─────────────────────────────────────────────────────────────────

function Toolbar({
  editor,
  packId,
  userId,
}: {
  editor: Editor | null;
  packId: string;
  userId: string;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageFile = useCallback(
    async (file: File) => {
      if (!editor) return;
      const url = await uploadInlineImage(file, userId, packId);
      if (url) {
        editor.chain().focus().setImage({ src: url, alt: file.name }).run();
      }
    },
    [editor, userId, packId]
  );

  const handleImageUrl = () => {
    if (!editor) return;
    const url = window.prompt("Image or GIF URL:");
    if (url?.trim()) {
      editor.chain().focus().setImage({ src: url.trim() }).run();
    }
  };

  if (!editor) return null;

  return (
    <div className="flex items-center gap-0.5 flex-wrap pb-3 mb-4 border-b border-border/40">
      {/* Text formatting */}
      <Btn
        title="Bold"
        isActive={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <span className="font-bold">B</span>
      </Btn>

      <Btn
        title="Italic"
        isActive={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <span className="italic font-serif">I</span>
      </Btn>

      <Sep />

      <Btn
        title="Heading 1"
        isActive={editor.isActive("heading", { level: 1 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
      >
        <span className="font-semibold text-[10px]">H1</span>
      </Btn>

      <Btn
        title="Heading 2"
        isActive={editor.isActive("heading", { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        <span className="font-semibold text-[10px]">H2</span>
      </Btn>

      <Sep />

      <Btn
        title="Bullet list"
        isActive={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <span className="text-base leading-none">≡</span>
      </Btn>

      <Btn
        title="Ordered list"
        isActive={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <span className="text-[10px] font-mono">1.</span>
      </Btn>

      <Btn
        title="Blockquote"
        isActive={editor.isActive("blockquote")}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      >
        <span className="text-base leading-none">"</span>
      </Btn>

      <Sep />

      {/* ── Media insertions ───────────────────────────────────────── */}

      {/* Image from file */}
      <Btn
        title="Insert image from file"
        onClick={() => fileInputRef.current?.click()}
      >
        <span className="text-[11px]">🖼</span>
      </Btn>

      {/* Image from URL */}
      <Btn title="Insert image from URL" onClick={handleImageUrl}>
        <span className="text-[11px] font-mono leading-none">url</span>
      </Btn>

      {/* GIF picker */}
      <GifPicker
        onSelect={(url) => {
          editor.chain().focus().setImage({ src: url }).run();
        }}
      />

      {/* Emoji picker */}
      <EmojiPicker
        onSelect={(emoji) => {
          editor.chain().focus().insertContent(emoji).run();
        }}
      />

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (file) await handleImageFile(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}

// ─── Editor ──────────────────────────────────────────────────────────────────

export default function RichTextEditor({
  content,
  onChange,
  packId,
  userId,
}: Props) {
  const handleImageFile = useCallback(
    async (file: File, editorInstance: Editor) => {
      const url = await uploadInlineImage(file, userId, packId);
      if (url) {
        editorInstance
          .chain()
          .focus()
          .setImage({ src: url, alt: file.name })
          .run();
      }
    },
    [userId, packId]
  );

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: "Begin writing here…" }),
      TiptapImage.configure({
        inline: true,
        allowBase64: false,
        HTMLAttributes: {
          class: "rounded-xl max-w-full my-3 shadow-sm",
        },
      }),
    ],
    content,
    editorProps: {
      attributes: {
        class: [
          "outline-none min-h-[280px] cursor-text",
          "prose prose-invert prose-lg max-w-none",
          "prose-p:text-zinc-200 prose-p:font-light prose-p:leading-[1.85]",
          "prose-headings:font-serif prose-headings:text-zinc-100 prose-headings:font-normal",
          "prose-h1:text-3xl prose-h1:mb-4 prose-h1:mt-8",
          "prose-h2:text-xl prose-h2:mb-3 prose-h2:mt-6",
          "prose-strong:text-zinc-100 prose-strong:font-semibold",
          "prose-em:text-zinc-300 prose-em:font-serif",
          "prose-blockquote:border-l-white/20 prose-blockquote:text-zinc-400 prose-blockquote:italic",
          "prose-li:text-zinc-200 prose-li:font-light",
          "prose-ul:marker:text-zinc-600 prose-ol:marker:text-zinc-600",
          "prose-img:rounded-xl prose-img:shadow-sm",
        ].join(" "),
      },
      // Clipboard paste of images — handled via editorRef below
      // Drag-and-drop of images — handled via editorRef below
    },
    onUpdate: ({ editor: e }) => {
      onChange(e.getHTML());
    },
  });

  // Attach paste + drop handlers to the editor DOM element
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = editorRef.current;
    if (!el || !editor) return;

    const onPaste = async (e: ClipboardEvent) => {
      const items = Array.from(e.clipboardData?.items ?? []);
      const img = items.find((i) => i.type.startsWith("image/"));
      if (!img) return;
      const file = img.getAsFile();
      if (!file) return;
      e.preventDefault();
      await handleImageFile(file, editor);
    };

    const onDrop = async (e: DragEvent) => {
      const files = Array.from(e.dataTransfer?.files ?? []);
      const img = files.find((f) => f.type.startsWith("image/"));
      if (!img) return;
      e.preventDefault();
      await handleImageFile(img, editor);
    };

    el.addEventListener("paste", onPaste);
    el.addEventListener("drop", onDrop);
    return () => {
      el.removeEventListener("paste", onPaste);
      el.removeEventListener("drop", onDrop);
    };
  }, [editor, handleImageFile]);

  return (
    <div ref={editorRef} className="flex flex-col">
      <Toolbar editor={editor} packId={packId} userId={userId} />
      <EditorContent editor={editor} />
    </div>
  );
}
