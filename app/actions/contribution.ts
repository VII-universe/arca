"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";
import { APP_URL } from "@/lib/resend";

const INVITE_EXPIRY_HOURS = 72; // same window as GuardianToken

// ─── Owner side — authenticated ──────────────────────────────────────────────

export async function createContributionInvite(
  packId: string
): Promise<{ ok: true; url: string } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const pack = await prisma.messagePack.findFirst({
    where: { id: packId, ownerId: user.id },
    select: { id: true },
  });
  if (!pack) return { error: "Pack not found" };

  const invite = await prisma.contributionInvite.create({
    data: {
      messagePackId: pack.id,
      expiresAt: new Date(Date.now() + INVITE_EXPIRY_HOURS * 60 * 60 * 1000),
    },
    select: { token: true },
  });

  return { ok: true, url: `${APP_URL}/contribute/${invite.token}` };
}

// ─── Contributor side — public, no login ─────────────────────────────────────
// A contributor is never a logged-in app user — same trust model as
// guardian tokens: the single-use, unguessable token IS the auth.

export type ContributionInvitePreview =
  | { status: "invalid" | "already_used" | "expired" }
  | { status: "valid"; ownerName: string; packTitle: string };

export async function getContributionInvitePreview(token: string): Promise<ContributionInvitePreview> {
  const invite = await prisma.contributionInvite.findUnique({
    where: { token },
    select: {
      usedAt: true,
      expiresAt: true,
      messagePack: { select: { title: true, owner: { select: { name: true } } } },
    },
  });

  if (!invite) return { status: "invalid" };
  if (invite.usedAt) return { status: "already_used" };
  if (invite.expiresAt < new Date()) return { status: "expired" };

  return { status: "valid", ownerName: invite.messagePack.owner.name, packTitle: invite.messagePack.title };
}

export async function submitContribution(token: string, formData: FormData): Promise<void> {
  const authorName = (formData.get("authorName") as string | null)?.trim();
  const content = (formData.get("content") as string | null)?.trim();

  const invite = await prisma.contributionInvite.findUnique({
    where: { token },
    select: { id: true, usedAt: true, expiresAt: true, messagePackId: true },
  });

  if (!invite || invite.usedAt || invite.expiresAt < new Date() || !authorName || !content) {
    redirect(`/contribute/${token}?status=error`);
  }

  await prisma.$transaction([
    prisma.contribution.create({
      data: { messagePackId: invite.messagePackId, authorName, content },
    }),
    prisma.contributionInvite.update({
      where: { id: invite.id },
      data: { usedAt: new Date() },
    }),
  ]);

  redirect(`/contribute/${token}?status=done`);
}
