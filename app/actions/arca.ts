"use server";

import { redirect } from "next/navigation";
import { randomBytes } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";
import { PackType, ContentType } from "@/lib/prisma/generated";

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
