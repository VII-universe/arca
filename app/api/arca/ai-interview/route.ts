import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";
import { LOCALES, DEFAULT_LOCALE, LOCALE_COOKIE, type Locale } from "@/i18n/config";
import { createRateLimiter } from "@/lib/rate-limit";
import { requestJsonFromOpenRouter, type AIVersion } from "@/lib/ai/openrouter";

// Shares its quota with the other AI features (same "ai-assist" Redis
// prefix) — an interview naturally costs more calls per use (up to 5:
// up to 4 question turns + 1 final draft), which appropriately eats more
// of the same per-user hourly budget rather than getting its own.
const aiAssistLimiter = createRateLimiter("ai-assist", 10, "1 h");

// Caps both cost and how long someone can be stuck answering questions —
// after this many answers, the next call always drafts instead of asking.
const MAX_QUESTIONS = 4;

interface InterviewTurn {
  question: string;
  answer: string;
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
  aiConnectionFailed: string;
  invalidAiResponse: string;
  buildQuestionPrompt: (recipientName: string, relationship: string | undefined, occasion: string, turns: InterviewTurn[]) => string;
  buildDraftPrompt: (recipientName: string, relationship: string | undefined, occasion: string, turns: InterviewTurn[]) => string;
}> = {
  cs: {
    tooManyRequests: "Příliš mnoho požadavků na AI asistenta. Zkus to prosím za chvíli.",
    aiConnectionFailed: "Spojení s AI selhalo. Zkus to za chvíli.",
    invalidAiResponse: "AI vrátila neplatnou odpověď. Zkus to znovu.",
    buildQuestionPrompt: (recipientName, relationship, occasion, turns) => `Jsi citlivý, empatický asistent, který vede krátký rozhovor s člověkem, aby mu pomohl zformulovat hlubokou osobní zprávu pro blízkého. Vedeš rozhovor v češtině.

Příjemce zprávy: ${recipientName}${relationship ? ` (${relationship})` : ""}
Příležitost: ${occasion}

Dosavadní rozhovor:
${turns.length > 0 ? turns.map((t, i) => `${i + 1}. Otázka: ${t.question}\n   Odpověď: ${t.answer}`).join("\n") : "(zatím žádný)"}

Polož JEDNU krátkou, konkrétní následující otázku, která pomůže autorovi vybavit si vzpomínku, pocit nebo detail k vyjádření. Nikdy se neptej na nic, na co se už ptal. Buď vřelý, ne klinický.

Vrať striktní JSON bez markdown bloků: { "question": string }`,
    buildDraftPrompt: (recipientName, relationship, occasion, turns) => `Jsi citlivý, empatický asistent. Na základě rozhovoru níže napiš osobní zprávu od autora pro jeho blízkého. Piš v češtině, autenticky, bez klišé.

Příjemce: ${recipientName}${relationship ? ` (${relationship})` : ""}
Příležitost: ${occasion}

Rozhovor (otázky a autorovy odpovědi, ze kterých musíš čerpat skutečné detaily):
${turns.map((t, i) => `${i + 1}. Otázka: ${t.question}\n   Odpověď: ${t.answer}`).join("\n")}

Navrhni 2 odlišné verze zprávy, které vycházejí z toho, co autor skutečně řekl (nevymýšlej si fakta, co nezazněla):
1. Kratší (1 odstavec)
2. Delší (2 odstavce)

Vrať striktní JSON formát bez markdown bloků, pouze čistý JSON objekt:
{ "versions": [{ "label": string, "content": string }] }`,
  },
  en: {
    tooManyRequests: "Too many requests to the AI assistant. Please try again shortly.",
    aiConnectionFailed: "Connecting to the AI failed. Please try again shortly.",
    invalidAiResponse: "The AI returned an invalid response. Please try again.",
    buildQuestionPrompt: (recipientName, relationship, occasion, turns) => `You are a sensitive, empathetic assistant having a short conversation with someone to help them put a deep personal message for a loved one into words. Conduct the conversation in English.

Message recipient: ${recipientName}${relationship ? ` (${relationship})` : ""}
Occasion: ${occasion}

Conversation so far:
${turns.length > 0 ? turns.map((t, i) => `${i + 1}. Question: ${t.question}\n   Answer: ${t.answer}`).join("\n") : "(none yet)"}

Ask ONE short, specific next question that helps the author recall a memory, feeling, or detail worth expressing. Never ask something already asked. Be warm, not clinical.

Return strict JSON with no markdown blocks: { "question": string }`,
    buildDraftPrompt: (recipientName, relationship, occasion, turns) => `You are a sensitive, empathetic assistant. Based on the conversation below, write a personal message from the author to their loved one. Write in English, authentically, without clichés.

Recipient: ${recipientName}${relationship ? ` (${relationship})` : ""}
Occasion: ${occasion}

Conversation (questions and the author's answers — draw real details from these, don't invent facts not mentioned):
${turns.map((t, i) => `${i + 1}. Question: ${t.question}\n   Answer: ${t.answer}`).join("\n")}

Suggest 2 distinct versions of the message, grounded in what the author actually said:
1. Shorter (1 paragraph)
2. Longer (2 paragraphs)

Return strict JSON format with no markdown blocks, just a plain JSON object:
{ "versions": [{ "label": string, "content": string }] }`,
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

  const body = await req.json() as {
    recipientName?: string;
    relationship?: string;
    occasion?: string;
    turns?: InterviewTurn[];
    finishNow?: boolean;
  };

  const recipientName = body.recipientName?.trim() || (locale === "cs" ? "blízký člověk" : "a loved one");
  const relationship = body.relationship;
  const occasion = body.occasion?.trim() || (locale === "cs" ? "osobní zpráva" : "a personal message");
  const turns = (body.turns ?? []).filter((t) => t.question && t.answer?.trim());

  const shouldDraft = body.finishNow === true || turns.length >= MAX_QUESTIONS;

  if (shouldDraft) {
    if (turns.length === 0) {
      return NextResponse.json({ error: copy.invalidAiResponse }, { status: 400 });
    }
    const prompt = copy.buildDraftPrompt(recipientName, relationship, occasion, turns);
    const result = await requestJsonFromOpenRouter<{ versions: AIVersion[] }>(prompt);
    if (!result.ok || !Array.isArray(result.data.versions)) {
      const error = result.ok ? copy.invalidAiResponse : (result.reason === "invalid_response" ? copy.invalidAiResponse : copy.aiConnectionFailed);
      return NextResponse.json({ error }, { status: 500 });
    }
    return NextResponse.json({ type: "draft", versions: result.data.versions });
  }

  const prompt = copy.buildQuestionPrompt(recipientName, relationship, occasion, turns);
  const result = await requestJsonFromOpenRouter<{ question: string }>(prompt);
  if (!result.ok || typeof result.data.question !== "string" || !result.data.question.trim()) {
    const error = result.ok ? copy.invalidAiResponse : (result.reason === "invalid_response" ? copy.invalidAiResponse : copy.aiConnectionFailed);
    return NextResponse.json({ error }, { status: 500 });
  }
  return NextResponse.json({ type: "question", question: result.data.question.trim() });
}
