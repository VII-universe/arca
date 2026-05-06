import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const checks: Record<string, string> = {
    DATABASE_URL: process.env.DATABASE_URL
      ? `pooler: ${process.env.DATABASE_URL.split("@")[1]?.split("/")[0] ?? "?"}`
      : "❌ MISSING",
    SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL
      ? `✓ ${process.env.NEXT_PUBLIC_SUPABASE_URL}`
      : "❌ MISSING",
    SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
      ? `✓ ${process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.slice(0, 20)}…`
      : "❌ MISSING",
    SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? "✓ set" : "❌ MISSING",
    CRON_SECRET: process.env.CRON_SECRET ? "✓ set" : "❌ MISSING",
    SITE_URL: process.env.NEXT_PUBLIC_SITE_URL ?? "not set",
    NODE_ENV: process.env.NODE_ENV ?? "unknown",
  };

  // Test Prisma
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.prisma_connection = "✓ OK";
  } catch (e: unknown) {
    checks.prisma_connection = `❌ ${e instanceof Error ? e.message : String(e)}`;
  }

  // Test Prisma User model (query the actual table)
  try {
    const count = await prisma.user.count();
    checks.prisma_users_table = `✓ ${count} users`;
  } catch (e: unknown) {
    checks.prisma_users_table = `❌ ${e instanceof Error ? e.message : String(e)}`;
  }

  // Test Supabase server client creation
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.getUser();
    checks.supabase_server_client = error
      ? `⚠ created but getUser error: ${error.message}`
      : "✓ created, no active session (expected)";
  } catch (e: unknown) {
    checks.supabase_server_client = `❌ THROWS: ${e instanceof Error ? e.message : String(e)}`;
  }

  const hasErrors = Object.values(checks).some((v) => v.startsWith("❌"));
  return NextResponse.json(checks, {
    status: hasErrors ? 500 : 200,
    headers: { "Content-Type": "application/json" },
  });
}
