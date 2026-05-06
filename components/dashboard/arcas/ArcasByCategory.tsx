"use client";

import Link from "next/link";
import { ChevronRight, Clock, FolderOpen, Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type PackSummary,
  type CategorySummary,
  STATUS_CONFIG,
  TYPE_CONFIG,
  CATEGORY_COLORS,
  getTriggerSummary,
} from "./shared";

interface Props {
  packs: PackSummary[];
  categories: CategorySummary[];
}

export default function ArcasByCategory({ packs, categories }: Props) {
  // Build groups: one per category + one for uncategorised
  const grouped = new Map<string | null, PackSummary[]>();
  grouped.set(null, []);
  for (const cat of categories) grouped.set(cat.id, []);

  for (const pack of packs) {
    const key = pack.categoryId ?? null;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(pack);
  }

  const sections: { category: CategorySummary | null; packs: PackSummary[] }[] = [
    // Named categories first
    ...categories.map((cat) => ({
      category: cat,
      packs: grouped.get(cat.id) ?? [],
    })),
    // Uncategorised last (only if non-empty)
    ...(grouped.get(null)!.length > 0
      ? [{ category: null, packs: grouped.get(null)! }]
      : []),
  ];

  const allEmpty = packs.length === 0;

  if (allEmpty) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-5">
        <div className="size-14 rounded-full border border-border/50 bg-muted/20 flex items-center justify-center">
          <FolderOpen className="size-6 text-muted-foreground/30" />
        </div>
        <div className="space-y-1.5">
          <p className="font-serif text-xl italic text-muted-foreground">No Arcas yet.</p>
          <p className="text-sm text-muted-foreground/50 max-w-xs">
            Create categories using the button above, then assign Arcas to them in the editor.
          </p>
        </div>
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground/50 text-center py-4">
          No categories yet — create one above to start organising.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {packs.map((pack) => (
            <PackCard key={pack.id} pack={pack} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {sections.map(({ category, packs: groupPacks }) => {
        const colorKey = category?.color ?? "zinc";
        const colors = CATEGORY_COLORS[colorKey] ?? CATEGORY_COLORS.zinc;

        return (
          <div key={category?.id ?? "__none__"} className="space-y-3">
            {/* Category header */}
            <div className="flex items-center gap-3">
              <div className={cn(
                "flex items-center gap-2 rounded-full border px-3 py-1",
                colors.bg, colors.border
              )}>
                <span className={cn("size-2 rounded-full shrink-0", colors.dot)} />
                <span className={cn("text-xs font-semibold", colors.text)}>
                  {category?.name ?? "Uncategorised"}
                </span>
              </div>
              <div className="h-px flex-1 bg-border/30" />
              <span className="text-xs text-muted-foreground/40 shrink-0">
                {groupPacks.length} {groupPacks.length === 1 ? "Arca" : "Arcas"}
              </span>
            </div>

            {groupPacks.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/30 px-6 py-8 text-center">
                <Tag className="size-4 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground/40">
                  No Arcas in this category yet.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {groupPacks.map((pack) => (
                  <PackCard key={pack.id} pack={pack} categoryColor={colorKey} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Pack card ────────────────────────────────────────────────────────────────

function PackCard({
  pack,
  categoryColor,
}: {
  pack: PackSummary;
  categoryColor?: string;
}) {
  const status = pack.status as keyof typeof STATUS_CONFIG;
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.DRAFT;
  const type = TYPE_CONFIG[pack.type];
  const trigger = getTriggerSummary(pack.triggerCondition);
  const colors = categoryColor ? CATEGORY_COLORS[categoryColor] ?? CATEGORY_COLORS.zinc : null;

  return (
    <Link href={`/dashboard/arca/${pack.id}/edit`}>
      <div className={cn(
        "group rounded-2xl border transition-all duration-200 px-5 py-4",
        "flex items-center gap-4",
        "bg-card/40 hover:bg-card/70 backdrop-blur-sm",
        "border-border/40 hover:border-border/70",
        "hover:shadow-md hover:-translate-y-px"
      )}>
        {/* Type icon */}
        <span className={cn("text-xl shrink-0", type.color)}>{type.icon}</span>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-1">
          <p className="text-sm font-semibold text-foreground truncate group-hover:text-foreground/90 transition-colors">
            {pack.title}
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Status */}
            <span className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
              cfg.badge
            )}>
              <span className={cn("size-1.5 rounded-full shrink-0", cfg.dot, cfg.pulse && "animate-pulse")} />
              {cfg.label}
            </span>

            {/* Trigger */}
            {trigger && (
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground/50">
                <Clock className="size-2.5" />
                {trigger}
              </span>
            )}

            {/* Recipients */}
            {pack.recipients.length > 0 && (
              <span className="text-[11px] text-muted-foreground/40">
                {pack.recipients.slice(0, 2).map((r) => r.name).join(", ")}
                {pack.recipients.length > 2 && ` +${pack.recipients.length - 2}`}
              </span>
            )}
          </div>
        </div>

        <ChevronRight className="size-4 text-muted-foreground/25 group-hover:text-muted-foreground/60 group-hover:translate-x-0.5 transition-all duration-150 shrink-0" />
      </div>
    </Link>
  );
}
