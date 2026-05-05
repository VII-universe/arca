"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cancelDelivery } from "@/app/actions/delivery";

export interface GracePack {
  id: string;
  title: string;
  daysRemaining: number;
}

export default function GracePeriodBanner({ packs }: { packs: GracePack[] }) {
  if (packs.length === 0) return null;

  return (
    <div className="space-y-2">
      {packs.map((pack) => (
        <GraceAlert key={pack.id} pack={pack} />
      ))}
    </div>
  );
}

function GraceAlert({ pack }: { pack: GracePack }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [dismissed, setDismissed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (dismissed) return null;

  function handleCancel() {
    startTransition(async () => {
      const result = await cancelDelivery(pack.id);
      if ("ok" in result) {
        setDismissed(true);
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  const urgency =
    pack.daysRemaining <= 2
      ? "border-red-800 bg-red-950/50"
      : pack.daysRemaining <= 7
      ? "border-amber-800 bg-amber-950/40"
      : "border-amber-900/60 bg-amber-950/25";

  const textColor =
    pack.daysRemaining <= 2 ? "text-red-300" : "text-amber-300";
  const subColor =
    pack.daysRemaining <= 2 ? "text-red-500" : "text-amber-600";
  const iconColor =
    pack.daysRemaining <= 2 ? "text-red-400" : "text-amber-400";

  return (
    <div
      className={`rounded-xl border p-4 sm:p-5 transition-all ${urgency}`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        {/* Left: message */}
        <div className="flex gap-3 min-w-0">
          <span className={`mt-0.5 shrink-0 text-base ${iconColor}`}>⚠</span>
          <div className="space-y-1 min-w-0">
            <p className={`text-sm font-semibold leading-snug ${textColor}`}>
              Delivery trigger activated
            </p>
            <p className={`text-xs leading-relaxed ${subColor}`}>
              <span className="font-medium text-neutral-300">
                &ldquo;{pack.title}&rdquo;
              </span>{" "}
              {pack.daysRemaining <= 0
                ? "is being prepared for delivery now."
                : `will be delivered in ${pack.daysRemaining} day${pack.daysRemaining === 1 ? "" : "s"} unless you cancel.`}
            </p>
            {error && (
              <p className="text-xs text-red-400 mt-1">{error}</p>
            )}
          </div>
        </div>

        {/* Right: action */}
        <button
          onClick={handleCancel}
          disabled={isPending}
          className={[
            "shrink-0 self-start rounded-lg border px-4 py-2 text-xs font-semibold transition-all",
            isPending
              ? "opacity-50 cursor-not-allowed border-neutral-700 text-neutral-500"
              : pack.daysRemaining <= 2
              ? "border-red-700 text-red-300 hover:bg-red-900/40 hover:border-red-600"
              : "border-amber-800 text-amber-400 hover:bg-amber-900/30 hover:border-amber-700",
          ].join(" ")}
        >
          {isPending ? "Cancelling…" : "Cancel Delivery & Reset →"}
        </button>
      </div>
    </div>
  );
}
