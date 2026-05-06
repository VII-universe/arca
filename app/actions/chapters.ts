"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";

async function requireUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function createChapter(
  packId: string,
  data: {
    title: string;
    content?: string;
    order?: number;
    unlockDate?: string | null;
    unlockDelayDays?: number | null;
  }
): Promise<{ ok: true; id: string } | { error: string }> {
  const user = await requireUser();
  if (!user) return { error: "Unauthorized" };

  const pack = await prisma.messagePack.findUnique({
    where: { id: packId, ownerId: user.id },
    select: { id: true },
  });
  if (!pack) return { error: "Pack not found" };

  const chapter = await prisma.chapter.create({
    data: {
      messagePackId: packId,
      title: data.title.trim() || "Untitled chapter",
      content: data.content ?? "",
      order: data.order ?? 0,
      unlockDate: data.unlockDate ? new Date(data.unlockDate) : null,
      unlockDelayDays: data.unlockDelayDays ?? null,
    },
    select: { id: true },
  });

  revalidatePath(`/dashboard/arca/${packId}/edit`);
  return { ok: true, id: chapter.id };
}

export async function updateChapter(
  chapterId: string,
  data: {
    title?: string;
    content?: string;
    unlockDate?: string | null;
    unlockDelayDays?: number | null;
  }
): Promise<{ ok: true } | { error: string }> {
  const user = await requireUser();
  if (!user) return { error: "Unauthorized" };

  const chapter = await prisma.chapter.findFirst({
    where: { id: chapterId, messagePack: { ownerId: user.id } },
    select: { id: true, messagePackId: true },
  });
  if (!chapter) return { error: "Not found" };

  await prisma.chapter.update({
    where: { id: chapterId },
    data: {
      ...(data.title !== undefined && { title: data.title.trim() || "Untitled" }),
      ...(data.content !== undefined && { content: data.content }),
      unlockDate: data.unlockDate !== undefined
        ? (data.unlockDate ? new Date(data.unlockDate) : null)
        : undefined,
      unlockDelayDays: data.unlockDelayDays !== undefined
        ? data.unlockDelayDays
        : undefined,
    },
  });

  revalidatePath(`/dashboard/arca/${chapter.messagePackId}/edit`);
  return { ok: true };
}

export async function deleteChapter(
  chapterId: string
): Promise<{ ok: true } | { error: string }> {
  const user = await requireUser();
  if (!user) return { error: "Unauthorized" };

  const chapter = await prisma.chapter.findFirst({
    where: { id: chapterId, messagePack: { ownerId: user.id } },
    select: { id: true, messagePackId: true },
  });
  if (!chapter) return { error: "Not found" };

  await prisma.chapter.delete({ where: { id: chapterId } });
  revalidatePath(`/dashboard/arca/${chapter.messagePackId}/edit`);
  return { ok: true };
}
