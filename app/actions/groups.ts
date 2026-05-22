"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";

async function requireUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// ── createGroup ───────────────────────────────────────────────────────────────

export async function createGroup(data: {
  name: string;
  color: string;
  emoji?: string;
}): Promise<{ id: string; name: string; color: string; emoji: string | null } | { error: string }> {
  const user = await requireUser();
  if (!user) return { error: "Unauthorized" };
  if (!data.name.trim()) return { error: "Název skupiny je povinný." };

  const group = await prisma.contactGroup.create({
    data: {
      userId: user.id,
      name: data.name.trim(),
      color: data.color,
      emoji: data.emoji?.trim() || null,
    },
    select: { id: true, name: true, color: true, emoji: true },
  });

  revalidatePath("/dashboard/vault");
  revalidatePath("/dashboard/guardians");
  return group;
}

// ── updateGroup ───────────────────────────────────────────────────────────────

export async function updateGroup(
  groupId: string,
  data: { name?: string; color?: string; emoji?: string | null }
): Promise<{ ok: true } | { error: string }> {
  const user = await requireUser();
  if (!user) return { error: "Unauthorized" };

  const existing = await prisma.contactGroup.findFirst({
    where: { id: groupId, userId: user.id },
    select: { id: true },
  });
  if (!existing) return { error: "Skupina nenalezena." };

  await prisma.contactGroup.update({
    where: { id: groupId },
    data: {
      ...(data.name !== undefined ? { name: data.name.trim() } : {}),
      ...(data.color !== undefined ? { color: data.color } : {}),
      ...(data.emoji !== undefined ? { emoji: data.emoji?.trim() || null } : {}),
    },
  });

  revalidatePath("/dashboard/vault");
  revalidatePath("/dashboard/guardians");
  return { ok: true };
}

// ── deleteGroup ───────────────────────────────────────────────────────────────

export async function deleteGroup(
  groupId: string
): Promise<{ ok: true } | { error: string }> {
  const user = await requireUser();
  if (!user) return { error: "Unauthorized" };

  const existing = await prisma.contactGroup.findFirst({
    where: { id: groupId, userId: user.id },
    select: { id: true },
  });
  if (!existing) return { error: "Skupina nenalezena." };

  // cascade via onDelete: SetNull — recipients/guardians lose groupId automatically
  await prisma.contactGroup.delete({ where: { id: groupId } });

  revalidatePath("/dashboard/vault");
  revalidatePath("/dashboard/guardians");
  return { ok: true };
}

// ── assignPersonGroup ─────────────────────────────────────────────────────────
// Assigns a group to the "canonical person" — updates all recipient records
// sharing the same email (or name if no email) so deduplication stays consistent.

export async function assignPersonGroup(
  canonicalRecipientId: string,
  groupId: string | null
): Promise<{ ok: true } | { error: string }> {
  const user = await requireUser();
  if (!user) return { error: "Unauthorized" };

  const recipient = await prisma.recipient.findFirst({
    where: { id: canonicalRecipientId, messagePack: { ownerId: user.id } },
    select: { id: true, email: true, name: true },
  });
  if (!recipient) return { error: "Příjemce nenalezen." };

  // Verify group belongs to user (if assigning, not clearing)
  if (groupId) {
    const group = await prisma.contactGroup.findFirst({
      where: { id: groupId, userId: user.id },
      select: { id: true },
    });
    if (!group) return { error: "Skupina nenalezena." };
  }

  const whereClause = recipient.email
    ? { email: recipient.email, messagePack: { ownerId: user.id } }
    : { name: recipient.name, email: null, messagePack: { ownerId: user.id } };

  await prisma.recipient.updateMany({
    where: whereClause,
    data: { groupId },
  });

  revalidatePath("/dashboard/vault");
  return { ok: true };
}

// ── assignGuardianGroup ───────────────────────────────────────────────────────

export async function assignGuardianGroup(
  guardianId: string,
  groupId: string | null
): Promise<{ ok: true } | { error: string }> {
  const user = await requireUser();
  if (!user) return { error: "Unauthorized" };

  const guardian = await prisma.guardian.findFirst({
    where: { id: guardianId, userId: user.id },
    select: { id: true },
  });
  if (!guardian) return { error: "Strážce nenalezen." };

  if (groupId) {
    const group = await prisma.contactGroup.findFirst({
      where: { id: groupId, userId: user.id },
      select: { id: true },
    });
    if (!group) return { error: "Skupina nenalezena." };
  }

  await prisma.guardian.update({
    where: { id: guardianId },
    data: { groupId },
  });

  revalidatePath("/dashboard/guardians");
  return { ok: true };
}
