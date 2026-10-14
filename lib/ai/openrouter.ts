// Shared OpenRouter call + JSON response parsing for the app's AI features
// (ai-assist compose, ai-rewrite tone variants, ai-blueprint-check). All of
// them ask the model to return a single strict JSON object (shape varies
// per feature) — this is the one place that knows how to talk to
// OpenRouter and unwrap a markdown-fenced JSON response.
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_MODEL = "anthropic/claude-sonnet-5.5";

export type OpenRouterJsonResult<T> =
  | { ok: true; data: T }
  | { ok: false; reason: "connection" | "invalid_response" };

export async function requestJsonFromOpenRouter<T>(prompt: string): Promise<OpenRouterJsonResult<T>> {
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
    return { ok: true, data: JSON.parse(cleaned) as T };
  } catch {
    return { ok: false, reason: "invalid_response" };
  }
}

export interface AIVersion {
  label: string;
  content: string;
}

export type OpenRouterVersionsResult =
  | { ok: true; versions: AIVersion[] }
  | { ok: false; reason: "connection" | "invalid_response" };

export async function requestVersionsFromOpenRouter(prompt: string): Promise<OpenRouterVersionsResult> {
  const result = await requestJsonFromOpenRouter<{ versions: AIVersion[] }>(prompt);
  if (!result.ok) return result;
  if (!Array.isArray(result.data.versions)) return { ok: false, reason: "invalid_response" };
  return { ok: true, versions: result.data.versions };
}
