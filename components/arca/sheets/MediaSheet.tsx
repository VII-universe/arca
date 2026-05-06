"use client";

import { Sheet } from "@/components/ui/sheet";
import MediaUploader from "@/components/arca/MediaUploader";
import MediaGalleryClient, {
  type MediaItem,
} from "@/components/arca/MediaGalleryClient";

interface Props {
  packId: string;
  userId: string;
  initialItems: MediaItem[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function MediaSheet({
  packId,
  userId,
  initialItems,
  open,
  onOpenChange,
}: Props) {
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="Media Vault"
      description="Attach photos, audio recordings, videos, or documents."
    >
      <div className="space-y-7">
        <MediaUploader packId={packId} userId={userId} />

        {initialItems.length > 0 && (
          <div className="space-y-3">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
              Attached files
            </p>
            <MediaGalleryClient items={initialItems} />
          </div>
        )}
      </div>
    </Sheet>
  );
}
