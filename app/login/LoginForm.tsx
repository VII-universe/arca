"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Mode = "login" | "signup";

const ERROR_MESSAGES: Record<string, string> = {
  missing_code: "Authentication link was invalid. Please try again.",
  auth_failed: "Authentication failed. Please try again.",
};

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlError = searchParams.get("error");

  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<{
    type: "error" | "success";
    message: string;
  } | null>(
    urlError
      ? { type: "error", message: ERROR_MESSAGES[urlError] ?? "An error occurred." }
      : null
  );
  const [loading, setLoading] = useState(false);

  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    setLoading(true);

    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/api/auth/callback`,
          },
        });

        if (error) throw error;

        setStatus({
          type: "success",
          message: "Check your email for a confirmation link.",
        });
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        // Sync the user to Prisma — fire and forget, dashboard does its own upsert too
        fetch("/api/auth/sync-user", { method: "POST" }).catch(() => {});

        // router.push triggers a soft Next.js navigation so the session cookie
        // is available to the proxy before the new page request goes out.
        router.push("/dashboard");
        router.refresh();
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Something went wrong.";
      setStatus({ type: "error", message });
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-8 shadow-xl">
      {/* Mode tabs */}
      <div className="mb-6 flex rounded-lg bg-neutral-800 p-1 text-sm font-medium">
        {(["login", "signup"] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => { setMode(m); setStatus(null); }}
            className={`flex-1 rounded-md py-1.5 transition-colors ${
              mode === m
                ? "bg-neutral-100 text-neutral-900"
                : "text-neutral-400 hover:text-neutral-200"
            }`}
          >
            {m === "login" ? "Log In" : "Sign Up"}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1">
          <label htmlFor="email" className="text-xs font-medium text-neutral-400 uppercase tracking-wider">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-600 outline-none focus:border-neutral-500 focus:ring-1 focus:ring-neutral-500 transition-colors"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="password" className="text-xs font-medium text-neutral-400 uppercase tracking-wider">
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            minLength={8}
            className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-600 outline-none focus:border-neutral-500 focus:ring-1 focus:ring-neutral-500 transition-colors"
          />
          {mode === "signup" && (
            <p className="text-xs text-neutral-500">Minimum 8 characters.</p>
          )}
        </div>

        {status && (
          <div
            className={`rounded-lg px-3 py-2.5 text-sm ${
              status.type === "error"
                ? "bg-red-950 border border-red-800 text-red-300"
                : "bg-emerald-950 border border-emerald-800 text-emerald-300"
            }`}
          >
            {status.message}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-neutral-100 py-2.5 text-sm font-semibold text-neutral-900 hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading
            ? "Please wait…"
            : mode === "login"
            ? "Log In"
            : "Create Account"}
        </button>
      </form>
    </div>
  );
}
