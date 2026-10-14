import type { Locale } from "@/i18n/config";
import { requestJsonFromOpenRouter } from "./openrouter";

// A short, AI-phrased one-liner shown ALONGSIDE the deterministic, always-
// correct facts on /guardian/action — never instead of them. This is
// supplementary context for an irreversible action, so correctness can
// never depend on the AI call succeeding: callers must always have a
// hardcoded fallback ready and show it if this returns null.
export async function buildGuardianAiSummary(params: {
  locale: Locale;
  action: "CONFIRM_ALIVE" | "RELEASE";
  ownerName: string;
  packTitle: string;
  recipientNames: string[];
}): Promise<string | null> {
  const { locale, action, ownerName, packTitle, recipientNames } = params;

  const prompt = locale === "cs"
    ? `Jsi asistent, který v JEDNÉ krátké, jasné větě v češtině vysvětlí strážci (guardian) ARCA, co se stane, když potvrdí akci. Nic nevymýšlej, drž se přesně zadaných faktů.

Akce: ${action === "CONFIRM_ALIVE" ? "Strážce potvrzuje, že vlastník je v pořádku — doručení se zruší." : "Strážce povoluje OKAMŽITÉ a NEVRATNÉ doručení."}
Vlastník: ${ownerName}
Název zprávy: "${packTitle}"
${action === "RELEASE" ? `Příjemci, kterým bude zpráva doručena: ${recipientNames.length > 0 ? recipientNames.join(", ") : "(žádní příjemci)"}` : ""}

Vrať striktní JSON bez markdown bloků: { "summary": string }`
    : `You are an assistant who explains, in ONE short, clear English sentence, what will happen when an ARCA guardian confirms an action. Don't invent anything, stick strictly to the given facts.

Action: ${action === "CONFIRM_ALIVE" ? "The guardian is confirming the owner is fine — delivery will be cancelled." : "The guardian is authorizing IMMEDIATE and IRREVERSIBLE delivery."}
Owner: ${ownerName}
Message title: "${packTitle}"
${action === "RELEASE" ? `Recipients who will receive the message: ${recipientNames.length > 0 ? recipientNames.join(", ") : "(no recipients)"}` : ""}

Return strict JSON with no markdown blocks: { "summary": string }`;

  try {
    const result = await requestJsonFromOpenRouter<{ summary: string }>(prompt);
    if (result.ok && typeof result.data.summary === "string" && result.data.summary.trim().length > 0) {
      return result.data.summary.trim();
    }
  } catch (err) {
    console.error("[guardian-summary] AI call failed:", err);
  }
  return null;
}
