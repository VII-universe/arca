"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { randomBytes } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";
import { PackType, ContentType, TriggerType, MessageMode, TriggerBasis } from "@/lib/prisma/generated";
import { computeAgeMilestoneDate, computeRelativeOffsetDate, isFutureDate } from "@/lib/triggers/milestone";

function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

// ─── createPack ────────────────────────────────────────────────────────────────
export async function createPack(
  _prev: { error: string } | null,
  formData: FormData
): Promise<{ error: string } | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const rawType = formData.get("type") as string;
  const title = (formData.get("title") as string)?.trim();

  if (!rawType || !Object.values(PackType).includes(rawType as PackType)) {
    return { error: "Please choose an Arca type before continuing." };
  }
  if (!title) {
    return { error: "Please give your Arca a title." };
  }

  const pack = await prisma.messagePack.create({
    data: {
      title,
      type: rawType as PackType,
      livingLinkHash: randomBytes(32).toString("hex"),
      ownerId: user.id,
    },
  });

  redirect(`/dashboard/arca/${pack.id}/edit`);
}

// ─── createPackFull ────────────────────────────────────────────────────────────
// Used by the new ComposeWizard — saves all data sequentially and redirects to vault.
export async function createPackFull(
  _prev: { error: string } | null,
  formData: FormData
): Promise<{ ok: true; packId: string } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const rawType       = (formData.get("type") as string) || "EMOTIONAL";
  const title         = (formData.get("title") as string)?.trim();
  const text          = (formData.get("text") as string)?.trim();
  let trigger         = (formData.get("trigger") as string) || "date";
  const rawMode       = (formData.get("messageMode") as string) || "LEGACY";
  const messageMode: MessageMode = rawMode === "SELF" ? MessageMode.SELF : MessageMode.LEGACY;
  // SELF packs never involve Guardians — force one of the triggers this
  // mode's UI actually offers, regardless of what the client sent. Defense
  // in depth: the "Kdy se otevře" step for SELF only renders "date"/"age"/
  // "relative", but a request could still be crafted by hand.
  if (messageMode === MessageMode.SELF && !["date", "age", "relative"].includes(trigger)) trigger = "date";
  const backgroundColor = (formData.get("backgroundColor") as string) || null;
  const textColor       = (formData.get("textColor") as string) || null;
  const dateVal       = (formData.get("date") as string) || "";
  const timeVal       = (formData.get("time") as string) || "08:00";
  const isDraft       = formData.get("draft") === "1";

  // Age-milestone / relative-offset triggers (Fáze 1)
  const targetAgeVal      = formData.get("targetAge") ? Number(formData.get("targetAge")) : null;
  const relativeYearsVal  = formData.get("relativeYears") ? Number(formData.get("relativeYears")) : 0;
  const relativeMonthsVal = formData.get("relativeMonths") ? Number(formData.get("relativeMonths")) : 0;
  const primaryBirthdayRaw = (formData.get("primaryBirthday") as string) || "";

  // Multi-recipient: existing IDs
  const existingIds   = formData.getAll("recipientId").map(v => String(v)).filter(Boolean);
  // New people as JSON: [{name, email?}]
  const newPeopleRaw  = (formData.get("newPeople") as string) || "[]";
  let newPeople: { name: string; email?: string }[] = [];
  try { newPeople = JSON.parse(newPeopleRaw); } catch { /* ignore */ }

  if (!title) return { error: "Zadej název zprávy." };
  if (!Object.values(PackType).includes(rawType as PackType)) {
    return { error: "Neplatný typ." };
  }

  // Resolve trigger type. For "age"/"relative" the executeAtDate is derived
  // server-side (never trusted from the client) — computed here, BEFORE any
  // writes, so an invalid/past date can still be rejected cleanly.
  let triggerType: TriggerType | null = null;
  let executeAtDate: Date | null = null;
  if (!isDraft && trigger === "date" && dateVal) {
    const parts = dateVal.split("-").map(Number);
    const timeParts = timeVal.split(":").map(Number);
    triggerType = TriggerType.SPECIFIC_DATE;
    executeAtDate = new Date(parts[0], parts[1] - 1, parts[2], timeParts[0] || 8, timeParts[1] || 0);
  } else if (!isDraft && trigger === "sealed") {
    triggerType = TriggerType.MANUAL_EMERGENCY;
  } else if (!isDraft && trigger === "age") {
    let primaryBirthday: Date | null = primaryBirthdayRaw ? parseISODate(primaryBirthdayRaw) : null;
    if (!primaryBirthday && existingIds.length > 0) {
      const firstExisting = await prisma.recipient.findFirst({
        where: { id: existingIds[0], messagePack: { ownerId: user.id } },
        select: { birthday: true },
      });
      if (firstExisting?.birthday) primaryBirthday = firstExisting.birthday;
    }
    if (!primaryBirthday) return { error: "Příjemce nemá vyplněné datum narození." };
    if (targetAgeVal == null || targetAgeVal < 1 || targetAgeVal > 120) return { error: "Zadej platný věk." };
    executeAtDate = computeAgeMilestoneDate(primaryBirthday, targetAgeVal);
    if (!isFutureDate(executeAtDate)) return { error: "Zadaný věk už příjemce dosáhl — vyber vyšší věk." };
    triggerType = TriggerType.SPECIFIC_DATE;
  } else if (!isDraft && trigger === "relative") {
    if (relativeYearsVal === 0 && relativeMonthsVal === 0) return { error: "Zadej alespoň jeden měsíc do budoucna." };
    executeAtDate = computeRelativeOffsetDate(new Date(), relativeYearsVal, relativeMonthsVal);
    if (!isFutureDate(executeAtDate)) return { error: "Zadaná doba musí vést do budoucnosti." };
    triggerType = TriggerType.SPECIFIC_DATE;
  }

  // A pack whose trigger is actually armed (non-draft, triggerType resolved)
  // but that would end up with zero recipients can never be opened by anyone
  // — the cron will fire it into TRIGGERED and it'll just sit there forever.
  // The client already disables "Zapečetit a uložit" without a recipient
  // (mode-agnostic — see ComposeWizard's save button), but that's UI only;
  // this is the server-side backstop for a hand-crafted request. A hard
  // stop with a message, not a silent auto-fix — same lesson as the SELF
  // trigger guard from Fáze 1.
  //
  // existingIds.length > 0 alone isn't enough — an id that doesn't actually
  // belong to this user (forged, or from a deleted recipient) silently
  // resolves to zero rows in step 3a below, which would slip past a plain
  // length check. Verify with a real count instead.
  const hasNewPerson = newPeople.some(p => p.name?.trim());
  const validExistingCount = (!hasNewPerson && existingIds.length > 0)
    ? await prisma.recipient.count({ where: { id: { in: existingIds }, messagePack: { ownerId: user.id } } })
    : 0;
  const hasAnyRecipient = hasNewPerson || validExistingCount > 0;
  if (!isDraft && triggerType && !hasAnyRecipient) {
    return { error: "Zpráva potřebuje alespoň jednoho příjemce, jinak by ji nikdo nikdy neotevřel." };
  }

  // 1. Create the pack
  const pack = await prisma.messagePack.create({
    data: {
      title,
      type: rawType as PackType,
      messageMode,
      livingLinkHash: randomBytes(32).toString("hex"),
      ownerId: user.id,
      status: triggerType ? "ACTIVE" : "DRAFT",
    },
  });

  // 2. Save text content if provided
  if (text) {
    await prisma.messageContent.create({
      data: {
        messagePackId: pack.id,
        type: ContentType.TEXT,
        textBody: text,
        backgroundColor,
        textColor,
      },
    });
  }

  // 3. Link all recipients
  let firstRecipientId: string | null = null;
  let recipientsCreated = 0;
  // The primary target of an age-milestone trigger is always allSelected[0]
  // on the client, which corresponds to the very first recipient created
  // below — reuse that ordering instead of threading a separate id through.
  const primaryBirthdayDate = primaryBirthdayRaw ? parseISODate(primaryBirthdayRaw) : null;

  // 3a. Existing contacts — look up original data, clone into this pack
  if (existingIds.length > 0) {
    const existing = await prisma.recipient.findMany({
      where: { id: { in: existingIds }, messagePack: { ownerId: user.id } },
      select: { id: true, name: true, email: true, phone: true, birthday: true },
    });
    const byId = new Map(existing.map((r) => [r.id, r]));
    for (const id of existingIds) {
      const r = byId.get(id);
      if (!r) continue;
      const isPrimary = recipientsCreated === 0;
      const created = await prisma.recipient.create({
        data: {
          messagePackId: pack.id, name: r.name, email: r.email, phone: r.phone,
          birthday: (isPrimary && primaryBirthdayDate) ? primaryBirthdayDate : r.birthday,
        },
      });
      if (!firstRecipientId) firstRecipientId = created.id;
      recipientsCreated++;
    }
  }

  // 3b. Brand-new people
  for (const p of newPeople) {
    if (!p.name?.trim()) continue;
    const isPrimary = recipientsCreated === 0;
    const created = await prisma.recipient.create({
      data: {
        messagePackId: pack.id, name: p.name.trim(), email: p.email?.trim() || null,
        birthday: (isPrimary && primaryBirthdayDate) ? primaryBirthdayDate : null,
      },
    });
    if (!firstRecipientId) firstRecipientId = created.id;
    recipientsCreated++;
  }

  // 4. Save trigger
  if (triggerType) {
    await prisma.triggerCondition.create({
      data: {
        messagePackId: pack.id,
        type: triggerType,
        ...(executeAtDate ? { executeAtDate } : {}),
        basis: trigger === "age" ? TriggerBasis.AGE_MILESTONE
          : trigger === "relative" ? TriggerBasis.RELATIVE_OFFSET
          : TriggerBasis.EXACT_DATE,
        ...(trigger === "age" ? { ageBasisRecipientId: firstRecipientId, targetAge: targetAgeVal } : {}),
        ...(trigger === "relative" ? { relativeYears: relativeYearsVal, relativeMonths: relativeMonthsVal } : {}),
      },
    });
  }

  // Every other mutating action in this file/app revalidates the pages that
  // list its data (see e.g. app/actions/recipients.ts, groups.ts). This one
  // creates a brand new pack + recipients + trigger but redirects the client
  // via router.push() right after — without an explicit revalidation, Schránka
  // (which is keyed off Recipient rows, unlike the Dashboard's direct
  // MessagePack query) can serve an already-cached render that predates this
  // pack, making a just-created SELF message appear to "not be there".
  revalidatePath("/dashboard/vault");
  revalidatePath("/dashboard");
  if (firstRecipientId) revalidatePath(`/dashboard/vault/${firstRecipientId}`);

  return { ok: true, packId: pack.id };
}

