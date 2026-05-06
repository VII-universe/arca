"use client";

import { useState, useRef, useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Users,
  Clock,
  Paperclip,
  ChevronRight,
  Sparkles,
  ChevronDown,
  BookOpen,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import ContentEditor from "./ContentEditor";
import ArcaPrompts from "./ArcaPrompts";
import ActivatePanel from "./ActivatePanel";
import RecipientSheet from "./sheets/RecipientSheet";
import TriggerSheet from "./sheets/TriggerSheet";
import MediaSheet from "./sheets/MediaSheet";
import ChapterSheet, { type ChapterData } from "./sheets/ChapterSheet";
import { updatePackTitle } from "@/app/actions/arca";
import { useUpgradeModal } from "@/components/billing/UpgradeModal";
import type { RecipientData } from "./RecipientManager";
import type { TriggerData } from "./TriggerSettings";
import type { MediaItem } from "./MediaGalleryClient";

// ─── Props ────────────────────────────────────────────────────────────────────

export interface ArcaEditorProps {
  packId: string;
  userId: string;
  isPro: boolean;
  initialChapters: ChapterData[];
  packType: "EMOTIONAL" | "PRACTICAL";
  packStatus: string;
  initialTitle: string;
  initialContent: string;
  initialRecipients: RecipientData[];
  initialTrigger: TriggerData | null;
  initialMediaItems: MediaItem[];
  initialCategoryId: string | null;
  categories: { id: string; name: string; color: string | null }[];
}

function chapterSummary(chapters: ChapterData[]) {
  if (chapters.length === 0)
    return { title: "No chapters", sub: "Add parts that unlock over time" };
  return {
    title: `${chapters.length} chapter${chapters.length > 1 ? "s" : ""}`,
    sub: chapters.some((c) => c.unlockDelayDays || c.unlockDate)
      ? "Some chapters have delayed delivery"
      : "All unlock immediately",
  };
}

// ─── Summary helpers ──────────────────────────────────────────────────────────

function recipientSummary(r: RecipientData[]) {
  if (r.length === 0)
    return { title: "No recipients yet", sub: "Add who should receive this" };
  const names = r.map((x) => x.name).slice(0, 2).join(", ");
  const extra = r.length > 2 ? ` +${r.length - 2}` : "";
  return {
    title: `${r.length} recipient${r.length > 1 ? "s" : ""}`,
    sub: names + extra,
  };
}

function triggerSummary(t: TriggerData | null) {
  if (!t) return { title: "No trigger set", sub: "Set when this is delivered" };
  if (t.type === "SPECIFIC_DATE" && t.executeAtDate) {
    const d = new Date(t.executeAtDate);
    return {
      title: `Delivers ${d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`,
      sub: `${t.gracePeriodDays}-day grace period`,
    };
  }
  if (t.type === "INACTIVITY" && t.inactivityDaysLimit) {
    return {
      title: `After ${t.inactivityDaysLimit} days of silence`,
      sub: `${t.gracePeriodDays}-day grace period`,
    };
  }
  return { title: "Trigger configured", sub: "Click to review" };
}

function mediaSummary(items: MediaItem[]) {
  if (items.length === 0)
    return { title: "No media attached", sub: "Add photos, audio, video, docs" };
  const v = items.filter((i) => i.type === "VIDEO").length;
  const a = items.filter((i) => i.type === "AUDIO").length;
  const f = items.filter((i) => i.type === "FILE").length;
  const parts = [
    v && `${v} video${v > 1 ? "s" : ""}`,
    a && `${a} audio`,
    f && `${f} file${f > 1 ? "s" : ""}`,
  ].filter(Boolean);
  return {
    title: `${items.length} file${items.length > 1 ? "s" : ""} attached`,
    sub: parts.join(", "),
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ArcaEditor({
  packId,
  userId,
  isPro,
  packType,
  packStatus,
  initialTitle,
  initialContent,
  initialRecipients,
  initialTrigger,
  initialMediaItems,
  initialChapters,
  initialCategoryId,
  categories,
}: ArcaEditorProps) {
  const router = useRouter();
  const { open: openUpgrade } = useUpgradeModal();

  // ── Category ─────────────────────────────────────────────────────────────────
  const [categoryId, setCategoryId] = useState<string | null>(initialCategoryId);
  const [, startCatSave] = useTransition();

  function handleCategoryChange(val: string) {
    const next = val === "__none__" ? null : val;
    setCategoryId(next);
    startCatSave(async () => {
      const { assignCategory } = await import("@/app/actions/categories");
      await assignCategory(packId, next);
    });
  }

  // ── Sheets ──────────────────────────────────────────────────────────────────
  const [recipientOpen, setRecipientOpen] = useState(false);
  const [triggerOpen, setTriggerOpen] = useState(false);
  const [mediaOpen, setMediaOpen] = useState(false);
  const [chapterOpen, setChapterOpen] = useState(false);
  const [promptsOpen, setPromptsOpen] = useState(false);

  // ── Title auto-save ─────────────────────────────────────────────────────────
  const [title, setTitle] = useState(initialTitle);
  const [titleSaved, setTitleSaved] = useState(false);
  const [, startSave] = useTransition();
  const titleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setTitle(v);
    setTitleSaved(false);
    if (titleTimer.current) clearTimeout(titleTimer.current);
    titleTimer.current = setTimeout(() => {
      if (!v.trim()) return;
      startSave(async () => {
        await updatePackTitle(packId, v);
        setTitleSaved(true);
        setTimeout(() => setTitleSaved(false), 2000);
      });
    }, 1200);
  };

  // ── Refresh on sheet close ───────────────────────────────────────────────────
  const closeAndRefresh = useCallback(
    (setter: (v: boolean) => void) => (open: boolean) => {
      setter(open);
      if (!open) router.refresh();
    },
    [router]
  );

  // ── Derived ──────────────────────────────────────────────────────────────────
  const rs = recipientSummary(initialRecipients);
  const ts = triggerSummary(initialTrigger);
  const ms = mediaSummary(initialMediaItems);
  const cs = chapterSummary(initialChapters);

  const typeAccent = packType === "EMOTIONAL" ? "text-rose-400" : "text-blue-400";
  const typeIcon = packType === "EMOTIONAL" ? "✦" : "⬡";

  return (
    <>
      <div className="flex h-screen flex-col bg-background overflow-hidden">
        {/* ── Minimal header ───────────────────────────────────────────── */}
        <header className="shrink-0 h-11 flex items-center justify-between px-4 border-b border-border/20">
          <Link
            href="/dashboard"
            className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors"
          >
            ← Dashboard
          </Link>
          <div className="flex items-center gap-2">
            {titleSaved && (
              <span className="text-[11px] text-emerald-600">Saved</span>
            )}
            <span className={`text-xs font-medium ${typeAccent}`}>
              {typeIcon}{" "}
              {packType === "EMOTIONAL" ? "Emotional" : "Practical"}
            </span>
            {packStatus !== "DRAFT" && (
              <span className="text-[10px] uppercase tracking-widest text-emerald-500 font-semibold">
                · Active
              </span>
            )}
          </div>
        </header>

        {/* ── Two-column body ──────────────────────────────────────────── */}
        <div className="flex flex-1 overflow-hidden">

          {/* ── Writing canvas ──────────────────────────────────────────── */}
          <main className="flex-1 overflow-y-auto">
            <div className="mx-auto max-w-[680px] px-8 py-12 md:px-12 md:py-16">

              {/* Notion-style H1 title */}
              <input
                type="text"
                value={title}
                onChange={handleTitleChange}
                placeholder="Untitled"
                className={[
                  "w-full bg-transparent outline-none",
                  "font-serif text-4xl md:text-[2.75rem] font-normal leading-tight",
                  "text-foreground placeholder:text-muted-foreground/20",
                  "mb-7",
                ].join(" ")}
              />

              {/* TipTap editor — borderless, full-bleed writing surface */}
              <ContentEditor packId={packId} userId={userId} initialContent={initialContent} />
            </div>
          </main>

          {/* ── Settings sidebar ─────────────────────────────────────────── */}
          <aside className="hidden md:flex flex-col w-[260px] xl:w-[280px] shrink-0 border-l border-border/20 overflow-y-auto bg-muted/[0.02]">
            <div className="px-4 py-6 space-y-2">

              {/* Writing prompts toggle */}
              <button
                onClick={() => setPromptsOpen((o) => !o)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs text-muted-foreground/60 hover:text-muted-foreground hover:bg-accent/40 transition-colors"
              >
                <span className="flex items-center gap-1.5">
                  <Sparkles className="size-3.5" />
                  Writing prompts
                </span>
                <ChevronDown
                  className={cn(
                    "size-3.5 transition-transform duration-200",
                    promptsOpen && "rotate-180"
                  )}
                />
              </button>

              {promptsOpen && (
                <div className="px-1 pb-2">
                  <ArcaPrompts packType={packType} />
                </div>
              )}

              {/* Divider */}
              <div className="h-px bg-border/30 mx-1 my-3" />
              <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/30 px-3 pb-1">
                Settings
              </p>

              {/* Recipient card */}
              <SummaryCard
                icon={<Users className="size-3.5" />}
                title={rs.title}
                subtitle={rs.sub}
                filled={initialRecipients.length > 0}
                onClick={() => setRecipientOpen(true)}
              />

              {/* Trigger card */}
              <SummaryCard
                icon={<Clock className="size-3.5" />}
                title={ts.title}
                subtitle={ts.sub}
                filled={initialTrigger !== null}
                onClick={() => setTriggerOpen(true)}
              />

              {/* Media card — video recording is Pro */}
              <SummaryCard
                icon={<Paperclip className="size-3.5" />}
                title={ms.title}
                subtitle={ms.sub}
                filled={initialMediaItems.length > 0}
                onClick={() => setMediaOpen(true)}
              />

              {/* Chapters card — drip delivery is Pro */}
              {isPro ? (
                <SummaryCard
                  icon={<BookOpen className="size-3.5" />}
                  title={cs.title}
                  subtitle={cs.sub}
                  filled={initialChapters.length > 0}
                  onClick={() => setChapterOpen(true)}
                />
              ) : (
                <LockedCard
                  icon={<BookOpen className="size-3.5" />}
                  title="Drip Chapters"
                  subtitle="Parts that unlock over time"
                  feature="Drip chapter delivery"
                  onUpgrade={openUpgrade}
                />
              )}

              {/* Divider */}
              <div className="h-px bg-border/30 mx-1 my-3" />

              {/* Category selector */}
              {categories.length > 0 && (
                <div className="px-1 space-y-1.5">
                  <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground/40 px-1">
                    Category
                  </p>
                  <select
                    value={categoryId ?? "__none__"}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                    className={cn(
                      "w-full rounded-xl border border-border/40 bg-muted/20 px-3 py-2 text-xs text-foreground",
                      "focus:outline-none focus:border-foreground/30 transition-colors cursor-pointer"
                    )}
                  >
                    <option value="__none__">No category</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Divider */}
              <div className="h-px bg-border/30 mx-1 my-3" />

              {/* Activate */}
              <div className="px-1">
                <ActivatePanel
                  packId={packId}
                  packStatus={packStatus}
                  hasRecipients={initialRecipients.length > 0}
                  hasTrigger={initialTrigger !== null}
                />
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* ── Sheets (rendered outside the layout to avoid clipping) ──── */}
      <RecipientSheet
        packId={packId}
        initialRecipients={initialRecipients}
        open={recipientOpen}
        onOpenChange={closeAndRefresh(setRecipientOpen)}
      />
      <TriggerSheet
        packId={packId}
        packType={packType}
        initialTrigger={initialTrigger}
        open={triggerOpen}
        onOpenChange={closeAndRefresh(setTriggerOpen)}
      />
      <MediaSheet
        packId={packId}
        userId={userId}
        initialItems={initialMediaItems}
        open={mediaOpen}
        onOpenChange={closeAndRefresh(setMediaOpen)}
      />
      <ChapterSheet
        packId={packId}
        initialChapters={initialChapters}
        open={chapterOpen}
        onOpenChange={closeAndRefresh(setChapterOpen)}
      />
    </>
  );
}

// ─── Locked card (Pro gate) ───────────────────────────────────────────────────

function LockedCard({
  icon,
  title,
  subtitle,
  feature,
  onUpgrade,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  feature: string;
  onUpgrade: (feature?: string) => void;
}) {
  return (
    <button
      onClick={() => onUpgrade(feature)}
      className={cn(
        "w-full text-left rounded-xl p-3 flex items-start gap-2.5 group transition-all duration-150",
        "border border-dashed border-violet-500/20 hover:border-violet-500/40",
        "hover:bg-violet-500/[0.04]"
      )}
    >
      <div className="mt-0.5 shrink-0 rounded-md p-1 text-muted-foreground/30">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium leading-snug truncate text-muted-foreground/40 group-hover:text-violet-300/70 transition-colors">
          {title}
        </p>
        <p className="text-[10px] text-muted-foreground/30 truncate mt-0.5 leading-snug">
          {subtitle}
        </p>
      </div>
      <span className="mt-0.5 shrink-0 flex items-center gap-1 text-[9px] font-semibold tracking-widest uppercase text-violet-400/50 group-hover:text-violet-400 transition-colors">
        <Lock className="size-2.5" />
        Pro
      </span>
    </button>
  );
}

// ─── Summary card ─────────────────────────────────────────────────────────────

function SummaryCard({
  icon,
  title,
  subtitle,
  filled,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  filled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left rounded-xl p-3 flex items-start gap-2.5 group transition-all duration-150",
        "hover:bg-accent/50 hover:shadow-sm",
        filled
          ? "bg-card/60 border border-border/30"
          : "border border-dashed border-border/30"
      )}
    >
      <div
        className={cn(
          "mt-0.5 shrink-0 rounded-md p-1",
          filled
            ? "bg-foreground/8 text-foreground/60"
            : "text-muted-foreground/40"
        )}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "text-xs font-medium leading-snug truncate",
            filled ? "text-foreground/80" : "text-muted-foreground/60"
          )}
        >
          {title}
        </p>
        <p className="text-[10px] text-muted-foreground/50 truncate mt-0.5 leading-snug">
          {subtitle}
        </p>
      </div>
      <ChevronRight className="size-3.5 shrink-0 mt-0.5 text-muted-foreground/20 group-hover:text-muted-foreground/50 transition-colors" />
    </button>
  );
}
