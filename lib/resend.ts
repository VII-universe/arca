import { Resend } from "resend";

export const resend = new Resend(process.env.RESEND_API_KEY);

export const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL ?? "Arca <onboarding@resend.dev>";

// NEXT_PUBLIC_SITE_URL = manually set production URL (e.g. https://arca.vercel.app)
// VERCEL_URL           = auto-set by Vercel for every deployment (no https:// prefix)
// Falls back to localhost for local dev.
export const APP_URL = (() => {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
})();
