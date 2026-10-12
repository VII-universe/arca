// Same fallback chain used elsewhere in the app (see app/actions/settings.ts)
// for the one canonical public URL — used by robots.ts, sitemap.ts, and the
// root layout's metadataBase.
//
// Deliberately `||`, not `??`: these vars can be set to an empty string (not
// just unset) in this environment's current .env.local, and `??` treats ""
// as a defined value, which produced `new URL("")` crashing the build.
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
