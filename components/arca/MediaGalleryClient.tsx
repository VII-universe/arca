"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteMedia } from "@/app/actions/arca";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MediaItem {
  id: string;
  type: "VIDEO" | "AUDIO" | "FILE" | "TEXT";
  s3FileKey: string;
  signedUrl: string | null;
  createdAt: Date;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function extractFilename(key: string) {
  // Path format: {userId}/{packId}/{timestamp}_{filename}
  const last = key.split("/").pop() ?? key;
  return last.replace(/^\d+_/, "");
}

function isImage(key: string) {
  return /\.(jpe?g|png|gif|webp)$/i.test(key);
}

function isAudio(key: string) {
  return /\.(mp3|m4a|wav|ogg|webm)$/i.test(key);
}

function isVideo(key: string) {
  return /\.(mp4|mov|webm|avi)$/i.test(key);
}

const TYPE_META = {
  VIDEO: { icon: "▶", bg: "bg-purple-950/60", fg: "text-purple-400", label: "Video" },
  AUDIO: { icon: "♪", bg: "bg-blue-950/60",   fg: "text-blue-400",   label: "Audio" },
  FILE:  { icon: "◻", bg: "bg-neutral-900",    fg: "text-neutral-500",label: "File"  },
  TEXT:  { icon: "✦", bg: "bg-neutral-900",    fg: "text-neutral-500",label: "Text"  },
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function MediaGalleryClient({ items }: { items: MediaItem[] }) {
  const router = useRouter();

  if (items.length === 0) {
    return (
      <p className="text-xs text-neutral-700 py-2">
        No media attached yet. Upload a file above.
      </p>
    );
  }

  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {items.map((item) => (
        <MediaCard
          key={item.id}
          item={item}
          onDeleted={() => router.refresh()}
        />
      ))}
    </ul>
  );
}

// ─── Individual card ─────────────────────────────────────────────────────────

function MediaCard({
  item,
  onDeleted,
}: {
  item: MediaItem;
  onDeleted: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const meta = TYPE_META[item.type] ?? TYPE_META.FILE;
  const filename = extractFilename(item.s3FileKey);

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteMedia(item.id);
      if ("ok" in result) {
        onDeleted();
      } else {
        alert(`Could not delete: ${result.error}`);
        setConfirmDelete(false);
      }
    });
  };

  return (
    <li
      className={[
        "group relative rounded-xl overflow-hidden border border-neutral-800",
        "bg-neutral-900 transition-opacity",
        isPending ? "opacity-50 pointer-events-none" : "",
      ].join(" ")}
    >
      {/* Preview area */}
      <div className="aspect-[4/3] flex items-center justify-center overflow-hidden bg-neutral-900/80">
        {item.signedUrl && isImage(item.s3FileKey) ? (
          // Image thumbnail
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.signedUrl}
            alt={filename}
            className="w-full h-full object-cover"
          />
        ) : item.signedUrl && isAudio(item.s3FileKey) ? (
          // Inline audio player
          <div className="w-full px-3 py-2 flex flex-col items-center gap-2">
            <span className={`text-2xl ${meta.fg}`}>{meta.icon}</span>
            <audio
              controls
              src={item.signedUrl}
              className="w-full h-6 opacity-80"
              style={{ accentColor: "#6b7280" }}
            />
          </div>
        ) : (
          // Icon + open link for video / docs
          <a
            href={item.signedUrl ?? "#"}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => { if (!item.signedUrl) e.preventDefault(); }}
            className={`flex flex-col items-center gap-2 p-4 rounded-lg ${meta.bg} w-full h-full justify-center hover:opacity-80 transition-opacity`}
          >
            <span className={`text-3xl ${meta.fg}`}>{meta.icon}</span>
            <span className={`text-[10px] font-semibold uppercase tracking-wider ${meta.fg}`}>
              {isVideo(item.s3FileKey) ? "Play" : "Open"} {meta.label}
            </span>
          </a>
        )}
      </div>

      {/* Filename */}
      <div className="px-3 py-2">
        <p className="text-[11px] text-neutral-500 truncate" title={filename}>
          {filename}
        </p>
      </div>

      {/* Delete button — appears on hover */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        {confirmDelete ? (
          <div className="flex gap-1">
            <button
              onClick={handleDelete}
              className="rounded bg-red-900/90 px-2 py-1 text-[10px] font-semibold text-red-300 hover:bg-red-800 transition-colors"
            >
              Delete
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="rounded bg-neutral-800/90 px-2 py-1 text-[10px] text-neutral-400 hover:bg-neutral-700 transition-colors"
            >
              No
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            className="rounded bg-neutral-900/90 px-2 py-1 text-[10px] text-neutral-500 hover:text-red-400 hover:bg-neutral-800 transition-colors border border-neutral-700"
          >
            ✕
          </button>
        )}
      </div>

      {isPending && (
        <div className="absolute inset-0 flex items-center justify-center bg-neutral-950/60 rounded-xl">
          <span className="text-xs text-neutral-400">Deleting…</span>
        </div>
      )}
    </li>
  );
}
