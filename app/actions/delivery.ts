"use server";

import { revalidatePath } from "next/cache";
import { scryptSync, randomBytes } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";
import { TriggerType, PackStatus, ActivitySource } from "@/lib/prisma/generated";

// ─── Auth helper ──────────────────────────────────────────────────────────────

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

// ─── Challenge answer hashing ─────────────────────────────────────────────────
// Uses scrypt (Node built-in) — no extra deps. The answer is case-folded and
// trimmed so "Buddy" and "buddy " hash to the same value.

function hashAnswer(raw: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(raw.toLowerCase().trim(), salt, 32).toString("hex");
  return `${salt}:${hash}`;
}

// ─── addRecipient ─────────────────────────────────────────────────────────────

export async function addRecipient(
  _prev: { error: string } | null,
  formData: FormData
): Promise<{ error: string } | null> {
  const user = await requireUser();
  if (!user) return { error: "Unauthorized" };

  const packId = formData.get("packId") as string;
  const name = (formData.get("name") as string)?.trim();
  const email = (formData.get("email") as string)?.trim() || null;
  const phone = (formData.get("phone") as string)?.trim() || null;
  const challengeQuestion =
    (formData.get("challengeQuestion") as string)?.trim() || null;
  const challengeAnswer =
    (formData.get("challengeAnswer") as string)?.trim() || null;

  if (!name) return { error: "Name is required." };
  if (!email && !phone)
    return { error: "Provide at least an email or phone number." };

  // Email format sanity check (the real validation is on the client but
  // server-side we guard against crafted requests)
  if (email && !email.includes("@")) return { error: "Email looks invalid." };

  const pack = await prisma.messagePack.findUnique({
    where: { id: packId, ownerId: user.id },
    select: { id: true },
  });
  if (!pack) return { error: "Pack not found." };

  await prisma.recipient.create({
    data: {
      messagePackId: packId,
      name,
      email,
      phone,
      challengeQuestion,
      // Only store a hash when both question and answer are provided
      challengeAnswerHash:
        challengeQuestion && challengeAnswer
          ? hashAnswer(challengeAnswer)
          : null,
    },
  });

  revalidatePath(`/dashboard/arca/${packId}/edit`);
  return null; // null = success
}

// ─── removeRecipient ──────────────────────────────────────────────────────────

export async function removeRecipient(
  recipientId: string
): Promise<{ ok: true } | { error: string }> {
  const user = await requireUser();
  if (!user) return { error: "Unauthorized" };

  const recipient = await prisma.recipient.findFirst({
    where: { id: recipientId, messagePack: { ownerId: user.id } },
    select: { id: true, messagePackId: true },
  });
  if (!recipient) return { error: "Not found." };

  await prisma.recipient.delete({ where: { id: recipient.id } });
  revalidatePath(`/dashboard/arca/${recipient.messagePackId}/edit`);
  return { ok: true };
}

// ─── upsertTrigger ────────────────────────────────────────────────────────────

export async function upsertTrigger(
  packId: string,
  data: {
    type: "SPECIFIC_DATE" | "INACTIVITY";
    executeAtDate?: string | null;
    inactivityDaysLimit?: number | null;
    gracePeriodDays: number;
  }
): Promise<{ ok: true } | { error: string }> {
  const user = await requireUser();
  if (!user) return { error: "Unauthorized" };

  const pack = await prisma.messagePack.findUnique({
    where: { id: packId, ownerId: user.id },
    select: { id: true },
  });
  if (!pack) return { error: "Pack not found." };

  if (data.type === "SPECIFIC_DATE") {
    if (!data.executeAtDate) return { error: "Please select a delivery date." };
    const parsed = new Date(data.executeAtDate);
    if (isNaN(parsed.getTime()))
      return { error: "The date you entered is not valid." };
    if (parsed <= new Date())
      return { error: "Delivery date must be in the future." };
  }

  if (data.type === "INACTIVITY") {
    if (!data.inactivityDaysLimit || data.inactivityDaysLimit < 7)
      return { error: "Minimum inactivity period is 7 days." };
  }

  const payload = {
    type: data.type as TriggerType,
    executeAtDate:
      data.type === "SPECIFIC_DATE" && data.executeAtDate
        ? new Date(data.executeAtDate)
        : null,
    inactivityDaysLimit:
      data.type === "INACTIVITY" ? (data.inactivityDaysLimit ?? null) : null,
    gracePeriodDays: data.gracePeriodDays,
  };

  await prisma.triggerCondition.upsert({
    where: { messagePackId: packId },
    update: payload,
    create: { messagePackId: packId, ...payload },
  });

  revalidatePath(`/dashboard/arca/${packId}/edit`);
  return { ok: true };
}

// ─── activatePack ─────────────────────────────────────────────────────────────

export async function activatePack(
  packId: string
): Promise<{ ok: true } | { error: string }> {
  const user = await requireUser();
  if (!user) return { error: "Unauthorized" };

  const pack = await prisma.messagePack.findUnique({
    where: { id: packId, ownerId: user.id },
    select: {
      status: true,
      _count: { select: { recipients: true } },
      triggerCondition: { select: { id: true } },
    },
  });

  if (!pack) return { error: "Pack not found." };
  if (pack.status !== "DRAFT")
    return { error: "This Arca is already active." };
  if (pack._count.recipients === 0)
    return { error: "Add at least one recipient before activating." };
  if (!pack.triggerCondition)
    return { error: "Configure a delivery trigger before activating." };

  await prisma.messagePack.update({
    where: { id: packId },
    data: { status: PackStatus.ACTIVE },
  });

  revalidatePath(`/dashboard/arca/${packId}/edit`);
  revalidatePath("/dashboard");
  return { ok: true };
}

// ─── cancelDelivery ───────────────────────────────────────────────────────────
// Reverts a pack from GRACE_PERIOD → ACTIVE, resets the trigger, and records
// a check-in so inactivity timers restart from now.
export async function cancelDelivery(
  packId: string
): Promise<{ ok: true } | { error: string }> {
  const user = await requireUser();
  if (!user) return { error: "Unauthorized" };

  const pack = await prisma.messagePack.findUnique({
    where: { id: packId, ownerId: user.id },
    select: {
      status: true,
      triggerCondition: { select: { id: true } },
    },
  });

  if (!pack) return { error: "Pack not found." };
  if (pack.status !== "GRACE_PERIOD")
    return { error: "Pack is not in grace period." };
  if (!pack.triggerCondition)
    return { error: "No trigger condition found." };

  const now = new Date();

  await prisma.$transaction(async (tx) => {
    // Revert pack to active
    await tx.messagePack.update({
      where: { id: packId },
      data: { status: PackStatus.ACTIVE },
    });
    // Reset the trigger so it can fire again if inactivity recurs
    await tx.triggerCondition.update({
      where: { id: pack.triggerCondition!.id },
      data: { status: "PENDING", triggeredAt: null },
    });
    // Reset the inactivity clock
    await tx.user.update({
      where: { id: user.id },
      data: { lastActiveAt: now },
    });
    // Audit trail
    await tx.activityLog.create({
      data: {
        userId: user.id,
        source: ActivitySource.MANUAL_CHECK_IN,
        timestamp: now,
        metadata: { action: "cancel_delivery", packId },
      },
    });
  });

  revalidatePath("/dashboard");
  return { ok: true };
}
