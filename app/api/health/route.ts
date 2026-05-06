import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";

// Temporary diagnostic route — remove after debugging
export async function GET() {
  const checks: Record<string, string> = {
    DATABASE_URL: process.env.DATABASE_URL
      ? `set (${process.env.DATABASE_URL.split("@")[1]?.split("/")[0] ?? "?"})`
      : "MISSING",
    SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? "set" : "MISSING",
    SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? "set" : "MISSING",
  };

  try {
    const result = await prisma.$queryRaw<[{ ok: number }]>`SELECT 1 AS ok`;
    checks.prisma = `OK (${result[0]?.ok})`;
  } catch (e: unknown) {
    checks.prisma = `ERROR: ${e instanceof Error ? e.message : String(e)}`;
  }

  const allOk = !Object.values(checks).some((v) => v.startsWith("MISSING") || v.startsWith("ERROR"));
  return NextResponse.json(checks, { status: allOk ? 200 : 500 });
}
