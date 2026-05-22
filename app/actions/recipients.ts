"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { prisma } from "@/lib/prisma/client";

async function requireUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// ─── updateRecipientProfile ───────────────────────────────────────────────────

export async function updateRecipientProfile(
  recipientId: string,
  data: {
    relationship?: string | null;
    birthday?: string | null;     // ISO date string or null
    anniversary?: string | null;  // ISO date string or null
    notes?: string | null;
  }
): Promise<{ ok: true } | { error: string }> {
  const user = await requireUser();
  if (!user) return { error: "Unauthorized" };

  const recipient = await prisma.recipient.findFirst({
    where: { id: recipientId, messagePack: { ownerId: user.id } },
    select: { id: true, messagePackId: true },
  });
  if (!recipient) return { error: "Příjemce nenalezen." };

  await prisma.recipient.update({
    where: { id: recipientId },
    data: {
      relationship: data.relationship ?? null,
      birthday: data.birthday ? new Date(data.birthday) : null,
      anniversary: data.anniversary ? new Date(data.anniversary) : null,
      notes: data.notes ?? null,
    },
  });

  revalidatePath(`/dashboard/vault/${recipientId}`);
  revalidatePath("/dashboard");
  return { ok: true };
}

// ─── uploadRecipientAvatar ────────────────────────────────────────────────────

export async function uploadRecipientAvatar(
  recipientId: string,
  formData: FormData
): Promise<{ ok: true; avatarUrl: string } | { error: string }> {
  const user = await requireUser();
  if (!user) return { error: "Unauthorized" };

  const recipient = await prisma.recipient.findFirst({
    where: { id: recipientId, messagePack: { ownerId: user.id } },
    select: { id: true, avatarUrl: true },
  });
  if (!recipient) return { error: "Příjemce nenalezen." };

  const file = formData.get("file") as File | null;
  if (!file) return { error: "Soubor chybí." };
  if (!file.type.startsWith("image/")) return { error: "Musí být obrázek." };
  if (file.size > 5 * 1024 * 1024) return { error: "Maximální velikost je 5 MB." };

  // Delete old avatar if exists
  if (recipient.avatarUrl) {
    await supabaseAdmin.storage.from("recipient-avatars").remove([recipient.avatarUrl]);
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${user.id}/${recipientId}/avatar.${ext}`;
  const bytes = await file.arrayBuffer();

  const { error: uploadErr } = await supabaseAdmin.storage
    .from("recipient-avatars")
    .upload(path, bytes, { contentType: file.type, upsert: true });

  if (uploadErr) return { error: `Nahrání selhalo: ${uploadErr.message}` };

  await prisma.recipient.update({
    where: { id: recipientId },
    data: { avatarUrl: path },
  });

  revalidatePath(`/dashboard/vault/${recipientId}`);
  return { ok: true, avatarUrl: path };
}

// ─── addMemory ────────────────────────────────────────────────────────────────

export async function addMemory(
  recipientId: string,
  data: {
    title?: string;
    note?: string;
    happenedAt?: string | null;
    mediaFile?: File | null;
    mediaType?: string;
  }
): Promise<{ ok: true } | { error: string }> {
  const user = await requireUser();
  if (!user) return { error: "Unauthorized" };

  const recipient = await prisma.recipient.findFirst({
    where: { id: recipientId, messagePack: { ownerId: user.id } },
    select: { id: true },
  });
  if (!recipient) return { error: "Příjemce nenalezen." };

  let mediaUrl: string | null = null;
  let mediaType = data.mediaType ?? null;

  if (data.mediaFile) {
    const file = data.mediaFile;
    const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
    const ts = Date.now();
    const path = `${user.id}/${recipientId}/${ts}.${ext}`;

    const bytes = await file.arrayBuffer();
    const { error: uploadErr } = await supabaseAdmin.storage
      .from("memories")
      .upload(path, bytes, { contentType: file.type, upsert: false });

    if (uploadErr) return { error: `Nahrání selhalo: ${uploadErr.message}` };
    mediaUrl = path;

    if (!mediaType) {
      if (file.type.startsWith("image/")) mediaType = "image";
      else if (file.type.startsWith("audio/")) mediaType = "audio";
      else if (file.type.startsWith("video/")) mediaType = "video";
    }
  }

  await prisma.memory.create({
    data: {
      recipientId,
      title: data.title?.trim() || null,
      note: data.note?.trim() || null,
      happenedAt: data.happenedAt ? new Date(data.happenedAt) : null,
      mediaUrl,
      mediaType,
    },
  });

  revalidatePath(`/dashboard/vault/${recipientId}`);
  return { ok: true };
}

// ─── deleteMemory ─────────────────────────────────────────────────────────────

export async function deleteMemory(
  memoryId: string
): Promise<{ ok: true } | { error: string }> {
  const user = await requireUser();
  if (!user) return { error: "Unauthorized" };

  const memory = await prisma.memory.findFirst({
    where: { id: memoryId, recipient: { messagePack: { ownerId: user.id } } },
    select: { id: true, mediaUrl: true, recipientId: true },
  });
  if (!memory) return { error: "Vzpomínka nenalezena." };

  if (memory.mediaUrl) {
    await supabaseAdmin.storage.from("memories").remove([memory.mediaUrl]);
  }

  await prisma.memory.delete({ where: { id: memoryId } });
  revalidatePath(`/dashboard/vault/${memory.recipientId}`);
  return { ok: true };
}

// ─── getSignedAvatarUrl ───────────────────────────────────────────────────────
// Server-side helper for generating signed URLs. Not exported as action,
// called directly from Server Components.

export async function getSignedAvatarUrl(path: string): Promise<string | null> {
  const { data } = await supabaseAdmin.storage
    .from("recipient-avatars")
    .createSignedUrl(path, 60 * 60); // 1 hour
  return data?.signedUrl ?? null;
}

export async function getSignedMemoryUrl(path: string): Promise<string | null> {
  const { data } = await supabaseAdmin.storage
    .from("memories")
    .createSignedUrl(path, 60 * 60);
  return data?.signedUrl ?? null;
}
