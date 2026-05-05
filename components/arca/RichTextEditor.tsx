"use client";

import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";

interface Props {
  content: string;
  onChange: (html: string) => void;
}

// ── Toolbar ───────────────────────────────────────────────────────────────────

function ToolbarButton({
  onClick,
  isActive,
  children,
  title,
}: {
  onClick: () => void;
  isActive: boolean;
  children: React.ReactNode;
  title: string;
}) {
  return (
    <button
      type="button"
      title={title}
      // onMouseDown keeps editor focus; onClick would blur the editor first
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
      className={[
        "flex items-center justify-center w-7 h-7 rounded text-xs transition-all duration-150 select-none",
        isActive
          ? "bg-white/15 text-zinc-100"
          : "text-zinc-600 hover:text-zinc-200 hover:bg-white/8",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className="w-px h-4 bg-white/8 mx-1 shrink-0" />;
}

function Toolbar({ editor }: { editor: Editor | null }) {
  if (!editor) return null;

  return (
    <div className="flex items-center gap-0.5 pb-4 mb-2 border-b border-white/[0.06]">
      <ToolbarButton
        title="Bold"
        isActive={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <span className="font-bold">B</span>
      </ToolbarButton>

      <ToolbarButton
        title="Italic"
        isActive={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <span className="italic font-serif">I</span>
      </ToolbarButton>

      <Divider />

      <ToolbarButton
        title="Heading 1"
        isActive={editor.isActive("heading", { level: 1 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
      >
        <span className="font-semibold text-[10px] tracking-tight">H1</span>
      </ToolbarButton>

      <ToolbarButton
        title="Heading 2"
        isActive={editor.isActive("heading", { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        <span className="font-semibold text-[10px] tracking-tight">H2</span>
      </ToolbarButton>

      <Divider />

      <ToolbarButton
        title="Bullet list"
        isActive={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <span className="text-base leading-none">≡</span>
      </ToolbarButton>

      <ToolbarButton
        title="Ordered list"
        isActive={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <span className="text-[10px] font-mono tracking-tighter">1.</span>
      </ToolbarButton>

      <Divider />

      <ToolbarButton
        title="Blockquote"
        isActive={editor.isActive("blockquote")}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      >
        <span className="text-base leading-none">"</span>
      </ToolbarButton>
    </div>
  );
}

// ── Editor ────────────────────────────────────────────────────────────────────

export default function RichTextEditor({ content, onChange }: Props) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: "Begin writing here…",
      }),
    ],
    content,
    editorProps: {
      attributes: {
        class: [
          "outline-none min-h-[280px] cursor-text",
          "prose prose-invert prose-lg max-w-none",
          // Typography refinements
          "prose-p:text-zinc-200 prose-p:font-light prose-p:leading-[1.85]",
          "prose-headings:font-serif prose-headings:text-zinc-100 prose-headings:font-normal",
          "prose-h1:text-3xl prose-h1:mb-4 prose-h1:mt-8",
          "prose-h2:text-xl prose-h2:mb-3 prose-h2:mt-6",
          "prose-strong:text-zinc-100 prose-strong:font-semibold",
          "prose-em:text-zinc-300 prose-em:font-serif",
          "prose-blockquote:border-l-white/20 prose-blockquote:text-zinc-400 prose-blockquote:italic",
          "prose-li:text-zinc-200 prose-li:font-light",
          "prose-ul:marker:text-zinc-600 prose-ol:marker:text-zinc-600",
        ].join(" "),
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  return (
    <div className="flex flex-col">
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}
