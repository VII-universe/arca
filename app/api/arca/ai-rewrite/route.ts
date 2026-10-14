import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";
import { LOCALES, DEFAULT_LOCALE, LOCALE_COOKIE, type Locale } from "@/i18n/config";
import { createRateLimiter } from "@/lib/rate-limit";
import { requestVersionsFromOpenRouter } from "@/lib/ai/openrouter";
import { htmlToParagraphs } from "@/lib/pdf/html-to-text";

// Shares its quota with ai-assist (same "ai-assist" Redis prefix) — same
// cost center (OpenRouter calls), same abuse surface.
const aiAssistLimiter = createRateLimiter("ai-assist", 10, "1 h");

const TONES = ["formal", "warm", "short"] as const;
type Tone = (typeof TONES)[number];
function isTone(value: unknown): value is Tone {
  return typeof value === "string" && (TONES as readonly string[]).includes(value);
}

function isLocale(value: string | null | undefined): value is Locale {
  return !!value && (LOCALES as readonly string[]).includes(value);
}

async function resolveLocale(userId: string): Promise<Locale> {
  const dbUser = await prisma.user.findUnique({ where: { id: userId }, select: { locale: true } });
  if (isLocale(dbUser?.locale)) return dbUser.locale as Locale;

  const cookieLocale = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(cookieLocale)) return cookieLocale;

  return DEFAULT_LOCALE;
}

const COPY: Record<Locale, {
  tooManyRequests: string;
  missingInput: string;
  invalidAiResponse: string;
  aiConnectionFailed: string;
  label: Record<Tone, string>;
  buildPrompt: (tone: Tone, text: string) => string;
}> = {
  cs: {
    tooManyRequests: "Příliš mnoho požadavků na AI asistenta. Zkus to prosím za chvíli.",
    missingInput: "Nejdřív napiš do editoru nějaký text, který se dá přepsat.",
    invalidAiResponse: "AI vrátila neplatnou odpověď. Zkus to znovu.",
    aiConnectionFailed: "Spojení s AI selhalo. Zkus to za chvíli.",
    label: { formal: "Formálnější verze", warm: "Vřelejší verze", short: "Stručnější verze" },
    buildPrompt: (tone, text) => {
      const instruction = {
        formal: "formálnější a uhlazenější, ale pořád lidsky — bez škrobenosti",
        warm: "vřelejší a osobnější, s větším důrazem na emoce a blízkost",
        short: "výrazně stručnější a úderná, zachovej jen to nejdůležitější",
      }[tone];
      return `Jsi citlivý editor osobních dopisů. Přepiš následující text tak, aby byl ${instruction}. Zachovej původní smysl a fakta, neměň jméno příjemce ani klíčové detaily. Piš výhradně v češtině.

Původní text:
${text}

Vrať striktní JSON formát bez markdown bloků, pouze čistý JSON objekt s přesně jednou verzí:
{ "versions": [{ "label": string, "content": string }] }`;
    },
  },
  en: {
    tooManyRequests: "Too many requests to the AI assistant. Please try again shortly.",
    missingInput: "Write some text in the editor first — there's nothing to rewrite yet.",
    invalidAiResponse: "The AI returned an invalid response. Please try again.",
    aiConnectionFailed: "Connecting to the AI failed. Please try again shortly.",
    label: { formal: "More formal version", warm: "Warmer version", short: "Shorter version" },
    buildPrompt: (tone, text) => {
      const instruction = {
        formal: "more formal and polished, while staying human — not stiff",
        warm: "warmer and more personal, emphasizing emotion and closeness",
        short: "significantly shorter and punchier, keeping only what matters most",
      }[tone];
      return `You are a sensitive editor of personal letters. Rewrite the following text to be ${instruction}. Keep the original meaning and facts, don't change the recipient's name or key details. Write exclusively in English.

Original text:
${text}

Return strict JSON format with no markdown blocks, just a plain JSON object with exactly one version:
{ "versions": [{ "label": string, "content": string }] }`;
    },
  },
};

export async function POST(req: NextRequest) {
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

  const body = await req.json() as { content?: string; tone?: string };
  const { content, tone } = body;

  if (!isTone(tone)) {
    return NextResponse.json({ error: copy.invalidAiResponse }, { status: 400 });
  }

  const paragraphs = htmlToParagraphs(content);
  if (paragraphs.length === 0) {
    return NextResponse.json({ error: copy.missingInput }, { status: 400 });
  }

  const prompt = copy.buildPrompt(tone, paragraphs.join("\n\n"));

  const result = await requestVersionsFromOpenRouter(prompt);
  if (!result.ok) {
    const error = result.reason === "invalid_response" ? copy.invalidAiResponse : copy.aiConnectionFailed;
    return NextResponse.json({ error }, { status: 500 });
  }

  // The prompt asks for exactly one version — fall back to the tone's own
  // label if the model didn't label it the way we asked.
  const versions = result.versions.length > 0
    ? [{ label: copy.label[tone], content: result.versions[0].content }]
    : [];

  return NextResponse.json({ versions });
}
