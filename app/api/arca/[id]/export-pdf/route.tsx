import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";
import { LOCALES, DEFAULT_LOCALE, LOCALE_COOKIE, type Locale } from "@/i18n/config";
import { LegacyBookDocument, type LegacyBookData } from "@/lib/pdf/LegacyBookDocument";
import { htmlToParagraphs } from "@/lib/pdf/html-to-text";

function isLocale(value: string | null | undefined): value is Locale {
  return !!value && (LOCALES as readonly string[]).includes(value);
}

const COPY = {
  cs: {
    generatedOn: (d: string) => `Vygenerováno ${d}`,
    for: (names: string) => `Pro: ${names}`,
    mainMessage: "Hlavní zpráva",
    chapters: "Kapitoly",
    unlockImmediate: "Odemčeno okamžitě",
    unlockOnDate: (d: string) => `Odemčeno ${d}`,
    unlockAfterDays: (n: number) => `Odemčeno ${n} ${n === 1 ? "den" : n < 5 ? "dny" : "dní"} po spuštění`,
    footer: "ARCA — osobní archiv",
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
    dateLocale: "en-GB",
  },
} as const;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const pack = await prisma.messagePack.findFirst({
    where: { id, ownerId: user.id },
    select: {
      title: true,
      createdAt: true,
      owner: { select: { name: true, locale: true } },
      recipients: { select: { name: true } },
      contents: {
        where: { type: "TEXT" },
        orderBy: { createdAt: "asc" },
        select: { textBody: true },
      },
      chapters: {
        orderBy: { order: "asc" },
        select: { title: true, content: true, unlockDate: true, unlockDelayDays: true },
      },
      triggerCondition: { select: { triggeredAt: true } },
    },
  });

  // findFirst scoped to ownerId: a 404 here also covers "exists but isn't
  // yours" — never leak which case it is.
  if (!pack) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const cookieLocale = (await cookies()).get(LOCALE_COOKIE)?.value;
  const locale: Locale = isLocale(pack.owner.locale)
    ? pack.owner.locale
    : isLocale(cookieLocale)
      ? cookieLocale
      : DEFAULT_LOCALE;
  const copy = COPY[locale];

  const mainParagraphs = pack.contents.flatMap((c) => htmlToParagraphs(c.textBody));

  const triggeredAt = pack.triggerCondition?.triggeredAt ?? null;
  const chapters = pack.chapters.map((c) => {
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

  const data: LegacyBookData = {
    packTitle: pack.title,
    ownerName: pack.owner.name,
    recipientNames: pack.recipients.map((r) => r.name),
    generatedOnLabel: copy.generatedOn(new Date().toLocaleDateString(copy.dateLocale)),
    forLabel: copy.for(pack.recipients.map((r) => r.name).join(", ")),
    mainMessageLabel: copy.mainMessage,
    chaptersLabel: copy.chapters,
    footerLabel: copy.footer,
    mainParagraphs,
    chapters,
  };

  const buffer = await renderToBuffer(<LegacyBookDocument data={data} />);

  const filename = `${pack.title.replace(/[^\p{L}\p{N}\- ]/gu, "").trim() || "arca"}.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
