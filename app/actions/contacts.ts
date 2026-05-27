"use server";

import { randomBytes } from "crypto";
import { createHash } from "crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";

function hashAnswer(answer: string) {
  return createHash("sha256").update(answer.trim().toLowerCase()).digest("hex");
}

export async function createContact(formData: FormData): Promise<
  | { error: string }
  | { id: string; name: string; email: string | null; packId: string }
> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const name  = (formData.get("name")  as string)?.trim();
  const email = (formData.get("email") as string)?.trim() || null;
  const phone = (formData.get("phone") as string)?.trim() || null;
  const whatsapp  = (formData.get("whatsapp")  as string)?.trim() || null;
  const facebook  = (formData.get("facebook")  as string)?.trim() || null;
  const instagram = (formData.get("instagram") as string)?.trim() || null;
  const address   = (formData.get("address")   as string)?.trim() || null;
  const relationship = (formData.get("relationship") as string)?.trim() || null;
  const notes        = (formData.get("notes")        as string)?.trim() || null;
  const birthdayRaw  = (formData.get("birthday")     as string)?.trim() || null;
  const annivRaw     = (formData.get("anniversary")  as string)?.trim() || null;
  const challengeQuestion = (formData.get("challengeQuestion") as string)?.trim() || null;
  const challengeAnswer   = (formData.get("challengeAnswer")   as string)?.trim() || null;

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
      phone,
      whatsapp,
      facebook,
      instagram,
      address,
      relationship,
      notes,
      birthday:    birthdayRaw  ? new Date(birthdayRaw)  : null,
      anniversary: annivRaw     ? new Date(annivRaw)     : null,
      challengeQuestion,
      challengeAnswerHash: challengeQuestion && challengeAnswer
        ? hashAnswer(challengeAnswer)
        : null,
    },
  });

  revalidatePath("/dashboard/vault");
  return { id: recipient.id, name, email, packId: pack.id };
}
