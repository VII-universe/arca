import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import QRCode from "qrcode";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";
import { LegacyBookDocument, type LegacyBookData } from "@/lib/pdf/LegacyBookDocument";
import { htmlToParagraphs } from "@/lib/pdf/html-to-text";
import { resolvePdfLocale, PDF_COPY, buildChapterSections } from "@/lib/pdf/pdf-copy";
import { APP_URL } from "@/lib/resend";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const pack = await prisma.messagePack.findFirst({
    where: { id, ownerId: user.id },
    select: {
      title: true,
      createdAt: true,
      livingLinkHash: true,
      owner: { select: { name: true, locale: true } },
      recipients: { select: { name: true } },
      contents: {
        where: { type: "TEXT" },
        orderBy: { createdAt: "asc" },
        select: { textBody: true },
      },
      chapters: {
        orderBy: { order: "asc" },
        select: { title: true, content: true, unlockDate: true, unlockDelayDays: true },
      },
      triggerCondition: { select: { triggeredAt: true } },
    },
  });

  // findFirst scoped to ownerId: a 404 here also covers "exists but isn't
  // yours" — never leak which case it is.
  if (!pack) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const locale = await resolvePdfLocale(pack.owner.locale);
  const copy = PDF_COPY[locale];

  const mainParagraphs = pack.contents.flatMap((c) => htmlToParagraphs(c.textBody));
  const chapters = buildChapterSections(pack.chapters, pack.triggerCondition?.triggeredAt ?? null, copy);

  const livingLinkUrl = `${APP_URL}/arca/${pack.livingLinkHash}`;
  const qrCodeDataUrl = await QRCode.toDataURL(livingLinkUrl, { width: 240, margin: 1 }).catch((err) => {
    // The QR code is a nice-to-have on the cover page — never let a
    // generation hiccup block the actual PDF export.
    console.error("[export-pdf] QR code generation failed:", err);
    return null;
  });

  const data: LegacyBookData = {
    packTitle: pack.title,
    ownerName: pack.owner.name,
    recipientNames: pack.recipients.map((r) => r.name),
    generatedOnLabel: copy.generatedOn(new Date().toLocaleDateString(copy.dateLocale)),
    forLabel: copy.for(pack.recipients.map((r) => r.name).join(", ")),
    mainMessageLabel: copy.mainMessage,
    chaptersLabel: copy.chapters,
    footerLabel: copy.footer,
    mainParagraphs,
    chapters,
    qrCodeDataUrl: qrCodeDataUrl ?? undefined,
    qrCodeLabel: qrCodeDataUrl ? copy.qrLabel : undefined,
  };

  const buffer = await renderToBuffer(<LegacyBookDocument data={data} />);

  const filename = `${pack.title.replace(/[^\p{L}\p{N}\- ]/gu, "").trim() || "arca"}.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
