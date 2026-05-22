import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  // Auth check — only logged-in users
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as {
    recipientName?: string;
    relationship?: string;
    occasion?: string;
    userNotes?: string;
    existingContent?: string;
  };

  const { recipientName = "blízký člověk", relationship, occasion = "osobní zpráva", userNotes = "", existingContent } = body;

  if (!userNotes && !existingContent) {
    return NextResponse.json({ error: "Zadej alespoň pár slov nebo myšlenek." }, { status: 400 });
  }

  const prompt = `Jsi citlivý, empatický asistent, který pomáhá lidem formulovat hluboké osobní zprávy pro jejich blízké.
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
{ "versions": [{ "label": string, "content": string }] }`;

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
      return NextResponse.json({ error: "AI vrátila neplatnou odpověď. Zkus to znovu." }, { status: 500 });
    }

    return NextResponse.json(parsed);
  } catch (err) {
    console.error("[ai-assist] Anthropic error:", err);
    return NextResponse.json({ error: "Spojení s AI selhalo. Zkus to za chvíli." }, { status: 500 });
  }
}
