"use client";

import { useState } from "react";

const IcCopy = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
  </svg>
);
const IcCheck = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12l4 4 10-10"/>
  </svg>
);
const IcLink = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
  </svg>
);

export default function HeartbeatWidget({ webhookSecret, appUrl }: { webhookSecret: string; appUrl: string }) {
  const [copied, setCopied] = useState(false);
  const url = `${appUrl}/api/heartbeat/${webhookSecret}`;

  async function copy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div>
        <div className="arca-sub" style={{ fontSize: 12.5, marginBottom: 10 }}>
          Pošli požadavek na tuto URL z jakékoliv automatizace a resetuješ svůj časovač.
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--bg-tint)", borderRadius: "var(--r-md)", padding: "10px 14px", border: "1px solid var(--hairline)" }}>
          <code className="arca-mono" style={{ flex: 1, fontSize: 11, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {url}
          </code>
          <button
            onClick={copy}
            className="arca-btn sm arca-btn--ghost"
            style={{ flexShrink: 0, padding: "4px 8px", color: copied ? "var(--sage)" : "var(--muted)" }}
            aria-label="Kopírovat URL"
          >
            {copied ? <IcCheck /> : <IcCopy />}
          </button>
        </div>
      </div>

      <a
        href="https://uptimerobot.com"
        target="_blank"
        rel="noopener noreferrer"
        style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--muted)", textDecoration: "none" }}
      >
        <IcLink /> Nastavit přes UptimeRobot (zdarma)
      </a>
    </div>
  );
}
