import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import QRCode from "qrcode";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";
import { VaultBookDocument, type VaultBookData } from "@/lib/pdf/VaultBookDocument";
import { htmlToParagraphs } from "@/lib/pdf/html-to-text";
import { resolvePdfLocale, PDF_COPY, buildChapterSections } from "@/lib/pdf/pdf-copy";
import { APP_URL } from "@/lib/resend";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { name: true, locale: true } });
  if (!dbUser) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const packs = await prisma.messagePack.findMany({
    where: { ownerId: user.id },
    orderBy: { createdAt: "asc" },
    select: {
      title: true,
      livingLinkHash: true,
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

  const locale = await resolvePdfLocale(dbUser.locale);
  const copy = PDF_COPY[locale];

  const packSections = await Promise.all(
    packs.map(async (pack) => {
      const mainParagraphs = pack.contents.flatMap((c) => htmlToParagraphs(c.textBody));
      const chapters = buildChapterSections(pack.chapters, pack.triggerCondition?.triggeredAt ?? null, copy);
      const livingLinkUrl = `${APP_URL}/arca/${pack.livingLinkHash}`;
      const qrCodeDataUrl = await QRCode.toDataURL(livingLinkUrl, { width: 200, margin: 1 }).catch((err) => {
        console.error("[export-vault] QR code generation failed:", err);
        return null;
      });

      return {
        packTitle: pack.title,
        forLabel: copy.for(pack.recipients.map((r) => r.name).join(", ")),
        qrCodeDataUrl: qrCodeDataUrl ?? undefined,
        mainParagraphs,
        chapters,
      };
    })
  );

  const data: VaultBookData = {
    ownerName: dbUser.name,
    generatedOnLabel: copy.generatedOn(new Date().toLocaleDateString(copy.dateLocale)),
    packCountLabel: copy.packCount(packs.length),
    mainMessageLabel: copy.mainMessage,
    chaptersLabel: copy.chapters,
    footerLabel: copy.footer,
    packs: packSections,
  };

  const buffer = await renderToBuffer(<VaultBookDocument data={data} />);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": "attachment; filename=\"arca-vault.pdf\"",
    },
  });
}
