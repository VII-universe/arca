"use client";

import { useState, useTransition } from "react";
import { sendSanctuaryInvitation } from "@/app/actions/delivery";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Pack {
  id: string;
  title: string;
  livingLinkHash: string;
}

interface Props {
  personId: string;         // Recipient ID
  personEmail: string | null;
  packs: Pack[];
  appUrl: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function DeliverySimulator({ personId, personEmail, packs, appUrl }: Props) {
  const [selectedPackId, setSelectedPackId] = useState(packs[0]?.id ?? "");
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<"idle" | "ok" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [copied, setCopied] = useState(false);

  const selectedPack = packs.find((p) => p.id === selectedPackId) ?? packs[0];
  const sanctuaryUrl = selectedPack
    ? `${appUrl}/s/${selectedPack.livingLinkHash}`
    : null;

  function copyUrl() {
    if (!sanctuaryUrl) return;
    navigator.clipboard.writeText(sanctuaryUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleSend() {
    if (!selectedPack || !personEmail) return;
    setStatus("idle");
    setErrorMsg("");
    startTransition(async () => {
      const res = await sendSanctuaryInvitation(selectedPack.id, personId);
      if ("error" in res) {
        setStatus("error");
        setErrorMsg(res.error);
      } else {
        setStatus("ok");
      }
    });
  }

  if (!packs.length) return null;

  return (
    <div className="arca-card" style={{ border: "1px dashed var(--hairline)", background: "var(--bg-tint)" }}>
      <div style={{ padding: "18px 20px" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--accent)", flexShrink: 0 }}>
            <path d="M22 2L11 13"/>
            <path d="M22 2L15 22l-4-9-9-4 20-7z"/>
          </svg>
          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--accent)" }}>
            Simulovat doručení
          </span>
          <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 4, background: "var(--accent)", color: "var(--bg)", fontWeight: 600, letterSpacing: "0.05em", marginLeft: 2 }}>
            TEST
          </span>
        </div>

        {/* Pack selector (only when multiple packs) */}
        {packs.length > 1 && (
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 11, color: "var(--muted)", display: "block", marginBottom: 4 }}>
              Schránka
            </label>
            <select
              value={selectedPackId}
              onChange={(e) => { setSelectedPackId(e.target.value); setStatus("idle"); }}
              className="arca-input"
              style={{ fontSize: 12, padding: "6px 10px", width: "100%" }}
            >
              {packs.map((p) => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
          </div>
        )}

        {/* Sanctuary URL */}
        {sanctuaryUrl && (
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 11, color: "var(--muted)", display: "block", marginBottom: 4 }}>
              Odkaz na Svatyni
            </label>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{
                flex: 1,
                fontSize: 11,
                fontFamily: "var(--f-mono, monospace)",
                color: "var(--ink)",
                background: "var(--surface-1, var(--bg))",
                border: "1px solid var(--hairline)",
                borderRadius: 6,
                padding: "6px 10px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}>
                {sanctuaryUrl}
              </div>
              <button
                onClick={copyUrl}
                className="arca-btn sm arca-btn--ghost"
                style={{ flexShrink: 0, fontSize: 11, padding: "5px 10px" }}
              >
                {copied ? "✓" : "Kopírovat"}
              </button>
            </div>
          </div>
        )}

        {/* Recipient email */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 11, color: "var(--muted)", display: "block", marginBottom: 4 }}>
            Odeslat na
          </label>
          <div style={{
            fontSize: 12,
            color: personEmail ? "var(--ink)" : "var(--muted)",
            fontStyle: personEmail ? "normal" : "italic",
          }}>
            {personEmail ?? "Příjemce nemá e-mailovou adresu"}
          </div>
        </div>

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={pending || !personEmail}
          className="arca-btn sm arca-btn--primary"
          style={{ width: "100%", justifyContent: "center", opacity: pending || !personEmail ? 0.55 : 1 }}
        >
          {pending ? "Odesílám…" : "Odeslat testovací e-mail"}
        </button>

        {/* Status feedback */}
        {status === "ok" && (
          <p style={{ fontSize: 12, color: "#2d9e5c", margin: "10px 0 0", display: "flex", alignItems: "center", gap: 5 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
            E-mail byl odeslán na {personEmail}
          </p>
        )}
        {status === "error" && (
          <p style={{ fontSize: 12, color: "var(--destructive, #e05454)", margin: "10px 0 0" }}>
            {errorMsg}
          </p>
        )}

      </div>
    </div>
  );
}
