import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ webhookSecret: string }> }
) {
  const { webhookSecret } = await params;

  if (!webhookSecret) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
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
