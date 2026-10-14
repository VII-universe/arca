import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma/client";
import { isUnlocked } from "@/lib/unlock-token";
import { createRateLimiter, clientIp } from "@/lib/rate-limit";
import { requestJsonFromOpenRouter } from "@/lib/ai/openrouter";
import { htmlToParagraphs } from "@/lib/pdf/html-to-text";

// Recipient-facing and unauthenticated (recipients are never logged-in app
// users) — keyed by IP, same pattern as guardian-action. This also means
// the route must NEVER translate arbitrary client-submitted text: it only
// ever translates a pack's own content, re-fetched server-side after
// re-checking the exact same seal/challenge gate the reveal page itself
// enforces. Otherwise this would be a free, open text-translation oracle.
const translateLimiter = createRateLimiter("translate-content", 20, "1 h");

const TARGET_LOCALES = ["cs", "en"] as const;
type TargetLocale = (typeof TARGET_LOCALES)[number];
function isTargetLocale(value: unknown): value is TargetLocale {
  return typeof value === "string" && (TARGET_LOCALES as readonly string[]).includes(value);
}

const ERROR_COPY = {
  cs: { tooManyRequests: "Příliš mnoho požadavků. Zkus to prosím za chvíli.", sealed: "Tato zpráva není dostupná.", invalid: "Neplatný požadavek.", aiFailed: "Překlad se nepodařilo vygenerovat. Zkus to znovu." },
  en: { tooManyRequests: "Too many requests. Please try again shortly.", sealed: "This message isn't available.", invalid: "Invalid request.", aiFailed: "Couldn't generate a translation. Please try again." },
} as const;

function buildTranslatePrompt(targetLocale: TargetLocale, text: string): string {
  const targetName = targetLocale === "cs" ? "Czech" : "English";
  return `Translate the following personal letter into ${targetName}. If it is already written in ${targetName}, return it unchanged. Preserve paragraph breaks, tone, and meaning exactly — this is a deeply personal message, not a generic document. Do not add commentary.

Text:
${text}

Return strict JSON with no markdown blocks: { "translated": string }`;
}

export async function POST(req: NextRequest) {
  const rate = await translateLimiter.check(clientIp(req));
  if (!rate.success) {
    return NextResponse.json({ error: ERROR_COPY.en.tooManyRequests }, { status: 429 });
  }

  const body = await req.json() as { livingLinkHash?: string; targetLocale?: string };
  const { livingLinkHash, targetLocale } = body;

  if (!livingLinkHash || !isTargetLocale(targetLocale)) {
    return NextResponse.json({ error: ERROR_COPY.en.invalid }, { status: 400 });
  }
  const copy = ERROR_COPY[targetLocale];

  const pack = await prisma.messagePack.findUnique({
    where: { livingLinkHash },
    select: {
      id: true,
      status: true,
      recipients: { select: { challengeQuestion: true, challengeAnswerHash: true } },
      contents: {
        where: { type: "TEXT" },
        orderBy: { createdAt: "asc" },
        select: { textBody: true },
      },
    },
  });

  // Same seal check as the reveal page itself — never translate content
  // for a pack that isn't actually unsealed yet.
  if (!pack || (pack.status !== "TRIGGERED" && pack.status !== "DELIVERED")) {
    return NextResponse.json({ error: copy.sealed }, { status: 404 });
  }

  // Same challenge-gate check as the reveal page — a translate call can't
  // be used to read content before the visitor has actually unlocked it.
  const challengeRecipient = pack.recipients.find((r) => r.challengeQuestion && r.challengeAnswerHash);
  if (challengeRecipient) {
    const token = (await cookies()).get(`arca-unlocked-${pack.id}`)?.value ?? "";
    if (!isUnlocked(pack.id, token)) {
      return NextResponse.json({ error: copy.sealed }, { status: 403 });
    }
  }

  const originalHtml = pack.contents[0]?.textBody;
  const paragraphs = htmlToParagraphs(originalHtml);
  if (paragraphs.length === 0) {
    return NextResponse.json({ error: copy.invalid }, { status: 400 });
  }

  const prompt = buildTranslatePrompt(targetLocale, paragraphs.join("\n\n"));
  const result = await requestJsonFromOpenRouter<{ translated: string }>(prompt);
  if (!result.ok || typeof result.data.translated !== "string" || !result.data.translated.trim()) {
    return NextResponse.json({ error: copy.aiFailed }, { status: 500 });
  }

  const html = result.data.translated
    .trim()
    .split(/\n{2,}/)
    .map((p) => `<p>${p.replace(/\n/g, "<br/>")}</p>`)
    .join("");

  return NextResponse.json({ html });
}
