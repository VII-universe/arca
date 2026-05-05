"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { activatePack } from "@/app/actions/delivery";

interface Props {
  packId: string;
  packStatus: string;
  hasRecipients: boolean;
  hasTrigger: boolean;
}

export default function ActivatePanel({
  packId,
  packStatus,
  hasRecipients,
  hasTrigger,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAlreadyActive = packStatus !== "DRAFT";
  const canActivate = hasRecipients && hasTrigger && !isAlreadyActive;

  const missing = [
    !hasRecipients && "at least one recipient",
    !hasTrigger && "a delivery trigger",
  ].filter(Boolean);

  function handleActivate() {
    setError(null);
    startTransition(async () => {
      const result = await activatePack(packId);
      if ("error" in result) {
        setError(result.error);
      } else {
        setShowModal(true);
        router.refresh();
      }
    });
  }

  // Already active state
  if (isAlreadyActive) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-emerald-900/60 bg-emerald-950/30 px-5 py-4">
        <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
        <div>
          <p className="text-sm font-semibold text-emerald-400">Arca is active</p>
          <p className="text-xs text-emerald-800 mt-0.5">
            Guarding your legacy. Status:{" "}
            <span className="capitalize">{packStatus.toLowerCase().replace("_", " ")}</span>
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-5 space-y-4">
        {/* Readiness checklist */}
        <div className="space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-600">
            Ready to activate?
          </p>
          <ReadinessItem
            done={hasRecipients}
            label="At least one recipient added"
            hint="Add a recipient above"
          />
          <ReadinessItem
            done={hasTrigger}
            label="Delivery trigger configured"
            hint="Set a trigger above"
          />
        </div>

        {/* Error */}
        {error && (
          <p className="text-sm text-red-400 rounded-lg border border-red-900/60 bg-red-950/40 px-3 py-2">
            {error}
          </p>
        )}

        {/* CTA */}
        <div className="flex items-center gap-4 pt-1">
          <button
            onClick={handleActivate}
            disabled={!canActivate || isPending}
            className={[
              "rounded-lg px-6 py-2.5 text-sm font-semibold transition-all duration-200",
              canActivate && !isPending
                ? "bg-neutral-100 text-neutral-900 hover:bg-white shadow-sm hover:shadow"
                : "bg-neutral-800 text-neutral-600 cursor-not-allowed",
            ].join(" ")}
          >
            {isPending ? "Activating…" : "Activate Arca"}
          </button>

          {missing.length > 0 && (
            <p className="text-xs text-neutral-700">
              Still needed: {missing.join(" and ")}
            </p>
          )}
        </div>
      </div>

      {/* Success modal */}
      {showModal && <SuccessModal onClose={() => setShowModal(false)} />}
    </>
  );
}

// ─── Readiness item ───────────────────────────────────────────────────────────

function ReadinessItem({
  done,
  label,
  hint,
}: {
  done: boolean;
  label: string;
  hint: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={[
          "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold transition-colors",
          done
            ? "bg-emerald-950 text-emerald-500 border border-emerald-900"
            : "bg-neutral-800 text-neutral-700 border border-neutral-700",
        ].join(" ")}
      >
        {done ? "✓" : "–"}
      </div>
      <div className="flex-1">
        <span
          className={`text-sm ${done ? "text-neutral-300" : "text-neutral-600"}`}
        >
          {label}
        </span>
        {!done && (
          <span className="ml-2 text-xs text-neutral-700">{hint}</span>
        )}
      </div>
    </div>
  );
}

// ─── Success modal ────────────────────────────────────────────────────────────

function SuccessModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-neutral-950/80 backdrop-blur-sm" />

      {/* Card */}
      <div
        className="relative z-10 max-w-sm w-full rounded-2xl border border-neutral-700 bg-neutral-900 px-8 py-12 text-center space-y-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Symbol */}
        <div className="flex justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full border border-emerald-800 bg-emerald-950/60">
            <span className="text-emerald-400 text-xl">✦</span>
          </div>
        </div>

        {/* Message */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-neutral-100 leading-snug">
            Arca is now active.
          </h2>
          <p className="text-sm text-neutral-500 leading-relaxed">
            It is guarding your legacy until the moment you have chosen. You
            can return at any time to update your message or recipients.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3 pt-2">
          <Link
            href="/dashboard"
            className="rounded-lg bg-neutral-100 px-5 py-2.5 text-sm font-semibold text-neutral-900 hover:bg-white transition-colors"
          >
            Return to Dashboard
          </Link>
          <button
            onClick={onClose}
            className="text-sm text-neutral-600 hover:text-neutral-400 transition-colors"
          >
            Continue editing
          </button>
        </div>
      </div>
    </div>
  );
}
