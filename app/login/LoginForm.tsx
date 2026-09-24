"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";

type Mode = "login" | "signup";

export default function LoginForm() {
  const t = useTranslations("Auth");
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlError = searchParams.get("error");

  const ERROR_MESSAGES: Record<string, string> = {
    missing_code: t("errors.missing_code"),
    auth_failed: t("errors.auth_failed"),
  };

  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<{ type: "error" | "success"; message: string } | null>(
    urlError ? { type: "error", message: ERROR_MESSAGES[urlError] ?? t("errors.unknown") } : null
  );
  const [loading, setLoading] = useState(false);

  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus(null);
    setLoading(true);

    // Read directly from DOM — browser autofill doesn't always fire React onChange
    const formData = new FormData(e.currentTarget);
    const emailVal = (formData.get("email") as string) || email;
    const passwordVal = (formData.get("password") as string) || password;

    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: emailVal,
          password: passwordVal,
          options: { emailRedirectTo: `${window.location.origin}/api/auth/callback` },
        });
        if (error) throw error;
        setStatus({ type: "success", message: t("status.signupSuccess") });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: emailVal, password: passwordVal });
        if (error) throw error;
        fetch("/api/auth/sync-user", { method: "POST" }).catch(() => {});
        router.push("/dashboard");
        router.refresh();
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t("errors.generic");
      setStatus({ type: "error", message });
      setLoading(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: "var(--surface-2)",
    border: "1px solid var(--hairline-2)",
    borderRadius: "var(--r-md)",
    padding: "10px 14px",
    fontSize: 14,
    color: "var(--ink)",
    outline: "none",
    fontFamily: "var(--f-sans)",
    boxSizing: "border-box",
    transition: "border-color 0.15s, box-shadow 0.15s",
  };

  return (
    <div>
      {/* Mode switcher */}
      <div style={{
        display: "flex",
        padding: 3,
        background: "var(--tint)",
        borderRadius: "var(--r-pill)",
        gap: 3,
        marginBottom: 28,
      }}>
        {(["login", "signup"] as Mode[]).map(m => (
          <button
            key={m}
            onClick={() => { setMode(m); setStatus(null); }}
            style={{
              flex: 1,
              padding: "7px 0",
              borderRadius: "999px",
              border: "none",
              cursor: "pointer",
              fontFamily: "var(--f-sans)",
              fontSize: 13,
              fontWeight: 500,
              transition: "all 0.15s",
              background: mode === m ? "var(--surface-2)" : "transparent",
              color: mode === m ? "var(--ink)" : "var(--muted)",
              boxShadow: mode === m ? "var(--sh-1)" : "none",
            }}
          >
            {m === "login" ? t("form.tabLogin") : t("form.tabSignup")}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Email */}
        <div>
          <label style={{ display: "block", fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)", marginBottom: 6, fontFamily: "var(--f-mono)" }}>
            {t("form.emailLabel")}
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="ty@example.com"
            style={inputStyle}
            onFocus={e => { e.target.style.borderColor = "var(--accent)"; e.target.style.boxShadow = "0 0 0 3px var(--accent-tint)"; }}
            onBlur={e => { e.target.style.borderColor = "var(--hairline-2)"; e.target.style.boxShadow = "none"; }}
          />
        </div>

        {/* Password */}
        <div>
          <label style={{ display: "block", fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)", marginBottom: 6, fontFamily: "var(--f-mono)" }}>
            {t("form.passwordLabel")}
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            minLength={8}
            style={inputStyle}
            onFocus={e => { e.target.style.borderColor = "var(--accent)"; e.target.style.boxShadow = "0 0 0 3px var(--accent-tint)"; }}
            onBlur={e => { e.target.style.borderColor = "var(--hairline-2)"; e.target.style.boxShadow = "none"; }}
          />
          {mode === "signup" && (
            <p style={{ fontSize: 12, color: "var(--muted-2)", marginTop: 5 }}>{t("form.passwordHint")}</p>
          )}
        </div>

        {/* Status message */}
        {status && (
          <div style={{
            borderRadius: "var(--r-md)",
            padding: "10px 14px",
            fontSize: 13,
            background: status.type === "error" ? "rgba(180,30,30,0.08)" : "rgba(60,130,80,0.08)",
            border: `1px solid ${status.type === "error" ? "rgba(180,30,30,0.2)" : "rgba(60,130,80,0.2)"}`,
            color: status.type === "error" ? "#b41e1e" : "#2d7a44",
          }}>
            {status.message}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
            background: "var(--ink)",
            color: "var(--bg)",
            border: "none",
            borderRadius: "var(--r-pill)",
            padding: "12px 0",
            fontSize: 14,
            fontWeight: 600,
            fontFamily: "var(--f-sans)",
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.6 : 1,
            transition: "opacity 0.15s",
            marginTop: 4,
          }}
        >
          {loading
            ? t("form.submitLoading")
            : mode === "login"
            ? t("form.submitLogin")
            : t("form.submitSignup")}
        </button>
      </form>
    </div>
  );
}
