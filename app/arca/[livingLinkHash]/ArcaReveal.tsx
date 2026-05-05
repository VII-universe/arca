// Pure render — no "use client" needed.
// All data (including signed URLs) is resolved server-side before this renders.

export interface RevealContent {
  id: string;
  type: "TEXT" | "VIDEO" | "AUDIO" | "FILE";
  textBody: string | null;
  s3FileKey: string | null;
  signedUrl: string | null;
}

interface Props {
  ownerName: string;
  packType: "EMOTIONAL" | "PRACTICAL";
  createdAt: Date;
  contents: RevealContent[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function ext(key: string) {
  return key.split(".").pop()?.toLowerCase() ?? "";
}

function isImageKey(key: string) {
  return ["jpg", "jpeg", "png", "gif", "webp"].includes(ext(key));
}

function extractFilename(key: string) {
  return (key.split("/").pop() ?? key).replace(/^\d+_/, "");
}

function formatDate(date: Date) {
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ArcaReveal({
  ownerName,
  packType,
  createdAt,
  contents,
}: Props) {
  const textItem = contents.find((c) => c.type === "TEXT");
  const mediaItems = contents.filter(
    (c) => c.type !== "TEXT" && c.s3FileKey
  );

  const accentColor =
    packType === "EMOTIONAL" ? "text-rose-500" : "text-blue-500";

  return (
    <div className="min-h-screen bg-background">

      {/* ── Minimal top bar ──────────────────────────────────────────── */}
      <header className="border-b border-border/40 px-6 py-4 flex items-center justify-center gap-3">
        <span className={`text-xs ${accentColor}`}>
          {packType === "EMOTIONAL" ? "✦" : "⬡"}
        </span>
        <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground/60">
          ARCA — A personal message
        </p>
      </header>

      {/* ── Document area ─────────────────────────────────────────────── */}
      <main className="mx-auto max-w-[680px] px-6 py-16 md:py-24">

        {/* From + date */}
        <div className="mb-12 space-y-1">
          <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground/60">
            From
          </p>
          <p className="text-lg font-light text-foreground">{ownerName}</p>
          <p className="text-xs text-muted-foreground/40 mt-1">
            Written {formatDate(createdAt)}
          </p>
        </div>

        {/* ── Text content ─────────────────────────────────────────────── */}
        {textItem?.textBody && (
          <div
            className="prose prose-invert prose-lg max-w-none prose-p:font-light prose-p:leading-[1.9] prose-p:text-zinc-200 prose-headings:font-serif prose-headings:font-normal prose-headings:text-zinc-100 prose-strong:text-zinc-100 prose-em:font-serif prose-em:text-zinc-300 prose-blockquote:border-l-white/20 prose-blockquote:text-zinc-400 prose-li:text-zinc-200 prose-ul:marker:text-zinc-600 prose-ol:marker:text-zinc-600"
            dangerouslySetInnerHTML={{ __html: textItem.textBody }}
          />
        )}

        {!textItem?.textBody && mediaItems.length === 0 && (
          <p className="text-muted-foreground italic text-sm font-serif">
            This Arca contains no written message.
          </p>
        )}

        {/* ── Media items ──────────────────────────────────────────────── */}
        {mediaItems.length > 0 && (
          <div className="mt-16 space-y-10 border-t border-border/50 pt-12">
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/40">
              Attached media
            </p>
            <div className="space-y-8">
              {mediaItems.map((item) => (
                <MediaBlock key={item.id} item={item} />
              ))}
            </div>
          </div>
        )}

        {/* ── Seal / footer ─────────────────────────────────────────────── */}
        <div className="mt-20 pt-8 border-t border-border/40 flex flex-col items-center gap-3">
          <span className="text-muted-foreground/20 text-lg select-none">◈</span>
          <p className="text-[10px] text-muted-foreground/30 tracking-widest uppercase text-center">
            Delivered securely by ARCA
          </p>
        </div>
      </main>
    </div>
  );
}

// ─── Individual media block ───────────────────────────────────────────────────

function MediaBlock({ item }: { item: RevealContent }) {
  if (!item.signedUrl || !item.s3FileKey) return null;

  const filename = extractFilename(item.s3FileKey);

  if (item.type === "FILE" && isImageKey(item.s3FileKey)) {
    return (
      <figure className="space-y-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.signedUrl}
          alt={filename}
          className="w-full rounded-xl border border-border object-cover"
          loading="lazy"
        />
        <figcaption className="text-xs text-muted-foreground/40 text-center">
          {filename}
        </figcaption>
      </figure>
    );
  }

  if (item.type === "VIDEO") {
    return (
      <figure className="space-y-2">
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <video
          controls
          src={item.signedUrl}
          className="w-full rounded-xl border border-border bg-muted"
        />
        <figcaption className="text-xs text-muted-foreground/40 text-center">
          {filename}
        </figcaption>
      </figure>
    );
  }

  if (item.type === "AUDIO") {
    return (
      <div className="rounded-xl border border-border bg-muted/40 px-6 py-5 space-y-3">
        <div className="flex items-center gap-3">
          <span className="text-muted-foreground text-lg">♪</span>
          <p className="text-sm text-muted-foreground truncate flex-1">{filename}</p>
        </div>
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <audio controls src={item.signedUrl} className="w-full" />
      </div>
    );
  }

  // Document / PDF — download link
  return (
    <a
      href={item.signedUrl}
      target="_blank"
      rel="noopener noreferrer"
      download={filename}
      className="flex items-center gap-4 rounded-xl border border-border bg-muted/40 px-5 py-4 hover:border-border/80 hover:bg-muted/60 transition-colors group"
    >
      <span className="text-muted-foreground text-xl shrink-0">◻</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground truncate">
          {filename}
        </p>
        <p className="text-xs text-muted-foreground/60 mt-0.5">Click to download</p>
      </div>
      <span className="text-muted-foreground/60 group-hover:text-muted-foreground transition-colors text-sm shrink-0">
        ↓
      </span>
    </a>
  );
}
