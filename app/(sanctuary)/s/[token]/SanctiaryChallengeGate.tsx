"use client";

import { useState, useTransition } from "react";
import { verifySanctuaryChallengeAnswer } from "@/app/actions/sanctuary";

interface Props {
  packId: string;
  token: string;
  question: string;
}

export default function SanctiaryChallengeGate({ packId, token, question }: Props) {
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await verifySanctuaryChallengeAnswer(packId, token, answer);
      if (res?.error) setError(res.error);
    });
  }

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "40px 24px",
      animation: "sancFadeIn 1.8s ease both",
    }}>

      {/* Seal */}
      <div style={{ marginBottom: 40, opacity: 0.3 }}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
          <path d="M5 18c0-7 3-12 7-12s7 5 7 12" stroke="#f5f0df" strokeWidth="1.5" strokeLinecap="round"/>
          <circle cx="12" cy="19" r="1.5" fill="#c9a96e"/>
        </svg>
      </div>

      <div style={{ maxWidth: 440, width: "100%", textAlign: "center" }}>

        {/* Label */}
        <p style={{
          fontSize: 11,
          letterSpacing: "0.3em",
          textTransform: "uppercase" as const,
          color: "#a1a1aa",
          fontFamily: "var(--font-inter), sans-serif",
          marginBottom: 24,
        }}>
          Ověření přístupu
        </p>

        {/* Question */}
        <p style={{
          fontFamily: "var(--font-playfair), Georgia, serif",
          fontStyle: "italic",
          fontSize: "clamp(18px, 4vw, 24px)",
          color: "#f5f0df",
          lineHeight: 1.5,
          marginBottom: 40,
        }}>
          {question}
        </p>

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Tvoje odpověď…"
            autoComplete="off"
            style={{
              width: "100%",
              background: "rgba(245,240,223,0.04)",
              border: "1px solid rgba(245,240,223,0.12)",
              borderRadius: 8,
              padding: "14px 18px",
              fontSize: 16,
              color: "#f5f0df",
              fontFamily: "var(--font-playfair), Georgia, serif",
              outline: "none",
              boxSizing: "border-box" as const,
              marginBottom: error ? 12 : 20,
              transition: "border-color .2s",
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(201,169,110,0.4)"; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(245,240,223,0.12)"; }}
          />

          {error && (
            <p style={{
              fontSize: 13,
              color: "#e87c7c",
              fontFamily: "var(--font-inter), sans-serif",
              marginBottom: 16,
              textAlign: "left" as const,
            }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending || !answer.trim()}
            style={{
              width: "100%",
              background: pending ? "rgba(201,169,110,0.2)" : "rgba(201,169,110,0.12)",
              border: "1px solid rgba(201,169,110,0.25)",
              borderRadius: 8,
              padding: "13px 24px",
              fontSize: 14,
              color: pending ? "#a1a1aa" : "#c9a96e",
              fontFamily: "var(--font-inter), sans-serif",
              letterSpacing: "0.08em",
              cursor: pending ? "not-allowed" : "pointer",
              transition: "all .2s",
            }}
          >
            {pending ? "Ověřuji…" : "Otevřít zprávu"}
          </button>
        </form>

      </div>
    </div>
  );
}
