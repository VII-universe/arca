"use server";

import { redirect } from "next/navigation";
import { randomBytes } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";
import { PackType, ContentType, TriggerType } from "@/lib/prisma/generated";

// ─── createPack ────────────────────────────────────────────────────────────────
export async function createPack(
  _prev: { error: string } | null,
  formData: FormData
): Promise<{ error: string } | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const rawType = formData.get("type") as string;
  const title = (formData.get("title") as string)?.trim();

  if (!rawType || !Object.values(PackType).includes(rawType as PackType)) {
    return { error: "Please choose an Arca type before continuing." };
  }
  if (!title) {
    return { error: "Please give your Arca a title." };
  }

  const pack = await prisma.messagePack.create({
    data: {
      title,
      type: rawType as PackType,
      livingLinkHash: randomBytes(32).toString("hex"),
      ownerId: user.id,
    },
  });

  redirect(`/dashboard/arca/${pack.id}/edit`);
}

// ─── createPackFull ────────────────────────────────────────────────────────────
// Used by the new ComposeWizard — saves all data sequentially and redirects to vault.
export async function createPackFull(
  _prev: { error: string } | null,
  formData: FormData
): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const rawType       = (formData.get("type") as string) || "EMOTIONAL";
  const title         = (formData.get("title") as string)?.trim();
  const text          = (formData.get("text") as string)?.trim();
  const trigger       = (formData.get("trigger") as string) || "date";
  const dateVal       = (formData.get("date") as string) || "";
  const timeVal       = (formData.get("time") as string) || "08:00";
  const isDraft       = formData.get("draft") === "1";

  // Multi-recipient: existing IDs
  const existingIds   = formData.getAll("recipientId").map(v => String(v)).filter(Boolean);
  // New people as JSON: [{name, email?}]
  const newPeopleRaw  = (formData.get("newPeople") as string) || "[]";
  let newPeople: { name: string; email?: string }[] = [];
  try { newPeople = JSON.parse(newPeopleRaw); } catch { /* ignore */ }

  if (!title) return { error: "Zadej název zprávy." };
  if (!Object.values(PackType).includes(rawType as PackType)) {
    return { error: "Neplatný typ." };
  }

  // Resolve trigger type
  let triggerType: TriggerType | null = null;
  let executeAtDate: Date | null = null;
  if (!isDraft && trigger === "date" && dateVal) {
    const parts = dateVal.split("-").map(Number);
    const timeParts = timeVal.split(":").map(Number);
    triggerType = TriggerType.SPECIFIC_DATE;
    executeAtDate = new Date(parts[0], parts[1] - 1, parts[2], timeParts[0] || 8, timeParts[1] || 0);
  } else if (!isDraft && trigger === "sealed") {
    triggerType = TriggerType.MANUAL_EMERGENCY;
  }

  // 1. Create the pack
  const pack = await prisma.messagePack.create({
    data: {
      title,
      type: rawType as PackType,
      livingLinkHash: randomBytes(32).toString("hex"),
      ownerId: user.id,
      status: triggerType ? "ACTIVE" : "DRAFT",
    },
  });

  // 2. Save text content if provided
  if (text) {
    await prisma.messageContent.create({
      data: { messagePackId: pack.id, type: ContentType.TEXT, textBody: text },
    });
  }

  // 3. Link all recipients
  let firstRecipientId: string | null = null;

  // 3a. Existing contacts — look up original data, clone into this pack
  if (existingIds.length > 0) {
    const existing = await prisma.recipient.findMany({
      where: { id: { in: existingIds }, messagePack: { ownerId: user.id } },
      select: { name: true, email: true, phone: true },
    });
    for (const r of existing) {
      const created = await prisma.recipient.create({
        data: { messagePackId: pack.id, name: r.name, email: r.email, phone: r.phone },
      });
      if (!firstRecipientId) firstRecipientId = created.id;
    }
  }

  // 3b. Brand-new people
  for (const p of newPeople) {
    if (!p.name?.trim()) continue;
    const created = await prisma.recipient.create({
      data: { messagePackId: pack.id, name: p.name.trim(), email: p.email?.trim() || null },
    });
    if (!firstRecipientId) firstRecipientId = created.id;
  }

  // 4. Save trigger
  if (triggerType) {
    await prisma.triggerCondition.create({
      data: {
        messagePackId: pack.id,
        type: triggerType,
        ...(executeAtDate ? { executeAtDate } : {}),
      },
    });
  }

  return { ok: true };
}

