"use client";

import { useState, useTransition, useRef } from "react";
import Link from "next/link";
import {
  Users,
  FolderOpen,
  Plus,
  Lock,
  Sparkles,
  Trash2,
  Loader2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createCategory, deleteCategory } from "@/app/actions/categories";
import { type PackSummary, type CategorySummary, CATEGORY_COLORS, COLOR_OPTIONS } from "./shared";
import ArcasByPerson from "./ArcasByPerson";
import ArcasByCategory from "./ArcasByCategory";

type Tab = "people" | "categories";

interface Props {
  packs: PackSummary[];
  categories: CategorySummary[];
  atPackLimit: boolean;
  isPro: boolean;
}

export default function ArcasDashboard({ packs, categories, atPackLimit, isPro }: Props) {
  const [tab, setTab] = useState<Tab>("people");
  const [showCatForm, setShowCatForm] = useState(false);
  const [catError, setCatError] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string>("violet");
  const [isPending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  function handleCreateCategory(formData: FormData) {
    setCatError(null);
    formData.set("color", selectedColor);
    startTransition(async () => {
      try {
        await createCategory(formData);
        setShowCatForm(false);
        formRef.current?.reset();
        setSelectedColor("violet");
      } catch (err) {
        setCatError(err instanceof Error ? err.message : "Failed to create");
      }
    });
  }

  function handleDeleteCategory(id: string) {
    setDeletingId(id);
    startTransition(async () => {
      await deleteCategory(id);
      setDeletingId(null);
    });
  }

  return (
    <section className="space-y-4">

      {/* ── Section header ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">

        {/* Tab switcher */}
        <div className="flex items-center rounded-xl bg-muted/30 border border-border/40 p-1 gap-0.5">
          {([
            { id: "people" as Tab, icon: <Users className="size-3.5" />, label: "By Person" },
            { id: "categories" as Tab, icon: <FolderOpen className="size-3.5" />, label: "By Category" },
          ]).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-medium transition-all duration-150",
                tab === t.id
                  ? "bg-background shadow-sm text-foreground border border-border/50"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          {tab === "categories" && (
            <button
              onClick={() => setShowCatForm(true)}
              className="flex items-center gap-1.5 rounded-lg border border-border/50 bg-muted/20 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-all duration-150"
            >
              <Plus className="size-3.5" />
              New category
            </button>
          )}

          {atPackLimit ? (
            <Link
              href="/dashboard/billing"
              className="flex items-center gap-1.5 rounded-lg border border-violet-500/30 bg-violet-500/10 px-3 py-1.5 text-xs font-medium text-violet-300 hover:bg-violet-500/20 transition-colors"
            >
              <Lock className="size-3.5" />
              Unlock Pro
            </Link>
          ) : (
            <Link
              href="/dashboard/arca/new"
              className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-foreground/5 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-foreground/10 transition-all duration-150"
            >
              <Plus className="size-3.5" />
              New Arca
            </Link>
          )}
        </div>
      </div>

      {/* ── Free-plan notice ───────────────────────────────────────── */}
      {atPackLimit && (
        <div className="rounded-xl border border-violet-500/20 bg-violet-500/[0.06] px-4 py-3 flex items-center justify-between gap-3">
          <p className="text-xs text-violet-300/80">
            Free plan · 1 Arca max. Upgrade to create unlimited Arcas for everyone you love.
          </p>
          <Link
            href="/dashboard/billing"
            className="shrink-0 flex items-center gap-1 text-[11px] font-semibold text-violet-300 hover:text-violet-200 transition-colors"
          >
            <Sparkles className="size-3" />
            Upgrade
          </Link>
        </div>
      )}

      {/* ── Category creation form ─────────────────────────────────── */}
      {showCatForm && (
        <div className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">New category</p>
            <button
              onClick={() => { setShowCatForm(false); setCatError(null); }}
              className="p-1 rounded-lg text-muted-foreground/50 hover:text-muted-foreground transition-colors"
            >
              <X className="size-4" />
            </button>
          </div>

          {catError && (
            <p className="text-xs text-rose-400 bg-rose-400/10 rounded-lg px-3 py-2">{catError}</p>
          )}

          <form ref={formRef} action={handleCreateCategory} className="space-y-4">
            <input
              name="name"
              required
              maxLength={40}
              placeholder="Category name…"
              className={cn(
                "w-full text-sm rounded-xl border border-border/60 bg-muted/30 px-3 py-2.5",
                "placeholder:text-muted-foreground/40 text-foreground",
                "focus:outline-none focus:border-foreground/30 focus:ring-1 focus:ring-foreground/20",
                "transition-colors"
              )}
            />

            {/* Colour picker */}
            <div className="space-y-2">
              <p className="text-[11px] text-muted-foreground/50 uppercase tracking-wider">Colour</p>
              <div className="flex flex-wrap gap-2">
                {COLOR_OPTIONS.map((c) => {
                  const col = CATEGORY_COLORS[c];
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setSelectedColor(c)}
                      className={cn(
                        "size-7 rounded-full border-2 transition-all duration-150 flex items-center justify-center",
                        col.dot,
                        selectedColor === c
                          ? "border-white/70 scale-110 shadow-lg"
                          : "border-transparent opacity-60 hover:opacity-100"
                      )}
                      title={c}
                    >
                      {selectedColor === c && (
                        <span className="size-2 rounded-full bg-white/80" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                disabled={isPending}
                className={cn(
                  "flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium transition-all",
                  "bg-foreground text-background hover:opacity-85 disabled:opacity-50"
                )}
              >
                {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
                Create
              </button>
              <button
                type="button"
                onClick={() => { setShowCatForm(false); setCatError(null); }}
                className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Category chips (when in category tab) ─────────────────── */}
      {tab === "categories" && categories.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => {
            const colors = CATEGORY_COLORS[cat.color ?? "zinc"] ?? CATEGORY_COLORS.zinc;
            return (
              <div
                key={cat.id}
                className={cn(
                  "group flex items-center gap-2 rounded-full border px-3 py-1.5",
                  colors.bg, colors.border
                )}
              >
                <span className={cn("size-2 rounded-full shrink-0", colors.dot)} />
                <span className={cn("text-xs font-medium", colors.text)}>{cat.name}</span>
                <button
                  onClick={() => handleDeleteCategory(cat.id)}
                  disabled={deletingId === cat.id}
                  className="opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity"
                  aria-label="Delete category"
                >
                  {deletingId === cat.id
                    ? <Loader2 className="size-3 animate-spin text-muted-foreground" />
                    : <X className="size-3 text-muted-foreground" />
                  }
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Content ───────────────────────────────────────────────── */}
      {tab === "people" ? (
        <ArcasByPerson packs={packs} atPackLimit={atPackLimit} />
      ) : (
        <ArcasByCategory packs={packs} categories={categories} />
      )}
    </section>
  );
}
