import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { LOCALES, DEFAULT_LOCALE, LOCALE_COOKIE, LOCALE_HEADER, type Locale } from "@/i18n/config";
import { MARKETING_LOCALE_PATHS, isMarketingPath } from "@/lib/marketing/paths";

// i18n first-visit language detection — "without i18n routing" (see the i18n
// design review), so this only ever sets a cookie, never redirects or
// changes the URL. Runs before anything else in this file so it applies
// uniformly, including on the public/short-circuited paths below.
function pickLocaleFromAcceptLanguage(header: string | null): Locale {
  if (!header) return DEFAULT_LOCALE;
  const preferred = header
    .split(",")
    .map((part) => part.split(";")[0].trim().toLowerCase().slice(0, 2));
  for (const lang of preferred) {
    if ((LOCALES as readonly string[]).includes(lang)) return lang as Locale;
  }
  return DEFAULT_LOCALE;
}
function applyLocaleCookie(request: NextRequest, response: NextResponse) {
  if (!request.cookies.has(LOCALE_COOKIE)) {
    const locale = pickLocaleFromAcceptLanguage(request.headers.get("accept-language"));
    response.cookies.set(LOCALE_COOKIE, locale, { maxAge: 60 * 60 * 24 * 365, path: "/" });
  }
}

const PROTECTED_PATHS = ["/dashboard"];
const AUTH_PATHS = ["/login"];
// These paths are fully public — no auth check, no Supabase client needed.
const PUBLIC_PREFIXES = [
  "/arca/", "/api/auth/", "/api/cron/", "/api/health", "/api/heartbeat/", "/api/guardians/action", "/api/arca/translate-content", "/api/stripe/webhook", "/guardian/", "/contribute/", "/monitoring",
  // Next.js-generated SEO/metadata routes — fetched by crawlers and social
  // media scrapers, never by a logged-in user, so skip the Supabase lookup.
  "/icon", "/apple-icon", "/opengraph-image", "/robots.txt", "/sitemap.xml",
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Marketing pages: no auth check (nothing there depends on the session,
  // and skipping getUser() saves a Supabase round trip on every landing
  // visit). The render locale is pinned via LOCALE_HEADER — the explicit
  // /en or /cs path wins, otherwise cookie, otherwise Accept-Language, so
  // even a first visit renders in the visitor's language rather than the
  // default.
  if (isMarketingPath(pathname)) {
    const pathLocale = MARKETING_LOCALE_PATHS[pathname];
    const cookieLocale = request.cookies.get(LOCALE_COOKIE)?.value;
    const locale: Locale =
      pathLocale ??
      ((LOCALES as readonly string[]).includes(cookieLocale ?? "")
        ? (cookieLocale as Locale)
        : pickLocaleFromAcceptLanguage(request.headers.get("accept-language")));
    const headers = new Headers(request.headers);
    headers.set(LOCALE_HEADER, locale);
    const res = NextResponse.next({ request: { headers } });
    // An explicit language URL is a language choice — remember it for the
    // rest of the site (login etc.); "/" only fills in a missing cookie.
    if (pathLocale || !request.cookies.has(LOCALE_COOKIE)) {
      res.cookies.set(LOCALE_COOKIE, locale, { maxAge: 60 * 60 * 24 * 365, path: "/" });
    }
    return res;
  }

  // Short-circuit for public routes before touching Supabase auth
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    const res = NextResponse.next();
    applyLocaleCookie(request, res);
    return res;
  }

  let supabaseResponse = NextResponse.next({ request });

  // Defensive: if Supabase env vars are missing, fail open (redirect to login)
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    console.error("[proxy] Supabase env vars missing");
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    const res = NextResponse.redirect(url);
    applyLocaleCookie(request, res);
    return res;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // getUser() validates the JWT with the Supabase server — wrap in try-catch
  // so a network error or SDK bug doesn't bubble up as an unhandled crash
  // (which would show Vercel's generic "This page couldn't load" error).
  let user: { id: string } | null = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch (err) {
    console.error("[proxy] getUser threw:", err);
    // Fail safe: treat as unauthenticated — redirect to login for protected routes
  }

  // Redirect unauthenticated users away from protected routes
  if (!user && PROTECTED_PATHS.some((p) => pathname.startsWith(p))) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    const res = NextResponse.redirect(url);
    applyLocaleCookie(request, res);
    return res;
  }

  // Redirect authenticated users away from auth pages
  if (user && AUTH_PATHS.some((p) => pathname.startsWith(p))) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    const res = NextResponse.redirect(url);
    applyLocaleCookie(request, res);
    return res;
  }

  applyLocaleCookie(request, supabaseResponse);
  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
