import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";
import { ContentType } from "@/lib/prisma/generated";
import ContentEditor from "@/components/arca/ContentEditor";
import ArcaPrompts from "@/components/arca/ArcaPrompts";
import MediaUploader from "@/components/arca/MediaUploader";
import MediaGallery from "@/components/arca/MediaGallery";
import RecipientManager from "@/components/arca/RecipientManager";
import TriggerSettings from "@/components/arca/TriggerSettings";
import ActivatePanel from "@/components/arca/ActivatePanel";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const pack = await prisma.messagePack.findUnique({
    where: { id },
    select: { title: true },
  });
  return { title: pack ? `${pack.title} — ARCA` : "Edit Arca" };
}

export default async function EditArcaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch all pack data in one round-trip
  const pack = await prisma.messagePack.findUnique({
    where: { id, ownerId: user.id },
    select: {
      id: true,
      title: true,
      type: true,
      status: true,
      contents: {
        where: { type: ContentType.TEXT },
        select: { textBody: true },
        take: 1,
      },
      recipients: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          challengeQuestion: true,
        },
      },
      triggerCondition: {
        select: {
          type: true,
          executeAtDate: true,
          inactivityDaysLimit: true,
          gracePeriodDays: true,
        },
      },
    },
  });

  if (!pack) notFound();

  const initialContent = pack.contents[0]?.textBody ?? "";
  const hasRecipients = pack.recipients.length > 0;
  const hasTrigger = pack.triggerCondition !== null;

  // Serialize dates before passing to Client Components
  const triggerForClient = pack.triggerCondition
    ? {
        ...pack.triggerCondition,
        type: pack.triggerCondition.type as "SPECIFIC_DATE" | "INACTIVITY" | "MANUAL_EMERGENCY",
        executeAtDate: pack.triggerCondition.executeAtDate
          ? new Date(pack.triggerCondition.executeAtDate)
          : null,
      }
    : null;

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* ── Top bar ──────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-10 shrink-0 flex items-center justify-between px-5 py-3 border-b border-border/60 bg-background/90 backdrop-blur-sm">
        <div className="flex items-center gap-4 min-w-0">
          <Link
            href="/dashboard"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            ← Dashboard
          </Link>
          <div className="h-3.5 w-px bg-border shrink-0" />
          <h1 className="text-sm font-medium text-foreground truncate">
            {pack.title}
          </h1>
          <TypeBadge type={pack.type} />
        </div>

        <StatusIndicator status={pack.status} />
      </header>

      {/* ── Scrollable canvas ─────────────────────────────────────────── */}
      <div className="flex flex-1">
        {/* Main column */}
        <main className="flex-1 flex flex-col min-w-0 divide-y divide-border/40">

          {/* 1. Writing surface */}
          <section className="px-6 pt-10 pb-10 md:px-10 lg:px-16 min-h-[44vh] flex flex-col justify-center">
            <ContentEditor packId={pack.id} initialContent={initialContent} />
          </section>

          {/* 2. Media Vault */}
          <section className="px-6 py-8 md:px-10 lg:px-16 space-y-5">
            <SectionHeader
              label="Media Vault"
              description={
                pack.type === "EMOTIONAL"
                  ? "Attach photos, voice messages, or video messages."
                  : "Attach documents, scans, or audio instructions."
              }
            />
            <MediaUploader packId={pack.id} userId={user.id} />
            <div className="space-y-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/40">
                Attached files
              </p>
              <Suspense fallback={<GalleryPlaceholder />}>
                <MediaGallery packId={pack.id} userId={user.id} />
              </Suspense>
            </div>
          </section>

          {/* 3. Recipients */}
          <section className="px-6 py-8 md:px-10 lg:px-16 space-y-5">
            <SectionHeader
              label="Recipients"
              description="Who should receive this Arca when it is triggered?"
            />
            <RecipientManager
              packId={pack.id}
              initialRecipients={pack.recipients}
            />
          </section>

          {/* 4. Delivery Trigger */}
          <section className="px-6 py-8 md:px-10 lg:px-16 space-y-5">
            <SectionHeader
              label="Delivery Trigger"
              description="When should this Arca be released to your recipients?"
            />
            <TriggerSettings
              packId={pack.id}
              packType={pack.type}
              initialTrigger={triggerForClient}
            />
          </section>

          {/* 5. Activate */}
          <section className="px-6 py-8 md:px-10 lg:px-16">
            <ActivatePanel
              packId={pack.id}
              packStatus={pack.status}
              hasRecipients={hasRecipients}
              hasTrigger={hasTrigger}
            />
          </section>
        </main>

        {/* Prompts sidebar (lg+) */}
        <aside className="hidden lg:flex flex-col w-64 xl:w-72 shrink-0 border-l border-border/50 px-5 py-7 sticky top-[49px] self-start max-h-[calc(100vh-49px)] overflow-y-auto bg-muted/[0.03]">
          <ArcaPrompts packType={pack.type} />
        </aside>
      </div>
    </div>
  );
}

// ─── Small shared components ──────────────────────────────────────────────────

function TypeBadge({ type }: { type: "EMOTIONAL" | "PRACTICAL" }) {
  const styles =
    type === "EMOTIONAL"
      ? "bg-rose-950/60 text-rose-400 border-rose-900/60"
      : "bg-blue-950/60 text-blue-400 border-blue-900/60";
  return (
    <span
      className={`shrink-0 inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${styles}`}
    >
      {type === "EMOTIONAL" ? "Emotional" : "Practical"}
    </span>
  );
}

function StatusIndicator({ status }: { status: string }) {
  const isActive = status !== "DRAFT";
  return (
    <div className="flex items-center gap-2 shrink-0">
      {isActive && (
        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
      )}
      <span
        className={`text-xs font-medium ${
          isActive ? "text-emerald-500" : "text-muted-foreground"
        }`}
      >
        {isActive
          ? status.charAt(0) + status.slice(1).toLowerCase().replace("_", " ")
          : "Draft"}
      </span>
    </div>
  );
}

function SectionHeader({
  label,
  description,
}: {
  label: string;
  description: string;
}) {
  return (
    <div className="space-y-1">
      <h2 className="text-sm font-semibold text-foreground">{label}</h2>
      <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}

function GalleryPlaceholder() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {[...Array(2)].map((_, i) => (
        <div
          key={i}
          className="aspect-[4/3] rounded-xl bg-muted border border-border animate-pulse"
        />
      ))}
    </div>
  );
}
