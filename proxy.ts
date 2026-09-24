import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { LOCALES, DEFAULT_LOCALE, LOCALE_COOKIE, type Locale } from "@/i18n/config";

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
const PUBLIC_PREFIXES = ["/arca/", "/api/auth/", "/api/cron/", "/api/health", "/api/heartbeat/", "/api/guardians/action", "/api/stripe/webhook", "/guardian/"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

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