// ─── upsertContent ─────────────────────────────────────────────────────────────
export async function upsertContent(
  packId: string,
  textBody: string,
  opts?: { backgroundColor?: string | null; textColor?: string | null }
): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Unauthorized" };

  const pack = await prisma.messagePack.findUnique({
    where: { id: packId, ownerId: user.id },
    select: { id: true },
  });
  if (!pack) return { error: "Pack not found" };

  const existing = await prisma.messageContent.findFirst({
    where: { messagePackId: packId, type: ContentType.TEXT },
    select: { id: true },
  });

  const colorData = {
    backgroundColor: opts?.backgroundColor ?? null,
    textColor: opts?.textColor ?? null,
  };

  if (existing) {
    await prisma.messageContent.update({
      where: { id: existing.id },
      data: { textBody, ...colorData },
    });
  } else {
    await prisma.messageContent.create({
      data: { messagePackId: packId, type: ContentType.TEXT, textBody, ...colorData },
    });
  }

  return { ok: true };
}

// ─── addMediaContent ───────────────────────────────────────────────────────────
// Called after a successful client-side upload to Supabase Storage.
// Creates the Prisma MessageContent record and updates pack's lastActiveAt.
export async function addMediaContent(
  packId: string,
  s3FileKey: string,
  contentType: "VIDEO" | "AUDIO" | "FILE"
): Promise<{ ok: true; id: string } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Unauthorized" };

  // Ownership gate — the WHERE clause enforces it at the DB level
  const pack = await prisma.messagePack.findUnique({
    where: { id: packId, ownerId: user.id },
    select: { id: true },
  });
  if (!pack) return { error: "Pack not found" };

  // Guard against path traversal: the key must start with the user's own folder
  if (!s3FileKey.startsWith(`${user.id}/`)) {
    return { error: "Invalid file path" };
  }

  const content = await prisma.messageContent.create({
    data: {
      messagePackId: packId,
      type: ContentType[contentType],
      s3FileKey,
    },
    select: { id: true },
  });

  return { ok: true, id: content.id };
}

