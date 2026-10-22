import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";
import { NEXT_COOKIE, safeNextPath } from "@/lib/auth/safe-next";

// This route is called by Supabase after:
//   - Email confirmation (sign-up flow)
//   - Magic link clicks
//   - OAuth redirects
//
// It exchanges the one-time `code` for a session, then ensures a matching
// row exists in our Prisma `User` table (upsert = idempotent, safe to retry).
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // Where to land: an explicit ?next=, else the short-lived cookie the login
  // form sets (e.g. "continue to the composer" after signing up from the
  // landing page — kept out of the Supabase redirect URL so it always matches
  // the allow-list), else the dashboard. Only same-site paths are honoured.
  const cookieStore = await cookies();
  const cookieNext = cookieStore.get(NEXT_COOKIE)?.value;
  const next =
    safeNextPath(searchParams.get("next")) ??
    safeNextPath(cookieNext ? decodeURIComponent(cookieNext) : null) ??
    "/dashboard";

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    console.error("[auth/callback] exchangeCodeForSession failed:", error);
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }

  const { id, email, user_metadata } = data.user;

  // Sync to Prisma — upsert so repeated callbacks (e.g. page refresh) are safe.
  // We use the Supabase UUID as the Prisma `id` so both systems share one identity.
  await prisma.user.upsert({
    where: { id },
    update: {
      // Keep email up-to-date in case user changes it in Supabase
      email: email ?? "",
      lastActiveAt: new Date(),
    },
    create: {
      id,
      email: email ?? "",
      name: user_metadata?.full_name ?? email?.split("@")[0] ?? "User",
      lastActiveAt: new Date(),
    },
  });

  const res = NextResponse.redirect(`${origin}${next}`);
  if (cookieNext) res.cookies.delete(NEXT_COOKIE);
  return res;
}
