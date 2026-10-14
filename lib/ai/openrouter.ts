// Shared OpenRouter call + response parsing for the app's AI features
// (ai-assist compose, ai-rewrite tone variants). Both expect the same
// "versions" JSON shape back from the model, so this is the one place that
// knows how to talk to OpenRouter and unwrap its response.
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_MODEL = "anthropic/claude-sonnet-5.5";

export interface AIVersion {
  label: string;
  content: string;
}

export type OpenRouterVersionsResult =
  | { ok: true; versions: AIVersion[] }
  | { ok: false; reason: "connection" | "invalid_response" };

export async function requestVersionsFromOpenRouter(prompt: string): Promise<OpenRouterVersionsResult> {
  let res: Response;
  try {
    res = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        max_tokens: 1200,
        messages: [{ role: "user", content: prompt }],
      }),
    });
  } catch (err) {
    console.error("[openrouter] fetch failed:", err);
    return { ok: false, reason: "connection" };
  }

  if (!res.ok) {
    console.error("[openrouter] error:", res.status, await res.text());
    return { ok: false, reason: "connection" };
  }

  const message = await res.json() as { choices: { message: { content: string } }[] };
  const raw = message.choices[0]?.message?.content ?? "";
  const cleaned = raw.replace(/^```(?:json)?\n?/m, "").replace(/\n?```$/m, "").trim();

  try {
    const parsed = JSON.parse(cleaned) as { versions: AIVersion[] };
    if (!Array.isArray(parsed.versions)) throw new Error("not an array");
    return { ok: true, versions: parsed.versions };
  } catch {
    return { ok: false, reason: "invalid_response" };
  }
}
