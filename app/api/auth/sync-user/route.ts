import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";

async function syncUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;

  const { id, email, user_metadata } = user;

  await prisma.user.upsert({
    where: { id },
    update: { email: email ?? "", lastActiveAt: new Date() },
    create: {
      id,
      email: email ?? "",
      name: user_metadata?.full_name ?? email?.split("@")[0] ?? "User",
      lastActiveAt: new Date(),
    },
  });

  return user;
}

// GET — handles browser redirects (e.g. after email confirmation)
export async function GET(request: NextRequest) {
  const next = request.nextUrl.searchParams.get("next") ?? "/dashboard";
  const user = await syncUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.redirect(new URL(next, request.url));
}

// POST — called programmatically after password sign-in
export async function POST() {
  const user = await syncUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({ ok: true });
}
