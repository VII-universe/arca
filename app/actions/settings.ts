"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";

async function requireUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return user;
}

// ─── updateProfile ────────────────────────────────────────────────────────────

export async function updateProfile(
  formData: FormData
): Promise<{ ok: true } | { error: string }> {
  const user = await requireUser();
  const name = (formData.get("name") as string)?.trim();
  if (!name || name.length < 2) return { error: "Jméno musí mít alespoň 2 znaky." };
  if (name.length > 80) return { error: "Jméno je příliš dlouhé." };

  await prisma.user.update({ where: { id: user.id }, data: { name } });
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/settings");
  return { ok: true };
}

// ─── updateSwitch ─────────────────────────────────────────────────────────────

export async function updateSwitch(data: {
  enabled: boolean;
  type: "INACTIVITY" | "SPECIFIC_DATE";
  inactivityDays: number;
  executeAt: string | null;
  gracePeriodDays: number;
}): Promise<{ ok: true } | { error: string }> {
  const user = await requireUser();

  if (data.enabled) {
    if (data.type === "INACTIVITY") {
      if (!Number.isInteger(data.inactivityDays) || data.inactivityDays < 7) {
        return { error: "Minimální doba nečinnosti je 7 dní." };
      }
    }
    if (data.type === "SPECIFIC_DATE") {
      if (!data.executeAt) return { error: "Vyberte datum spuštění." };
      const d = new Date(data.executeAt);
      if (isNaN(d.getTime())) return { error: "Datum je neplatné." };
      if (d <= new Date()) return { error: "Datum musí být v budoucnosti." };
    }
    if (data.gracePeriodDays < 0 || data.gracePeriodDays > 365) {
      return { error: "Grace period musí být 0–365 dní." };
    }
  }

  const payload = {
    switchEnabled: data.enabled,
    switchType: data.type,
    inactivityDays: data.inactivityDays,
    executeAt:
      data.enabled && data.type === "SPECIFIC_DATE" && data.executeAt
        ? new Date(data.executeAt)
        : null,
    gracePeriodDays: data.gracePeriodDays,
  };

  await prisma.userSettings.upsert({
    where: { userId: user.id },
    update: payload,
    create: { userId: user.id, ...payload },
  });

  revalidatePath("/dashboard/settings");
  return { ok: true };
}

// ─── requestPasswordReset ─────────────────────────────────────────────────────


import { supabaseAdmin } from "@/lib/supabase/admin";

export async function uploadGlobalVibe(
  formData: FormData
): Promise<{ ok: true; vibeImageUrl: string } | { error: string }> {
  const user = await requireUser();

  const file = formData.get("file") as File | null;
  if (!file) return { error: "Soubor chybí." };
  if (!file.type.startsWith("image/")) return { error: "Musí být obrázek." };
  if (file.size > 10 * 1024 * 1024) return { error: "Maximální velikost je 10 MB." };

  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const ts = Date.now();
  const path = `${user.id}/global-vibe-${ts}.${ext}`;
  const bytes = await file.arrayBuffer();

  const { error: uploadErr } = await supabaseAdmin.storage
    .from("vibe-backgrounds")
    .upload(path, bytes, { contentType: file.type, upsert: true });

  if (uploadErr) return { error: `Nahrání selhalo: ${uploadErr.message}` };

  const { data: publicData } = supabaseAdmin.storage.from("vibe-backgrounds").getPublicUrl(path);

  return { ok: true, vibeImageUrl: publicData?.publicUrl ?? "" };
}

export async function requestPasswordReset(): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return { error: "Nepodařilo se najít e-mail účtu." };

  const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/auth/reset`,
  });

  if (error) return { error: error.message };
  return { ok: true };
}
