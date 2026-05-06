"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";

export async function createCategory(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const name = (formData.get("name") as string)?.trim();
  const color = (formData.get("color") as string)?.trim() || "zinc";

  if (!name) throw new Error("Name is required");
  if (name.length > 40) throw new Error("Name too long");

  await prisma.category.create({
    data: { userId: user.id, name, color },
  });

  revalidatePath("/dashboard");
}

export async function deleteCategory(categoryId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  // SetNull on MessagePack.categoryId happens automatically (schema onDelete: SetNull)
  await prisma.category.deleteMany({
    where: { id: categoryId, userId: user.id },
  });

  revalidatePath("/dashboard");
}

export async function assignCategory(packId: string, categoryId: string | null) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  await prisma.messagePack.updateMany({
    where: { id: packId, ownerId: user.id },
    data: { categoryId },
  });

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/arca/${packId}/edit`);
}
