"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, ChevronDown, ChevronUp, Calendar, Clock } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { createChapter, updateChapter, deleteChapter } from "@/app/actions/chapters";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ChapterData {
  id: string;
  title: string;
  content: string;
  order: number;
  unlockDate: Date | null;
  unlockDelayDays: number | null;
}

type UnlockMode = "immediate" | "date" | "delay";

function unlockModeOf(c: ChapterData): UnlockMode {
  if (c.unlockDate) return "date";
  if (c.unlockDelayDays) return "delay";
  return "immediate";
}

function unlockLabel(c: ChapterData): string {
  if (c.unlockDate) {
    return `On ${new Date(c.unlockDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`;
  }
  if (c.unlockDelayDays) {
    return `${c.unlockDelayDays} days after delivery`;
  }
  return "Immediately with main message";
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  packId: string;
  initialChapters: ChapterData[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ChapterSheet({
  packId,
  initialChapters,
  open,
  onOpenChange,
}: Props) {
  const router = useRouter();
  const [chapters, setChapters] = useState(initialChapters);
  const [addingNew, setAddingNew] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Sync when parent refreshes
  // (chapters come from initialChapters — router.refresh() re-renders parent)

  const handleCreated = (chapter: ChapterData) => {
    setChapters((prev) => [...prev, chapter].sort((a, b) => a.order - b.order));
    setAddingNew(false);
    router.refresh();
  };

  const handleUpdated = (updated: ChapterData) => {
    setChapters((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    setEditingId(null);
    router.refresh();
  };

  const handleDeleted = (id: string) => {
    setChapters((prev) => prev.filter((c) => c.id !== id));
    router.refresh();
  };

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="Chapters"
      description="Divide your Arca into chapters that unlock at different times."
    >
      <div className="space-y-3">
        {/* Existing chapters */}
        {chapters.map((chapter, i) =>
          editingId === chapter.id ? (
            <ChapterForm
              key={chapter.id}
              packId={packId}
              initial={chapter}
              nextOrder={i}
              onSave={handleUpdated}
              onCancel={() => setEditingId(null)}
            />
          ) : (
            <ChapterCard
              key={chapter.id}
              chapter={chapter}
              onEdit={() => setEditingId(chapter.id)}
              onDelete={() => handleDeleted(chapter.id)}
            />
          )
        )}

        {/* New chapter form or trigger */}
        {addingNew ? (
          <ChapterForm
            packId={packId}
            nextOrder={chapters.length}
            onSave={handleCreated}
            onCancel={() => setAddingNew(false)}
          />
        ) : (
          <button
            onClick={() => { setAddingNew(true); setEditingId(null); }}
            className="w-full flex items-center gap-2 rounded-xl border border-dashed border-border/50 px-4 py-3 text-sm text-muted-foreground hover:text-foreground hover:border-border transition-colors"
          >
            <Plus className="size-4" />
            Add chapter
          </button>
        )}

        {chapters.length === 0 && !addingNew && (
          <p className="text-xs text-muted-foreground/60 text-center py-4 italic">
            Chapters let you deliver your message in parts — each unlocking when you decide.
          </p>
        )}
      </div>
    </Sheet>
  );
}

// ─── Chapter card (view mode) ─────────────────────────────────────────────────

function ChapterCard({
  chapter,
  onEdit,
  onDelete,
}: {
  chapter: ChapterData;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    startTransition(async () => {
      await deleteChapter(chapter.id);
      onDelete();
    });
  };

  const unlockIcon =
    unlockModeOf(chapter) === "immediate" ? null :
    unlockModeOf(chapter) === "date" ? <Calendar className="size-3 shrink-0" /> :
    <Clock className="size-3 shrink-0" />;

  return (
    <div className={cn(
      "rounded-xl border border-border/40 bg-card/40 p-4 space-y-2 transition-opacity",
      isPending && "opacity-50"
    )}>
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-medium text-foreground leading-snug">{chapter.title}</h3>
        <div className="flex gap-1 shrink-0">
          <button
            onClick={onEdit}
            className="text-[11px] text-muted-foreground hover:text-foreground transition-colors px-2 py-0.5 rounded hover:bg-accent/50"
          >
            Edit
          </button>
          {confirmDelete ? (
            <>
              <button onClick={handleDelete} className="text-[11px] text-destructive hover:text-destructive/80 px-2 py-0.5 rounded hover:bg-destructive/10 transition-colors">
                Delete
              </button>
              <button onClick={() => setConfirmDelete(false)} className="text-[11px] text-muted-foreground hover:text-foreground px-2 py-0.5 rounded transition-colors">
                Cancel
              </button>
            </>
          ) : (
            <button onClick={() => setConfirmDelete(true)} className="text-muted-foreground/50 hover:text-destructive transition-colors p-0.5 rounded">
              <Trash2 className="size-3.5" />
            </button>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        {unlockIcon}
        {unlockLabel(chapter)}
      </div>
      {chapter.content && (
        <p className="text-[11px] text-muted-foreground/60 line-clamp-2 leading-relaxed">
          {chapter.content.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()}
        </p>
      )}
    </div>
  );
}

// ─── Chapter form (create / edit) ────────────────────────────────────────────

interface FormProps {
  packId: string;
  initial?: ChapterData;
  nextOrder: number;
  onSave: (chapter: ChapterData) => void;
  onCancel: () => void;
}

function ChapterForm({ packId, initial, nextOrder, onSave, onCancel }: FormProps) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [content, setContent] = useState(initial?.content ?? "");
  const [unlockMode, setUnlockMode] = useState<UnlockMode>(
    initial ? unlockModeOf(initial) : "immediate"
  );
  const [unlockDate, setUnlockDate] = useState(
    initial?.unlockDate
      ? new Date(initial.unlockDate).toISOString().split("T")[0]
      : ""
  );
  const [delayDays, setDelayDays] = useState(initial?.unlockDelayDays ?? 30);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];

  const handleSave = () => {
    if (!title.trim()) { setError("Title is required."); return; }
    setError(null);

    const data = {
      title: title.trim(),
      content,
      order: nextOrder,
      unlockDate: unlockMode === "date" ? unlockDate || null : null,
      unlockDelayDays: unlockMode === "delay" ? delayDays : null,
    };

    startTransition(async () => {
      if (initial) {
        await updateChapter(initial.id, data);
        onSave({ ...initial, ...data, unlockDate: data.unlockDate ? new Date(data.unlockDate) : null });
      } else {
        const result = await createChapter(packId, data);
        if ("error" in result) { setError(result.error); return; }
        onSave({
          id: result.id,
          ...data,
          unlockDate: data.unlockDate ? new Date(data.unlockDate) : null,
          unlockDelayDays: data.unlockDelayDays,
        });
      }
    });
  };

  return (
    <div className="rounded-xl border border-border/60 bg-card/50 p-4 space-y-4">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        {initial ? "Edit chapter" : "New chapter"}
      </p>

      {/* Title */}
      <Field label="Chapter title">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. A letter for your wedding day"
          className="input-base"
          autoFocus
        />
      </Field>

      {/* Unlock condition */}
      <Field label="When does this unlock?">
        <div className="space-y-2">
          {(["immediate", "date", "delay"] as UnlockMode[]).map((m) => (
            <label key={m} className="flex items-center gap-2.5 cursor-pointer group">
              <div className={cn(
                "size-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors",
                unlockMode === m ? "border-foreground" : "border-border group-hover:border-muted-foreground"
              )}>
                {unlockMode === m && <div className="size-2 rounded-full bg-foreground" />}
              </div>
              <input
                type="radio"
                className="sr-only"
                checked={unlockMode === m}
                onChange={() => setUnlockMode(m)}
              />
              <span className="text-xs text-foreground/80">
                {m === "immediate" && "Immediately with the main message"}
                {m === "date" && "On a specific date"}
                {m === "delay" && `After a delay`}
              </span>
            </label>
          ))}

          {unlockMode === "date" && (
            <input
              type="date"
              min={tomorrow}
              value={unlockDate}
              onChange={(e) => setUnlockDate(e.target.value)}
              className="input-base mt-1 [color-scheme:dark]"
            />
          )}

          {unlockMode === "delay" && (
            <div className="flex items-center gap-2 mt-1">
              <input
                type="number"
                min={1}
                max={3650}
                value={delayDays}
                onChange={(e) => setDelayDays(Number(e.target.value))}
                className="input-base w-20 text-center"
              />
              <span className="text-xs text-muted-foreground">days after the main Arca is delivered</span>
            </div>
          )}
        </div>
      </Field>

      {/* Content */}
      <Field label="Message (optional)">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write the content of this chapter…"
          rows={5}
          className="input-base resize-none font-light leading-relaxed"
        />
      </Field>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={handleSave}
          disabled={isPending}
          className="rounded-lg bg-foreground text-background px-4 py-2 text-xs font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {isPending ? "Saving…" : initial ? "Update chapter" : "Add chapter"}
        </button>
        <button
          onClick={onCancel}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}
