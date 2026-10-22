// The message a visitor writes in the landing page hero, kept in this
// browser's localStorage so it can be offered as their first message right
// after they sign up. Never sent anywhere. Every storage access is wrapped —
// private mode or blocked storage must never break either page.

export const LANDING_DRAFT_KEY = "arca.landingDraft";
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

export type DraftRecipient = "child" | "partner" | "self" | "mom" | "other";
export type DraftWhen = "oneYear" | "tenYears" | "eighteen" | "gone" | "year";

export interface LandingDraft {
  v: 1;
  text: string;
  recipient: DraftRecipient | null;
  when: DraftWhen;
  year: number;
  savedAt: number;
}

export function saveLandingDraft(draft: Omit<LandingDraft, "v" | "savedAt">): void {
  try {
    const value: LandingDraft = { v: 1, ...draft, savedAt: Date.now() };
    localStorage.setItem(LANDING_DRAFT_KEY, JSON.stringify(value));
  } catch {
    // Storage unavailable — the demo still works, the draft just won't carry over.
  }
}

export function readLandingDraft(): LandingDraft | null {
  try {
    const raw = localStorage.getItem(LANDING_DRAFT_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as Partial<LandingDraft>;
    if (d.v !== 1 || typeof d.text !== "string" || !d.text.trim() || typeof d.savedAt !== "number") return null;
    if (Date.now() - d.savedAt > MAX_AGE_MS) return null;
    return d as LandingDraft;
  } catch {
    return null;
  }
}

export function clearLandingDraft(): void {
  try {
    localStorage.removeItem(LANDING_DRAFT_KEY);
  } catch {
    // nothing to clean up
  }
}

/** Plain text from the hero textarea → paragraphs for the rich editor. */
export function draftTextToHtml(text: string): string {
  const escape = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  return text
    .trim()
    .split(/\n{2,}/)
    .map((para) => `<p>${escape(para).replace(/\n/g, "<br>")}</p>`)
    .join("");
}
