"use client";

import { useState, useTransition } from "react";
import { useTranslations, useLocale } from "next-intl";
import { checkIn } from "@/app/actions/activity";

const IcActivity = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
  </svg>
);

function formatRelative(date: Date, t: (key: string, values?: Record<string, number>) => string, dateLocale: string): string {
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);
  if (diffMins < 2)   return t("justNow");
  if (diffMins < 60)  return t("minsAgo", { mins: diffMins });
  if (diffHours < 24) return t("hoursAgo", { hours: diffHours });
  if (diffDays === 1) return t("yesterday");
  if (diffDays < 30)  return t("daysAgo", { days: diffDays });
  return date.toLocaleDateString(dateLocale, { day: "numeric", month: "short" });
}

export default function CheckInButton({ lastActiveAt }: { lastActiveAt: Date }) {
  const t = useTranslations("Guardians.presence");
  const dateLocale = useLocale() === "cs" ? "cs-CZ" : "en-GB";
  const [checkedInAt, setCheckedInAt] = useState<Date | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleCheckIn() {
    startTransition(async () => {
      const result = await checkIn();
      if ("ok" in result) setCheckedInAt(new Date(result.timestamp));
    });
  }

  const displayDate = checkedInAt ?? lastActiveAt;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span className="arca-mono" style={{ color: "var(--muted)", fontSize: 11.5 }}>{t("lastSeenHere")}</span>
        <span style={{ fontSize: 13, fontWeight: 500 }}>{formatRelative(displayDate, t, dateLocale)}</span>
      </div>
      <button
        onClick={handleCheckIn}
        disabled={isPending}
        className="arca-btn arca-btn--clay"
        style={{ width: "100%", justifyContent: "center" }}
      >
        <IcActivity />
        {isPending ? t("confirming") : t("imHere")}
      </button>
    </div>
  );
}
