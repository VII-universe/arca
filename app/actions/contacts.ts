"use server";

import { randomBytes } from "crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";

export async function createContact(formData: FormData): Promise<
  | { error: string }
  | { id: string; name: string; email: string | null; packId: string }
> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const name  = (formData.get("name")  as string)?.trim();
  const email = (formData.get("email") as string)?.trim() || null;

  if (!name) return { error: "Jméno je povinné." };

  const pack = await prisma.messagePack.create({
    data: {
      ownerId: user.id,
      livingLinkHash: randomBytes(32).toString("hex"),
      title: `Zpráva pro ${name}`,
      type: "EMOTIONAL",
      status: "DRAFT",
    },
  });

  const recipient = await prisma.recipient.create({
    data: {
      messagePackId: pack.id,
      name,
      email,
    },
  });

  revalidatePath("/dashboard/vault");
  return { id: recipient.id, name, email, packId: pack.id };
}
