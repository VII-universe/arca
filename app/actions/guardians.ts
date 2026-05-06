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
