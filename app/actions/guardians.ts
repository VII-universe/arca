"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";

export async function addGuardian(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const name = (formData.get("name") as string)?.trim();
  const email = (formData.get("email") as string)?.trim().toLowerCase();

  if (!name || !email) throw new Error("Name and email are required");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new Error("Invalid email address");

  const count = await prisma.guardian.count({ where: { userId: user.id } });
  if (count >= 3) throw new Error("You can have at most 3 guardians");

  const existing = await prisma.guardian.findFirst({
    where: { userId: user.id, email },
  });
  if (existing) throw new Error("This email is already a guardian");

  await prisma.guardian.create({
    data: { userId: user.id, name, email },
  });

  revalidatePath("/dashboard");
}

export async function updateGuardian(
  guardianId: string,
  data: { name?: string; email?: string; phone?: string | null }
): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const guardian = await prisma.guardian.findFirst({
    where: { id: guardianId, userId: user.id },
    select: { id: true },
  });
  if (!guardian) return { error: "Strážce nenalezen." };

  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    return { error: "Neplatný e-mail." };
  }

  await prisma.guardian.update({
    where: { id: guardianId },
    data: {
      ...(data.name  ? { name: data.name.trim() }               : {}),
      ...(data.email ? { email: data.email.trim().toLowerCase() } : {}),
      ...(data.phone !== undefined ? { phone: data.phone?.trim() || null } : {}),
    },
  });

  revalidatePath("/dashboard/guardians");
  return { ok: true };
}

export async function removeGuardian(guardianId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  await prisma.guardian.deleteMany({
    where: { id: guardianId, userId: user.id },
  });

  revalidatePath("/dashboard");
}
