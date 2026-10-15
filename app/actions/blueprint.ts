"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { prisma } from "@/lib/prisma/client";
import { encryptBlueprintContent, decryptBlueprintContent } from "@/lib/crypto/blueprint-encryption";

const PATH = "/dashboard/blueprint";
const ATTACHMENT_BUCKET = "arca-media";
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024; // 10 MB — documents/photos of accounts, not videos.

function sanitizeFilename(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9.\-_]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 100);
}

async function getUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return user;
}

// Returns the trimmed URL, or null for an empty field, or a Czech error
// string if it's non-empty but not a valid http(s) URL.
function parseOptionalUrl(raw: FormDataEntryValue | null): string | null | { error: string } {
  const value = (raw as string)?.trim();
  if (!value) return null;
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return { error: "Odkaz musí začínat http:// nebo https://." };
    }
    return value;
  } catch {
    return { error: "Odkaz není platná URL adresa." };
  }
}

// ── createBlueprintItem ────────────────────────────────────────────────────────

export async function createBlueprintItem(formData: FormData): Promise<
  | { error: string }
  | { id: string; category: string; title: string; content: string; isCritical: boolean; url: string | null; createdAt: Date; updatedAt: Date }
> {
  const user = await getUser();

  const category   = (formData.get("category")   as string)?.trim();
  const title      = (formData.get("title")       as string)?.trim();
  const content    = (formData.get("content")     as string)?.trim();
  const isCritical = formData.get("isCritical") === "true";
  const url        = parseOptionalUrl(formData.get("url"));

  if (!category) return { error: "Kategorie je povinná." };
  if (!title)    return { error: "Název je povinný." };
  if (!content)  return { error: "Popis je povinný." };
  if (url && typeof url === "object") return { error: url.error };

  const item = await prisma.blueprintItem.create({
    data: { category, title, content: encryptBlueprintContent(content), isCritical, url, ownerId: user.id },
  });

  revalidatePath(PATH);
  // Return the plaintext the owner just typed, not the stored ciphertext —
  // the client uses this response directly to render the new card.
  return { ...item, content };
}

// ── updateBlueprintItem ────────────────────────────────────────────────────────

export async function updateBlueprintItem(
  id: string,
  formData: FormData
): Promise<{ error: string } | { ok: true }> {
  const user = await getUser();

  const existing = await prisma.blueprintItem.findUnique({ where: { id } });
  if (!existing || existing.ownerId !== user.id) return { error: "Položka nenalezena." };

  const title      = (formData.get("title")   as string)?.trim();
  const content    = (formData.get("content") as string)?.trim();
  const isCritical = formData.get("isCritical") === "true";
  const url        = parseOptionalUrl(formData.get("url"));

  if (!title)   return { error: "Název je povinný." };
  if (!content) return { error: "Popis je povinný." };
  if (url && typeof url === "object") return { error: url.error };

  await prisma.blueprintItem.update({
    where: { id },
    data: { title, content: encryptBlueprintContent(content), isCritical, url },
  });

  revalidatePath(PATH);
  return { ok: true };
}

// ── deleteBlueprintItem ────────────────────────────────────────────────────────

export async function deleteBlueprintItem(
  id: string
): Promise<{ error: string } | { ok: true }> {
  const user = await getUser();

  const existing = await prisma.blueprintItem.findUnique({ where: { id } });
  if (!existing || existing.ownerId !== user.id) return { error: "Položka nenalezena." };

  if (existing.attachmentPath) {
    await supabaseAdmin.storage.from(ATTACHMENT_BUCKET).remove([existing.attachmentPath]);
  }

  await prisma.blueprintItem.delete({ where: { id } });
  revalidatePath(PATH);
  return { ok: true };
}

// ── uploadBlueprintAttachment ──────────────────────────────────────────────────

export async function uploadBlueprintAttachment(
  itemId: string,
  formData: FormData
): Promise<{ error: string } | { ok: true; attachmentName: string }> {
  const user = await getUser();

  const existing = await prisma.blueprintItem.findFirst({ where: { id: itemId, ownerId: user.id } });
  if (!existing) return { error: "Položka nenalezena." };

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return { error: "Vyber soubor." };
  if (file.size > MAX_ATTACHMENT_BYTES) return { error: "Soubor je příliš velký (max 10 MB)." };

  const safeName = sanitizeFilename(file.name || "attachment");
  const path = `${user.id}/blueprint/${itemId}/${Date.now()}_${safeName}`;
  const bytes = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabaseAdmin.storage
    .from(ATTACHMENT_BUCKET)
    .upload(path, bytes, { contentType: file.type || "application/octet-stream", upsert: false });
  if (uploadError) return { error: "Nahrání se nezdařilo." };

  if (existing.attachmentPath) {
    await supabaseAdmin.storage.from(ATTACHMENT_BUCKET).remove([existing.attachmentPath]);
  }

  await prisma.blueprintItem.update({
    where: { id: itemId },
    data: { attachmentPath: path, attachmentName: file.name || safeName },
  });

  revalidatePath(PATH);
  return { ok: true, attachmentName: file.name || safeName };
}

// ── removeBlueprintAttachment ──────────────────────────────────────────────────

export async function removeBlueprintAttachment(
  itemId: string
): Promise<{ error: string } | { ok: true }> {
  const user = await getUser();

  const existing = await prisma.blueprintItem.findFirst({ where: { id: itemId, ownerId: user.id } });
  if (!existing) return { error: "Položka nenalezena." };
  if (!existing.attachmentPath) return { ok: true };

  await supabaseAdmin.storage.from(ATTACHMENT_BUCKET).remove([existing.attachmentPath]);

  await prisma.blueprintItem.update({
    where: { id: itemId },
    data: { attachmentPath: null, attachmentName: null },
  });

  revalidatePath(PATH);
  return { ok: true };
}

// ── getBlueprintAttachmentUrl ───────────────────────────────────────────────────

export async function getBlueprintAttachmentUrl(itemId: string): Promise<{ error: string } | { url: string }> {
  const user = await getUser();

  const existing = await prisma.blueprintItem.findFirst({ where: { id: itemId, ownerId: user.id } });
  if (!existing || !existing.attachmentPath) return { error: "Příloha nenalezena." };

  // Defensive: the path is namespaced by owner at write time, but re-check
  // before issuing a signed URL in case a row is ever reassigned.
  if (!existing.attachmentPath.startsWith(`${user.id}/blueprint/`)) {
    return { error: "Příloha nenalezena." };
  }

  const { data, error } = await supabaseAdmin.storage
    .from(ATTACHMENT_BUCKET)
    .createSignedUrl(existing.attachmentPath, 60 * 10);
  if (error || !data) return { error: "Nepodařilo se vygenerovat odkaz." };

  return { url: data.signedUrl };
}
