// Speech-to-text for VIDEO/AUDIO message content, via OpenRouter's
// multimodal chat completions — not a separate transcription API/provider.
// OpenRouter has no dedicated /audio/transcriptions endpoint; audio input is
// just another content part type on a normal chat completion
// (confirmed against OpenRouter's own OpenAPI spec and a live test call).
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
// A multimodal-capable model — plain text-only models reject audio/video
// content parts outright.
const TRANSCRIBE_MODEL = "google/gemini-3.5-flash-lite";

const TRANSCRIBE_PROMPT = "Transcribe this recording exactly, word for word, in whatever language is spoken. Return only the transcription text, with no commentary, labels, or markdown.";

function audioFormatFromKey(key: string): string {
  const ext = key.split(".").pop()?.toLowerCase() ?? "";
  // OpenRouter's input_audio format field takes a plain format name, not a
  // MIME type or dot-prefixed extension.
  return ext || "mp3";
}

async function callOpenRouterTranscribe(content: unknown[]): Promise<string | null> {
  let res: Response;
  try {
    res = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: TRANSCRIBE_MODEL,
        max_tokens: 4000,
        messages: [{ role: "user", content }],
      }),
    });
  } catch (err) {
    console.error("[transcribe] fetch failed:", err);
    return null;
  }

  if (!res.ok) {
    console.error("[transcribe] OpenRouter error:", res.status, await res.text());
    return null;
  }

  const message = await res.json() as { choices: { message: { content: string } }[] };
  const text = message.choices[0]?.message?.content?.trim();
  return text && text.length > 0 ? text : null;
}

// Audio must be inlined as base64 — OpenRouter doesn't accept a URL for
// input_audio (confirmed in its OpenAPI spec), unlike video.
export async function transcribeAudio(signedUrl: string, s3FileKey: string): Promise<string | null> {
  try {
    const fileRes = await fetch(signedUrl);
    if (!fileRes.ok) return null;
    const buffer = Buffer.from(await fileRes.arrayBuffer());
    const data = buffer.toString("base64");
    const format = audioFormatFromKey(s3FileKey);

    return await callOpenRouterTranscribe([
      { type: "text", text: TRANSCRIBE_PROMPT },
      { type: "input_audio", input_audio: { data, format } },
    ]);
  } catch (err) {
    console.error("[transcribe] audio failed:", err);
    return null;
  }
}

// Video accepts a direct URL — no need to download/inline it.
export async function transcribeVideo(signedUrl: string): Promise<string | null> {
  try {
    return await callOpenRouterTranscribe([
      { type: "text", text: TRANSCRIBE_PROMPT },
      { type: "video_url", video_url: { url: signedUrl } },
    ]);
  } catch (err) {
    console.error("[transcribe] video failed:", err);
    return null;
  }
}
