import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma/client";
import { LOCALES, DEFAULT_LOCALE, LOCALE_COOKIE, type Locale } from "@/i18n/config";
import { htmlToParagraphs } from "./html-to-text";
import type { LegacyBookChapter } from "./LegacyBookDocument";

function isLocale(value: string | null | undefined): value is Locale {
  return !!value && (LOCALES as readonly string[]).includes(value);
}

// Same resolution order used elsewhere (e.g. ai-assist) — saved user
// preference, then the locale cookie, then the app default.
export async function resolvePdfLocale(ownerLocale: string | null): Promise<Locale> {
  if (isLocale(ownerLocale)) return ownerLocale;
  const cookieLocale = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(cookieLocale)) return cookieLocale;
  return DEFAULT_LOCALE;
}

export const PDF_COPY = {
  cs: {
    generatedOn: (d: string) => `Vygenerováno ${d}`,
    for: (names: string) => `Pro: ${names}`,
    mainMessage: "Hlavní zpráva",
    chapters: "Kapitoly",
    unlockImmediate: "Odemčeno okamžitě",
    unlockOnDate: (d: string) => `Odemčeno ${d}`,
    unlockAfterDays: (n: number) => `Odemčeno ${n} ${n === 1 ? "den" : n < 5 ? "dny" : "dní"} po spuštění`,
    footer: "ARCA — osobní archiv",
    qrLabel: "Naskenuj pro zobrazení online",
    packCount: (n: number) => `${n} ${n === 1 ? "zpráva" : n < 5 ? "zprávy" : "zpráv"}`,
    audioTranscript: "Přepis hlasové zprávy:",
    videoTranscript: "Přepis video zprávy:",
    contributionFrom: (name: string) => `Od ${name}:`,
    dateLocale: "cs-CZ",
  },
  en: {
    generatedOn: (d: string) => `Generated on ${d}`,
    for: (names: string) => `For: ${names}`,
    mainMessage: "Main message",
    chapters: "Chapters",
    unlockImmediate: "Unlocked immediately",
    unlockOnDate: (d: string) => `Unlocks ${d}`,
    unlockAfterDays: (n: number) => `Unlocks ${n} ${n === 1 ? "day" : "days"} after delivery`,
    footer: "ARCA — personal archive",
    qrLabel: "Scan to view online",
    packCount: (n: number) => `${n} ${n === 1 ? "message" : "messages"}`,
    audioTranscript: "Transcript of voice message:",
    videoTranscript: "Transcript of video message:",
    contributionFrom: (name: string) => `From ${name}:`,
    dateLocale: "en-GB",
  },
} as const;

export type PdfCopy = (typeof PDF_COPY)[Locale];

interface ContentSource {
  type: string;
  textBody: string | null;
  transcript: string | null;
}

// Shared between both PDF exports — TEXT content contributes its HTML as
// plain paragraphs; AUDIO/VIDEO content contributes its transcript (if one
// was generated) labeled by kind, so a voice/video message isn't just
// silently absent from the PDF the way it used to be. FILE content and
// AUDIO/VIDEO without a transcript yet contribute nothing.
export function buildMainParagraphs(contents: ContentSource[], copy: PdfCopy): string[] {
  return contents.flatMap((c) => {
    if (c.type === "TEXT") return htmlToParagraphs(c.textBody);
    if (!c.transcript) return [];
    if (c.type === "AUDIO") return [copy.audioTranscript, c.transcript];
    if (c.type === "VIDEO") return [copy.videoTranscript, c.transcript];
    return [];
  });
}

interface ContributionSource {
  authorName: string;
  content: string;
}

// Plain-text contributions (not HTML, unlike TEXT content — the public
// contribute form is a plain textarea) labeled by author name.
export function buildContributionParagraphs(contributions: ContributionSource[], copy: PdfCopy): string[] {
  return contributions.flatMap((c) => [copy.contributionFrom(c.authorName), c.content]);
}

interface ChapterSource {
  title: string;
  content: string;
  unlockDate: Date | null;
  unlockDelayDays: number | null;
}

// Shared between the single-message and whole-vault PDF exports — computes
// each chapter's human-readable unlock label and converts its HTML to
// plain paragraphs.
export function buildChapterSections(
  chapters: ChapterSource[],
  triggeredAt: Date | null,
  copy: PdfCopy
): LegacyBookChapter[] {
  return chapters.map((c) => {
    let unlockLabel: string = copy.unlockImmediate;
    if (c.unlockDate) {
      unlockLabel = copy.unlockOnDate(new Date(c.unlockDate).toLocaleDateString(copy.dateLocale));
    } else if (c.unlockDelayDays) {
      unlockLabel = triggeredAt
        ? copy.unlockOnDate(
            new Date(triggeredAt.getTime() + c.unlockDelayDays * 86_400_000).toLocaleDateString(copy.dateLocale)
          )
        : copy.unlockAfterDays(c.unlockDelayDays);
    }
    return { title: c.title, unlockLabel, paragraphs: htmlToParagraphs(c.content) };
  });
}
