import { Resend } from "resend";

// Lazy singleton — the Resend SDK throws at construction time if the API key
// is missing. Constructing eagerly at module load breaks Next.js build-time
// page data collection for any route that imports this file, even routes
// whose build doesn't actually send an email (e.g. RESEND_API_KEY unset in
// a preview environment). Deferring construction to first real use avoids
// that while keeping runtime behavior identical wherever the key is set.
let _resend: Resend | null = null;
function getResend(): Resend {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}

export const resend = new Proxy({} as Resend, {
  get(_target, prop, receiver) {
    return Reflect.get(getResend(), prop, receiver);
  },
});

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