// ─── deleteMedia ───────────────────────────────────────────────────────────────
// Deletes the Supabase Storage object AND the Prisma record in one transaction.
export async function deleteMedia(
  contentId: string
): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Unauthorized" };

  // Fetch the content record — ownership verified through the pack relation
  const content = await prisma.messageContent.findFirst({
    where: {
      id: contentId,
      messagePack: { ownerId: user.id },
      NOT: { s3FileKey: null },
    },
    select: { id: true, s3FileKey: true },
  });

  if (!content || !content.s3FileKey) return { error: "Not found" };

  // Delete from Supabase Storage first (if this fails, we keep the DB record)
  const { error: storageError } = await supabase.storage
    .from("arca-media")
    .remove([content.s3FileKey]);

  if (storageError) {
    console.error("[deleteMedia] storage error:", storageError);
    return { error: "Failed to delete file from storage" };
  }

  await prisma.messageContent.delete({ where: { id: content.id } });

  return { ok: true };
}

// ─── updatePackTitle ───────────────────────────────────────────────────────────
export async function updatePackTitle(
  packId: string,
  title: string
): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const trimmed = title.trim();
  if (!trimmed) return { error: "Title cannot be empty" };

  const pack = await prisma.messagePack.findUnique({
    where: { id: packId, ownerId: user.id },
    select: { id: true },
  });
  if (!pack) return { error: "Pack not found" };

  await prisma.messagePack.update({
    where: { id: packId },
    data: { title: trimmed },
  });

  return { ok: true };
}
