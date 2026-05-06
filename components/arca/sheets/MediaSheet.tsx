"use client";

import { useRouter } from "next/navigation";
import { Sheet } from "@/components/ui/sheet";
import MediaUploader from "@/components/arca/MediaUploader";
import NativeRecorder from "@/components/arca/NativeRecorder";
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
  const router = useRouter();

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="Media Vault"
      description="Upload files or record a voice / video message directly."
    >
      <div className="space-y-6">
        {/* Native recorder — voice and video */}
        <NativeRecorder
          packId={packId}
          userId={userId}
          onUploaded={() => router.refresh()}
        />

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-border/40" />
          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/40">or upload</span>
          <div className="flex-1 h-px bg-border/40" />
        </div>

        {/* File uploader */}
        <MediaUploader packId={packId} userId={userId} />

        {/* Gallery */}
        {initialItems.length > 0 && (
          <div className="space-y-3 pt-2 border-t border-border/30">
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