// ─── upsertContent ─────────────────────────────────────────────────────────────
export async function upsertContent(
  packId: string,
  textBody: string
): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Unauthorized" };

  const pack = await prisma.messagePack.findUnique({
    where: { id: packId, ownerId: user.id },
    select: { id: true },
  });
  if (!pack) return { error: "Pack not found" };

  const existing = await prisma.messageContent.findFirst({
    where: { messagePackId: packId, type: ContentType.TEXT },
    select: { id: true },
  });

  if (existing) {
    await prisma.messageContent.update({
      where: { id: existing.id },
      data: { textBody },
    });
  } else {
    await prisma.messageContent.create({
      data: { messagePackId: packId, type: ContentType.TEXT, textBody },
    });
  }

  return { ok: true };
}

// ─── addMediaContent ───────────────────────────────────────────────────────────
// Called after a successful client-side upload to Supabase Storage.
// Creates the Prisma MessageContent record and updates pack's lastActiveAt.
export async function addMediaContent(
  packId: string,
  s3FileKey: string,
  contentType: "VIDEO" | "AUDIO" | "FILE"
): Promise<{ ok: true; id: string } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Unauthorized" };

  // Ownership gate — the WHERE clause enforces it at the DB level
  const pack = await prisma.messagePack.findUnique({
    where: { id: packId, ownerId: user.id },
    select: { id: true },
  });
  if (!pack) return { error: "Pack not found" };

  // Guard against path traversal: the key must start with the user's own folder
  if (!s3FileKey.startsWith(`${user.id}/`)) {
    return { error: "Invalid file path" };
  }

  const content = await prisma.messageContent.create({
    data: {
      messagePackId: packId,
      type: ContentType[contentType],
      s3FileKey,
    },
    select: { id: true },
  });

  return { ok: true, id: content.id };
}

// ─── deleteMedia ───────────────────────────────────────────────────────────────
// Deletes the Supabase Storage object AND the Prisma record in one transaction.
export async function deleteMedia(
  contentId: string
): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Unauthorized" };

  // Fetch the content record — ownership verified through the pack relation
  const content = await prisma.messageContent.findFirst({
    where: {
      id: contentId,
      messagePack: { ownerId: user.id },
      NOT: { s3FileKey: null },
    },
    select: { id: true, s3FileKey: true },
  });

  if (!content || !content.s3FileKey) return { error: "Not found" };

  // Delete from Supabase Storage first (if this fails, we keep the DB record)
  const { error: storageError } = await supabase.storage
    .from("arca-media")
    .remove([content.s3FileKey]);

  if (storageError) {
    console.error("[deleteMedia] storage error:", storageError);
    return { error: "Failed to delete file from storage" };
  }

  await prisma.messageContent.delete({ where: { id: content.id } });

  return { ok: true };
}

// ─── updatePackTitle ───────────────────────────────────────────────────────────
export async function updatePackTitle(
  packId: string,
  title: string
): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const trimmed = title.trim();
  if (!trimmed) return { error: "Title cannot be empty" };

  const pack = await prisma.messagePack.findUnique({
    where: { id: packId, ownerId: user.id },
    select: { id: true },
  });
  if (!pack) return { error: "Pack not found" };

  await prisma.messagePack.update({
    where: { id: packId },
    data: { title: trimmed },
  });

  return { ok: true };
}
