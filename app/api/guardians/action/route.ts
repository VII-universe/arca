import { NextRequest, NextResponse } from "next/server";
import { APP_URL } from "@/lib/resend";

// This GET endpoint used to execute the guardian's action (confirm-alive /
// release) directly on click — a real bug, not just a UX gap: email
// clients and security scanners (Outlook Safe Links, Gmail prefetch, etc.)
// routinely pre-fetch every link in an email, which could fire an
// IRREVERSIBLE delivery release without any human ever clicking anything.
//
// Fixed by moving the actual mutation behind a POST-only Server Action
// (see app/actions/guardian.ts), triggered from a real confirm button on
// /guardian/action — a GET to that page is read-only and safe to prefetch.
//
// This route now only exists so links from already-sent emails (up to the
// 72h token expiry window from before this change shipped) keep working —
// it just forwards to the new confirmation page instead of acting.
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token") ?? "";
  return NextResponse.redirect(`${APP_URL}/guardian/action?token=${encodeURIComponent(token)}`);
}
