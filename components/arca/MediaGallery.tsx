// Server Component — fetches media records + generates 1-hour signed URLs,
// then passes the data to the Client Component for interactivity.
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";
import MediaGalleryClient, { type MediaItem } from "./MediaGalleryClient";

interface Props {
  packId: string;
  userId: string;
}

export default async function MediaGallery({ packId, userId }: Props) {
  const supabase = await createClient();

  const contents = await prisma.messageContent.findMany({
    where: {
      messagePackId: packId,
      messagePack: { ownerId: userId },
      NOT: { s3FileKey: null },
      // Exclude TEXT records (they have no file key in practice, but be explicit)
      type: { not: "TEXT" },
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, type: true, s3FileKey: true, createdAt: true },
  });

  // Generate signed URLs for all files in one pass
  const nullableItems = await Promise.all(
    contents.map(async (c) => {
      // s3FileKey is guaranteed non-null by the NOT filter above, but TS sees null
      if (!c.s3FileKey) return null;
      const { data } = await supabase.storage
        .from("arca-media")
        .createSignedUrl(c.s3FileKey, 60 * 60); // 1-hour TTL

      return {
        id: c.id,
        type: c.type as MediaItem["type"],
        s3FileKey: c.s3FileKey,
        signedUrl: data?.signedUrl ?? null,
        createdAt: c.createdAt,
      };
    })
  );
  const items: MediaItem[] = nullableItems.filter(Boolean) as MediaItem[];

  return <MediaGalleryClient items={items} />;
}
