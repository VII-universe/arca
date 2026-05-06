// Shared types and helpers for the grouped Arca views

export type PackStatus =
  | "DRAFT"
  | "ACTIVE"
  | "GRACE_PERIOD"
  | "PENDING_GUARDIAN_APPROVAL"
  | "TRIGGERED"
  | "DELIVERED"
  | "ARCHIVED";

export interface PackSummary {
  id: string;
  title: string;
  type: "EMOTIONAL" | "PRACTICAL";
  status: PackStatus;
  createdAt: Date;
  categoryId: string | null;
  category: { id: string; name: string; color: string | null } | null;
  recipients: { id: string; name: string; email: string | null }[];
  triggerCondition: {
    type: string;
    executeAtDate: Date | null;
    inactivityDaysLimit: number | null;
  } | null;
}

export interface CategorySummary {
  id: string;
  name: string;
  color: string | null;
}

export const STATUS_CONFIG: Record<PackStatus, {
  label: string;
  dot: string;
  badge: string;
  pulse?: boolean;
}> = {
  DRAFT: {
    label: "Draft",
    dot: "bg-zinc-500",
    badge: "border-zinc-700/60 bg-zinc-800/40 text-zinc-400",
  },
  ACTIVE: {
    label: "Active",
    dot: "bg-emerald-500",
    badge: "border-emerald-800/60 bg-emerald-950/40 text-emerald-400",
    pulse: true,
  },
  GRACE_PERIOD: {
    label: "Grace Period",
    dot: "bg-amber-500",
    badge: "border-amber-800/60 bg-amber-950/40 text-amber-400",
    pulse: true,
  },
  PENDING_GUARDIAN_APPROVAL: {
    label: "Awaiting Guardians",
    dot: "bg-violet-500",
    badge: "border-violet-800/60 bg-violet-950/40 text-violet-400",
    pulse: true,
  },
  TRIGGERED: {
    label: "Triggered",
    dot: "bg-orange-500",
    badge: "border-orange-800/60 bg-orange-950/40 text-orange-400",
  },
  DELIVERED: {
    label: "Delivered",
    dot: "bg-blue-500",
    badge: "border-blue-800/60 bg-blue-950/40 text-blue-400",
  },
  ARCHIVED: {
    label: "Archived",
    dot: "bg-zinc-600",
    badge: "border-zinc-700/40 bg-zinc-800/30 text-zinc-500",
  },
};

export const TYPE_CONFIG = {
  EMOTIONAL: { icon: "✦", color: "text-rose-400/80", label: "Emotional" },
  PRACTICAL: { icon: "⬡", color: "text-sky-400/80", label: "Practical" },
} as const;

// Palette for categories — maps colour key → Tailwind utility classes
export const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  rose:   { bg: "bg-rose-500/10",   text: "text-rose-400",   border: "border-rose-500/20",   dot: "bg-rose-400" },
  orange: { bg: "bg-orange-500/10", text: "text-orange-400", border: "border-orange-500/20", dot: "bg-orange-400" },
  amber:  { bg: "bg-amber-500/10",  text: "text-amber-400",  border: "border-amber-500/20",  dot: "bg-amber-400" },
  emerald:{ bg: "bg-emerald-500/10",text: "text-emerald-400",border: "border-emerald-500/20",dot: "bg-emerald-400" },
  sky:    { bg: "bg-sky-500/10",    text: "text-sky-400",    border: "border-sky-500/20",    dot: "bg-sky-400" },
  violet: { bg: "bg-violet-500/10", text: "text-violet-400", border: "border-violet-500/20", dot: "bg-violet-400" },
  pink:   { bg: "bg-pink-500/10",   text: "text-pink-400",   border: "border-pink-500/20",   dot: "bg-pink-400" },
  zinc:   { bg: "bg-zinc-500/10",   text: "text-zinc-400",   border: "border-zinc-500/20",   dot: "bg-zinc-400" },
};

export const COLOR_OPTIONS = Object.keys(CATEGORY_COLORS) as (keyof typeof CATEGORY_COLORS)[];

export function getTriggerSummary(
  trigger: { type: string; executeAtDate: Date | null; inactivityDaysLimit: number | null } | null
): string | null {
  if (!trigger) return null;
  if (trigger.type === "SPECIFIC_DATE" && trigger.executeAtDate) {
    return trigger.executeAtDate.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  }
  if (trigger.type === "INACTIVITY" && trigger.inactivityDaysLimit) {
    return `After ${trigger.inactivityDaysLimit}d silence`;
  }
  if (trigger.type === "MANUAL_EMERGENCY") return "Manual";
  return null;
}

export function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

// Deterministic avatar gradient from a name
export const AVATAR_GRADIENTS = [
  "from-rose-500 to-pink-600",
  "from-violet-500 to-purple-600",
  "from-sky-500 to-blue-600",
  "from-emerald-500 to-green-600",
  "from-amber-500 to-orange-600",
  "from-indigo-500 to-violet-600",
  "from-teal-500 to-cyan-600",
  "from-fuchsia-500 to-rose-600",
];

export function avatarGradient(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
}
