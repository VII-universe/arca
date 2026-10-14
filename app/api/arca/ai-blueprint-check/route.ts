import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";
import { LOCALES, DEFAULT_LOCALE, LOCALE_COOKIE, type Locale } from "@/i18n/config";
import { createRateLimiter } from "@/lib/rate-limit";
import { requestJsonFromOpenRouter } from "@/lib/ai/openrouter";

// Shares its quota with ai-assist/ai-rewrite (same "ai-assist" Redis
// prefix) — same cost center, same abuse surface.
const aiAssistLimiter = createRateLimiter("ai-assist", 10, "1 h");

const CATEGORIES = ["SUBSCRIPTION", "DOCUMENT", "INSTRUCTION", "PROPERTY"] as const;
type BlueprintCategory = (typeof CATEGORIES)[number];
function isCategory(value: unknown): value is BlueprintCategory {
  return typeof value === "string" && (CATEGORIES as readonly string[]).includes(value);
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

export interface BlueprintSuggestion {
  category: BlueprintCategory;
  title: string;
  why: string;
}

const COPY: Record<Locale, {
  tooManyRequests: string;
  aiConnectionFailed: string;
  invalidAiResponse: string;
  buildPrompt: (items: { category: string; title: string }[]) => string;
}> = {
  cs: {
    tooManyRequests: "Příliš mnoho požadavků na AI asistenta. Zkus to prosím za chvíli.",
    aiConnectionFailed: "Spojení s AI selhalo. Zkus to za chvíli.",
    invalidAiResponse: "AI vrátila neplatnou odpověď. Zkus to znovu.",
    buildPrompt: (items) => `Jsi pečlivý asistent, který pomáhá lidem připravit si "plán pro případ nouze" — přehled praktických informací (předplatná, dokumenty, nemovitosti, instrukce) pro své blízké.

Uživatel už má tyto položky (pouze kategorie a název, OBSAH NEPOSÍLÁM z důvodu soukromí):
${items.length > 0 ? items.map(i => `- [${i.category}] ${i.title}`).join("\n") : "(zatím žádné položky)"}

Platné kategorie jsou přesně: SUBSCRIPTION (předplatná/účty), DOCUMENT (dokumenty), PROPERTY (nemovitosti/majetek), INSTRUCTION (instrukce/pokyny).

Navrhni až 5 běžně opomíjených položek, které uživateli pravděpodobně chybí (např. banka, pojištění, domácí mazlíček, digitální účty, poslední vůle, klíče/schránka, zaměstnavatel). Nenavrhuj nic, co už v seznamu je (ani podobné). Buď konkrétní a stručný — "why" max 1 věta vysvětlující, proč na to lidé často zapomínají.

Vrať striktní JSON formát bez markdown bloků, pouze čistý JSON objekt:
{ "suggestions": [{ "category": string, "title": string, "why": string }] }`,
  },
  en: {
    tooManyRequests: "Too many requests to the AI assistant. Please try again shortly.",
    aiConnectionFailed: "Connecting to the AI failed. Please try again shortly.",
    invalidAiResponse: "The AI returned an invalid response. Please try again.",
    buildPrompt: (items) => `You are a careful assistant helping people prepare an "emergency plan" — a practical-info overview (subscriptions, documents, property, instructions) for their loved ones.

The user already has these items (category and title only, NOT sending the actual content for privacy):
${items.length > 0 ? items.map(i => `- [${i.category}] ${i.title}`).join("\n") : "(no items yet)"}

Valid categories are exactly: SUBSCRIPTION, DOCUMENT, PROPERTY, INSTRUCTION.

Suggest up to 5 commonly overlooked items the user likely still needs (e.g. bank accounts, insurance, a pet, digital accounts, a will, keys/safe deposit box, employer). Don't suggest anything already in the list (or close to it). Be specific and concise — "why" is at most one sentence explaining why people often forget this.

Return strict JSON format with no markdown blocks, just a plain JSON object:
{ "suggestions": [{ "category": string, "title": string, "why": string }] }`,
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

  // Only category + title are ever accepted here — never the item's
  // content (passwords, account numbers, etc.). Ignored even if a client
  // sent it.
  const body = await req.json() as { items?: { category?: string; title?: string }[] };
  const items = (body.items ?? [])
    .filter((i): i is { category: string; title: string } => isCategory(i.category) && typeof i.title === "string" && i.title.length > 0)
    .map((i) => ({ category: i.category, title: i.title }));

  const prompt = copy.buildPrompt(items);

  const result = await requestJsonFromOpenRouter<{ suggestions: BlueprintSuggestion[] }>(prompt);
  if (!result.ok) {
    const error = result.reason === "invalid_response" ? copy.invalidAiResponse : copy.aiConnectionFailed;
    return NextResponse.json({ error }, { status: 500 });
  }

  const suggestions = (result.data.suggestions ?? []).filter((s) => isCategory(s.category) && s.title && s.why);
  return NextResponse.json({ suggestions });
}
