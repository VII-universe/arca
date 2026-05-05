"use client";

import { useState, useTransition } from "react";
import { upsertTrigger } from "@/app/actions/delivery";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TriggerData {
  type: "SPECIFIC_DATE" | "INACTIVITY" | "MANUAL_EMERGENCY";
  executeAtDate: Date | null;
  inactivityDaysLimit: number | null;
  gracePeriodDays: number;
}

type TriggerType = "SPECIFIC_DATE" | "INACTIVITY";
type SaveStatus = "idle" | "saving" | "saved" | "error";

const INACTIVITY_OPTIONS = [
  { value: 30,  label: "30 days" },
  { value: 60,  label: "60 days" },
  { value: 90,  label: "90 days" },
  { value: 180, label: "6 months" },
  { value: 365, label: "1 year" },
];

const GRACE_OPTIONS = [
  { value: 7,  label: "7 days" },
  { value: 14, label: "14 days (recommended)" },
  { value: 30, label: "30 days" },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function TriggerSettings({
  packId,
  packType,
  initialTrigger,
}: {
  packId: string;
  packType: "EMOTIONAL" | "PRACTICAL";
  initialTrigger: TriggerData | null;
}) {
  const defaultType: TriggerType =
    initialTrigger?.type === "SPECIFIC_DATE" || initialTrigger?.type === "INACTIVITY"
      ? (initialTrigger.type as TriggerType)
      : packType === "EMOTIONAL"
      ? "SPECIFIC_DATE"
      : "INACTIVITY";

  const [triggerType, setTriggerType] = useState<TriggerType>(defaultType);
  const [executeAtDate, setExecuteAtDate] = useState<string>(
    initialTrigger?.executeAtDate
      ? toDateInputValue(new Date(initialTrigger.executeAtDate))
      : ""
  );
  const [inactivityDays, setInactivityDays] = useState<number>(
    initialTrigger?.inactivityDaysLimit ?? 90
  );
  const [gracePeriodDays, setGracePeriodDays] = useState<number>(
    initialTrigger?.gracePeriodDays ?? 14
  );
  const [saveStatus, setSaveStatus] = useState<SaveStatus>(
    initialTrigger ? "saved" : "idle"
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const minDate = toDateInputValue(
    new Date(Date.now() + 24 * 60 * 60 * 1000) // tomorrow
  );

  function handleSave() {
    setErrorMsg(null);
    startTransition(async () => {
      setSaveStatus("saving");
      const result = await upsertTrigger(packId, {
        type: triggerType,
        executeAtDate: triggerType === "SPECIFIC_DATE" ? executeAtDate : null,
        inactivityDaysLimit: triggerType === "INACTIVITY" ? inactivityDays : null,
        gracePeriodDays,
      });

      if ("error" in result) {
        setSaveStatus("error");
        setErrorMsg(result.error);
      } else {
        setSaveStatus("saved");
      }
    });
  }

  return (
    <div className="space-y-5">
      {/* Trigger type selector */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <TriggerOption
          selected={triggerType === "SPECIFIC_DATE"}
          onSelect={() => { setTriggerType("SPECIFIC_DATE"); setSaveStatus("idle"); }}
          icon="◷"
          label="Specific Date"
          description={
            packType === "EMOTIONAL"
              ? "Delivered on a date you choose — a birthday, anniversary, or milestone."
              : "Released on a set date, regardless of your activity."
          }
          accent="text-rose-400"
          ringColor={triggerType === "SPECIFIC_DATE" ? "ring-rose-800 border-neutral-700 bg-rose-950/20" : ""}
        />
        <TriggerOption
          selected={triggerType === "INACTIVITY"}
          onSelect={() => { setTriggerType("INACTIVITY"); setSaveStatus("idle"); }}
          icon="◉"
          label="Inactivity Monitor"
          description={
            packType === "PRACTICAL"
              ? "Triggered after a period of inactivity — the dead-man switch."
              : "Released if you stop checking in for a set period of time."
          }
          accent="text-blue-400"
          ringColor={triggerType === "INACTIVITY" ? "ring-blue-800 border-neutral-700 bg-blue-950/20" : ""}
        />
      </div>

      {/* Conditional input */}
      <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-5 space-y-4">
        {triggerType === "SPECIFIC_DATE" ? (
          <div className="space-y-1.5">
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-neutral-600">
              Delivery date
            </label>
            <input
              type="date"
              min={minDate}
              value={executeAtDate}
              onChange={(e) => { setExecuteAtDate(e.target.value); setSaveStatus("idle"); }}
              className="w-full rounded-lg border border-neutral-700 bg-neutral-800/60 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-neutral-500 focus:ring-1 focus:ring-neutral-500 transition-colors [color-scheme:dark]"
            />
          </div>
        ) : (
          <div className="space-y-1.5">
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-neutral-600">
              Inactivity threshold
            </label>
            <select
              value={inactivityDays}
              onChange={(e) => { setInactivityDays(Number(e.target.value)); setSaveStatus("idle"); }}
              className="w-full rounded-lg border border-neutral-700 bg-neutral-800/60 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-neutral-500 focus:ring-1 focus:ring-neutral-500 transition-colors"
            >
              {INACTIVITY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label} without activity
                </option>
              ))}
            </select>
            <p className="text-[11px] text-neutral-700 leading-snug">
              The trigger fires if you have not logged in for this period.
              Logging into ARCA resets the timer.
            </p>
          </div>
        )}

        {/* Grace period — always visible */}
        <div className="space-y-1.5 pt-1 border-t border-neutral-800/60">
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-neutral-600">
            Grace period
          </label>
          <select
            value={gracePeriodDays}
            onChange={(e) => { setGracePeriodDays(Number(e.target.value)); setSaveStatus("idle"); }}
            className="w-full rounded-lg border border-neutral-700 bg-neutral-800/60 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-neutral-500 focus:ring-1 focus:ring-neutral-500 transition-colors"
          >
            {GRACE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-neutral-700 leading-snug">
            After the trigger fires, delivery is held for this long — giving
            you a window to cancel if it fired by mistake.
          </p>
        </div>
      </div>

      {/* Error */}
      {errorMsg && (
        <p className="text-sm text-red-400 rounded-lg border border-red-900/60 bg-red-950/40 px-3 py-2">
          {errorMsg}
        </p>
      )}

      {/* Save */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={isPending}
          className="rounded-lg bg-neutral-100 px-4 py-2 text-sm font-semibold text-neutral-900 hover:bg-white transition-colors disabled:opacity-50"
        >
          {isPending ? "Saving…" : "Save Trigger"}
        </button>
        <SaveIndicator status={saveStatus} />
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TriggerOption({
  selected,
  onSelect,
  icon,
  label,
  description,
  accent,
  ringColor,
}: {
  selected: boolean;
  onSelect: () => void;
  icon: string;
  label: string;
  description: string;
  accent: string;
  ringColor: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={[
        "relative text-left rounded-xl border p-4 transition-all duration-150 focus:outline-none",
        "focus-visible:ring-2 focus-visible:ring-neutral-500",
        selected
          ? `ring-1 ${ringColor}`
          : "border-neutral-800 bg-neutral-900/40 hover:border-neutral-700",
      ].join(" ")}
    >
      <div className="space-y-2">
        <div className={`text-lg ${accent}`}>{icon}</div>
        <p className="text-sm font-semibold text-neutral-200">{label}</p>
        <p className="text-xs text-neutral-500 leading-relaxed">{description}</p>
      </div>
      {selected && (
        <div className="absolute top-3 right-3 h-1.5 w-1.5 rounded-full bg-neutral-300" />
      )}
    </button>
  );
}

function SaveIndicator({ status }: { status: SaveStatus }) {
  const map: Record<SaveStatus, { label: string; cls: string }> = {
    idle:   { label: "", cls: "" },
    saving: { label: "Saving…", cls: "text-neutral-500" },
    saved:  { label: "Trigger saved ✓", cls: "text-emerald-700" },
    error:  { label: "Not saved", cls: "text-red-600" },
  };
  const { label, cls } = map[status];
  if (!label) return null;
  return <span className={`text-xs transition-colors ${cls}`}>{label}</span>;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toDateInputValue(d: Date): string {
  return d.toISOString().split("T")[0];
}
