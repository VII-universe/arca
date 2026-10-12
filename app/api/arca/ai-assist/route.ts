import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";
import { LOCALES, DEFAULT_LOCALE, LOCALE_COOKIE, type Locale } from "@/i18n/config";
import Anthropic from "@anthropic-ai/sdk";
import { createRateLimiter } from "@/lib/rate-limit";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Each call costs real money (Anthropic API usage) — cap it per user rather
// than leaving it open to an accidental retry loop or deliberate abuse.
const aiAssistLimiter = createRateLimiter("ai-assist", 10, "1 h");

function isLocale(value: string | null | undefined): value is Locale {
  return !!value && (LOCALES as readonly string[]).includes(value);
}

// Same resolution order as i18n/request.ts: saved user preference, then the
// locale cookie, then the app default. Duplicated rather than imported
// because i18n/request.ts is wired for next-intl's getRequestConfig, not a
// plain callable.
async function resolveLocale(userId: string): Promise<Locale> {
  const dbUser = await prisma.user.findUnique({ where: { id: userId }, select: { locale: true } });
  if (isLocale(dbUser?.locale)) return dbUser.locale as Locale;

  const cookieLocale = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(cookieLocale)) return cookieLocale;

  return DEFAULT_LOCALE;
}

const COPY: Record<Locale, {
  defaultRecipient: string;
  defaultOccasion: string;
  tooManyRequests: string;
  missingInput: string;
  invalidAiResponse: string;
  aiConnectionFailed: string;
  buildPrompt: (recipientName: string, relationship: string | undefined, occasion: string, userNotes: string, existingContent: string | undefined) => string;
}> = {
  cs: {
    defaultRecipient: "blízký člověk",
    defaultOccasion: "osobní zpráva",
    tooManyRequests: "Příliš mnoho požadavků na AI asistenta. Zkus to prosím za chvíli.",
    missingInput: "Zadej alespoň pár slov nebo myšlenek.",
    invalidAiResponse: "AI vrátila neplatnou odpověď. Zkus to znovu.",
    aiConnectionFailed: "Spojení s AI selhalo. Zkus to za chvíli.",
    buildPrompt: (recipientName, relationship, occasion, userNotes, existingContent) => `Jsi citlivý, empatický asistent, který pomáhá lidem formulovat hluboké osobní zprávy pro jejich blízké.
Píšeš výhradně v češtině, autenticky a s úctou – vyhni se klišé a přehnanému patosu.

Příjemce: ${recipientName}${relationship ? ` (${relationship})` : ""}
Příležitost: ${occasion}
Myšlenky autora k vyjádření: ${userNotes}
${existingContent ? `Dosavadní koncept textu: ${existingContent}` : ""}

Navrhni 3 odlišné verze zprávy:
1. Krátká (2-3 věty, přímá a silná)
2. Střední (1 odstavec, poetická / hlubší)
3. Delší (2 odstavce, odlehčená, s důrazem na sdílené lidské momenty)

Vrať striktní JSON formát bez markdown bloků, pouze čistý JSON objekt:
{ "versions": [{ "label": string, "content": string }] }`,
  },
  en: {
    defaultRecipient: "a loved one",
    defaultOccasion: "a personal message",
    tooManyRequests: "Too many requests to the AI assistant. Please try again shortly.",
    missingInput: "Enter at least a few words or thoughts.",
    invalidAiResponse: "The AI returned an invalid response. Please try again.",
    aiConnectionFailed: "Connecting to the AI failed. Please try again shortly.",
    buildPrompt: (recipientName, relationship, occasion, userNotes, existingContent) => `You are a sensitive, empathetic assistant who helps people put deep personal messages for their loved ones into words.
Write exclusively in English, authentically and respectfully – avoid clichés and overblown sentimentality.

Recipient: ${recipientName}${relationship ? ` (${relationship})` : ""}
Occasion: ${occasion}
Author's thoughts to express: ${userNotes}
${existingContent ? `Existing draft: ${existingContent}` : ""}

Suggest 3 distinct versions of the message:
1. Short (2-3 sentences, direct and strong)
2. Medium (1 paragraph, poetic / deeper)
3. Longer (2 paragraphs, lighter in tone, emphasizing shared human moments)

Return strict JSON format with no markdown blocks, just a plain JSON object:
{ "versions": [{ "label": string, "content": string }] }`,
  },
};

export async function POST(req: NextRequest) {
  // Auth check — only logged-in users
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const locale = await resolveLocale(user.id);
  const copy = COPY[locale];

  const rate = await aiAssistLimiter.check(user.id);
  if (!rate.success) {
    return NextResponse.json(
      { error: copy.tooManyRequests },
      { status: 429, headers: { "Retry-After": String(Math.max(1, Math.ceil((rate.reset - Date.now()) / 1000))) } }
    );
  }

  const body = await req.json() as {
    recipientName?: string;
    relationship?: string;
    occasion?: string;
    userNotes?: string;
    existingContent?: string;
  };

  const { recipientName = copy.defaultRecipient, relationship, occasion = copy.defaultOccasion, userNotes = "", existingContent } = body;

  if (!userNotes && !existingContent) {
    return NextResponse.json({ error: copy.missingInput }, { status: 400 });
  }

  const prompt = copy.buildPrompt(recipientName, relationship, occasion, userNotes, existingContent);

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1200,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = message.content[0].type === "text" ? message.content[0].text : "";

    // Strip potential markdown code fences
    const cleaned = raw.replace(/^```(?:json)?\n?/m, "").replace(/\n?```$/m, "").trim();

    let parsed: { versions: { label: string; content: string }[] };
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      return NextResponse.json({ error: copy.invalidAiResponse }, { status: 500 });
    }

    return NextResponse.json(parsed);
  } catch (err) {
    console.error("[ai-assist] Anthropic error:", err);
    return NextResponse.json({ error: copy.aiConnectionFailed }, { status: 500 });
  }
}
