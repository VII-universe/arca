// Shared date math for SELF-mode milestone triggers (Fáze 1). Used both
// client-side (live validation/preview while composing) and server-side
// (re-validated on save — never trust the client's computed date alone).

/** Target date for "otevři, až <recipient> bude <targetAge> let". */
export function computeAgeMilestoneDate(birthday: Date, targetAge: number): Date {
  return new Date(birthday.getFullYear() + targetAge, birthday.getMonth(), birthday.getDate());
}

/** Target date for "otevři za <years> let a <months> měsíců od teď". */
export function computeRelativeOffsetDate(anchor: Date, years: number, months: number): Date {
  const d = new Date(anchor);
  d.setFullYear(d.getFullYear() + years);
  d.setMonth(d.getMonth() + months);
  return d;
}

/** True if a computed target date is safe to save — strictly in the future. */
export function isFutureDate(date: Date): boolean {
  return date.getTime() > Date.now();
}

/** Whole years elapsed since birthday, as of now. */
export function currentAgeYears(birthday: Date): number {
  const now = new Date();
  let age = now.getFullYear() - birthday.getFullYear();
  const hasHadBirthdayThisYear =
    now.getMonth() > birthday.getMonth() ||
    (now.getMonth() === birthday.getMonth() && now.getDate() >= birthday.getDate());
  if (!hasHadBirthdayThisYear) age -= 1;
  return age;
}

/** Smallest target age whose milestone date is guaranteed to land in the future. */
export function nextValidTargetAge(birthday: Date): number {
  return Math.max(currentAgeYears(birthday) + 1, 1);
}
