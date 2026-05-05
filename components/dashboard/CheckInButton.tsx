"use client";

import { useState, useTransition } from "react";
import { Activity } from "lucide-react";
import { toast } from "sonner";
import { checkIn } from "@/app/actions/activity";
import { Button } from "@/components/ui/button";

export default function CheckInButton({
  lastActiveAt,
}: {
  lastActiveAt: Date;
}) {
  const [checkedInAt, setCheckedInAt] = useState<Date | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleCheckIn() {
    startTransition(async () => {
      const result = await checkIn();
      if ("ok" in result) {
        setCheckedInAt(new Date(result.timestamp));
        toast.success("Presence confirmed", {
          description: "All inactivity timers have been reset.",
        });
      } else {
        toast.error("Check-in failed", {
          description: "Please try again in a moment.",
        });
      }
    });
  }

  const displayDate = checkedInAt ?? lastActiveAt;

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto">
      <p className="text-xs text-muted-foreground shrink-0">
        Last confirmed:{" "}
        <span className="text-foreground font-medium">
          {formatRelative(displayDate)}
        </span>
      </p>

      <Button
        onClick={handleCheckIn}
        disabled={isPending}
        size="sm"
        className="shrink-0 gap-2 rounded-full"
      >
        <Activity className={`size-3.5 ${isPending ? "animate-pulse" : ""}`} />
        {isPending ? "Confirming…" : "I'm here"}
      </Button>
    </div>
  );
}

function formatRelative(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffMins < 2) return "just now";
  if (diffMins < 60) return `${diffMins} minutes ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  if (diffDays === 1) return "yesterday";
  if (diffDays < 30) return `${diffDays} days ago`;
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
