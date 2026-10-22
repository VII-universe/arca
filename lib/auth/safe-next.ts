// Where to send someone after signing in. Only same-site paths are allowed —
// "/dashboard/arca/new" yes; "//evil.com", "/\\evil.com" or "@evil.com" no
// (the callback builds `${origin}${next}`, and "https://host@evil.com" is a
// redirect to evil.com). Kept dependency-free: proxy.ts imports it.

export const NEXT_COOKIE = "arca_next";

export function safeNextPath(value: string | null | undefined): string | null {
  if (!value) return null;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return null;
  return value;
}
