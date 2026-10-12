import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { createRateLimiter, clientIp } from "@/lib/rate-limit";

// Keyed by IP, not by the attempted secret — the threat here is someone
// brute-forcing webhookSecret values (each guess is a different key, so a
// per-secret limit wouldn't catch that), not a single legitimate caller
// pinging too often. Generous enough for real automation (UptimeRobot etc.
// typically pings at most every ~1 min) while still capping a rapid scan.
const heartbeatLimiter = createRateLimiter("heartbeat", 30, "1 m");

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ webhookSecret: string }> }
) {
  const { webhookSecret } = await params;

  if (!webhookSecret) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  const rate = await heartbeatLimiter.check(clientIp(request));
  if (!rate.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const user = await prisma.user.findUnique({
    where: { webhookSecret },
    select: { id: true },
  });

  if (!user) {
    // Return 200 anyway — don't leak whether the secret exists
    return NextResponse.json({ ok: true });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastActiveAt: new Date() },
  });

  return NextResponse.json({ ok: true, checkedIn: new Date().toISOString() });
}

// Also accept GET so tools like UptimeRobot or simple curl can ping it
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ webhookSecret: string }> }
) {
  return POST(request, context);
}
