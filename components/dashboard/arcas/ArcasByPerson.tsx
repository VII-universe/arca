"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, Clock, Users, Plus, InboxIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type PackSummary,
  STATUS_CONFIG,
  TYPE_CONFIG,
  getTriggerSummary,
  initials,
  avatarGradient,
} from "./shared";

interface Props {
  packs: PackSummary[];
  atPackLimit: boolean;
}

interface PersonGroup {
  name: string;
  email: string | null;
  packs: PackSummary[];
}

export default function ArcasByPerson({ packs, atPackLimit }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);

  // Group packs by unique recipient name+email
  const personMap = new Map<string, PersonGroup>();

  // First pass: packs WITH recipients
  for (const pack of packs) {
    for (const r of pack.recipients) {
      const key = r.email ?? r.name;
      if (!personMap.has(key)) {
        personMap.set(key, { name: r.name, email: r.email, packs: [] });
      }
      // avoid duplicates if same pack has the person twice
      const group = personMap.get(key)!;
      if (!group.packs.find((p) => p.id === pack.id)) {
        group.packs.push(pack);
      }
    }
  }

  const unaddressed = packs.filter((p) => p.recipients.length === 0);
  const people = Array.from(personMap.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  if (people.length === 0 && unaddressed.length === 0) {
    return <EmptyPeople atPackLimit={atPackLimit} />;
  }

  return (
    <div className="space-y-3">
      {people.map((person) => {
        const key = person.email ?? person.name;
        const isOpen = expanded === key;
        const grad = avatarGradient(person.name);
        const initStr = initials(person.name);
        const activeCount = person.packs.filter((p) => p.status === "ACTIVE").length;

        return (
          <div
            key={key}
            className={cn(
              "rounded-2xl border transition-all duration-200 overflow-hidden",
              isOpen
                ? "border-border/70 bg-card/70 shadow-lg shadow-black/10"
                : "border-border/40 bg-card/40 hover:border-border/60 hover:bg-card/60"
            )}
          >
            {/* Person header row */}
            <button
              onClick={() => setExpanded(isOpen ? null : key)}
              className="w-full flex items-center gap-4 px-5 py-4 text-left"
            >
              {/* Avatar */}
              <div className={cn(
                "shrink-0 size-11 rounded-full bg-gradient-to-br flex items-center justify-center",
                "text-white text-sm font-semibold shadow-md",
                grad
              )}>
                {initStr}
              </div>

              {/* Name + meta */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">
                  {person.name}
                </p>
                <p className="text-xs text-muted-foreground/60 truncate">
                  {person.email ?? "No email"}
                  {activeCount > 0 && (
                    <span className="ml-2 inline-flex items-center gap-1 text-emerald-400">
                      <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      {activeCount} active
                    </span>
                  )}
                </p>
              </div>

              {/* Pack count */}
              <div className="shrink-0 flex items-center gap-2">
                <span className="text-xs text-muted-foreground/50">
                  {person.packs.length} {person.packs.length === 1 ? "Arca" : "Arcas"}
                </span>
                <ChevronDown
                  className={cn(
                    "size-4 text-muted-foreground/30 transition-transform duration-200",
                    isOpen && "rotate-180"
                  )}
                />
              </div>
            </button>

            {/* Expanded pack list */}
            {isOpen && (
              <div className="border-t border-border/30 px-5 py-3 space-y-2">
                {person.packs.map((pack) => (
                  <PackRow key={pack.id} pack={pack} />
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* Unaddressed packs */}
      {unaddressed.length > 0 && (
        <div className="rounded-2xl border border-border/30 bg-card/30 overflow-hidden">
          <button
            onClick={() => setExpanded(expanded === "__none__" ? null : "__none__")}
            className="w-full flex items-center gap-4 px-5 py-4 text-left"
          >
            <div className="shrink-0 size-11 rounded-full border border-border/50 bg-muted/30 flex items-center justify-center">
              <Users className="size-4 text-muted-foreground/40" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-muted-foreground">No recipients yet</p>
              <p className="text-xs text-muted-foreground/50">{unaddressed.length} unsealed draft{unaddressed.length > 1 ? "s" : ""}</p>
            </div>
            <ChevronDown className={cn(
              "size-4 text-muted-foreground/30 transition-transform duration-200 shrink-0",
              expanded === "__none__" && "rotate-180"
            )} />
          </button>
          {expanded === "__none__" && (
            <div className="border-t border-border/30 px-5 py-3 space-y-2">
              {unaddressed.map((pack) => (
                <PackRow key={pack.id} pack={pack} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Compact pack row inside an expanded person ───────────────────────────────

function PackRow({ pack }: { pack: PackSummary }) {
  const status = pack.status as keyof typeof STATUS_CONFIG;
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.DRAFT;
  const type = TYPE_CONFIG[pack.type];
  const trigger = getTriggerSummary(pack.triggerCondition);

  return (
    <Link
      href={`/dashboard/arca/${pack.id}/edit`}
      className={cn(
        "flex items-center gap-3 rounded-xl px-4 py-3 transition-all duration-150",
        "border border-border/30 bg-background/40 hover:bg-background/70 hover:border-border/60",
        "group"
      )}
    >
      {/* Type icon */}
      <span className={cn("text-base shrink-0", type.color)}>{type.icon}</span>

      {/* Title */}
      <p className="flex-1 text-sm font-medium text-foreground/80 group-hover:text-foreground truncate transition-colors">
        {pack.title}
      </p>

      {/* Trigger */}
      {trigger && (
        <span className="hidden sm:flex items-center gap-1 text-[11px] text-muted-foreground/50 shrink-0">
          <Clock className="size-3" />
          {trigger}
        </span>
      )}

      {/* Status badge */}
      <span className={cn(
        "shrink-0 inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        cfg.badge
      )}>
        <span className={cn("size-1.5 rounded-full shrink-0", cfg.dot, cfg.pulse && "animate-pulse")} />
        {cfg.label}
      </span>
    </Link>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyPeople({ atPackLimit }: { atPackLimit: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center space-y-5">
      <div className="size-14 rounded-full border border-border/50 bg-muted/20 flex items-center justify-center">
        <InboxIcon className="size-6 text-muted-foreground/30" />
      </div>
      <div className="space-y-1.5">
        <p className="font-serif text-xl italic text-muted-foreground">No Arcas yet.</p>
        <p className="text-sm text-muted-foreground/50 max-w-xs">
          Create your first Arca and add recipients — they&apos;ll appear here as person cards.
        </p>
      </div>
      {!atPackLimit && (
        <Link
          href="/dashboard/arca/new"
          className="inline-flex items-center gap-1.5 rounded-full bg-foreground text-background px-5 py-2 text-sm font-semibold hover:opacity-85 transition-opacity"
        >
          <Plus className="size-3.5" />
          Create your first Arca
        </Link>
      )}
    </div>
  );
}
