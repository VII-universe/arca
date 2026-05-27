"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";

const PATH = "/dashboard/blueprint";

async function getUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return user;
}

// ── createBlueprintItem ────────────────────────────────────────────────────────

export async function createBlueprintItem(formData: FormData): Promise<
  | { error: string }
  | { id: string; category: string; title: string; content: string; isCritical: boolean; createdAt: Date; updatedAt: Date }
> {
  const user = await getUser();

  const category   = (formData.get("category")   as string)?.trim();
  const title      = (formData.get("title")       as string)?.trim();
  const content    = (formData.get("content")     as string)?.trim();
  const isCritical = formData.get("isCritical") === "true";

  if (!category) return { error: "Kategorie je povinná." };
  if (!title)    return { error: "Název je povinný." };
  if (!content)  return { error: "Popis je povinný." };

  const item = await prisma.blueprintItem.create({
    data: { category, title, content, isCritical, ownerId: user.id },
  });

  revalidatePath(PATH);
  return item;
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

  if (!title)   return { error: "Název je povinný." };
  if (!content) return { error: "Popis je povinný." };

  await prisma.blueprintItem.update({
    where: { id },
    data: { title, content, isCritical },
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

  await prisma.blueprintItem.delete({ where: { id } });
  revalidatePath(PATH);
  return { ok: true };
}
