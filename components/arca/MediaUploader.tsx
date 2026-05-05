"use client";

import { useState, useRef, useCallback, DragEvent, ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { addMediaContent } from "@/app/actions/arca";

// ─── Types ────────────────────────────────────────────────────────────────────

type UploadState =
  | { phase: "idle" }
  | { phase: "validating" }
  | { phase: "uploading"; filename: string; progress: number }
  | { phase: "done"; filename: string }
  | { phase: "error"; message: string };

type MediaContentType = "VIDEO" | "AUDIO" | "FILE";

interface FileSpec {
  label: string;
  contentType: MediaContentType;
  maxBytes: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_50MB = 50 * 1024 * 1024;
const MAX_10MB = 10 * 1024 * 1024;

const ACCEPTED: Record<string, FileSpec> = {
  "image/jpeg":    { label: "Image",    contentType: "FILE",  maxBytes: MAX_10MB },
  "image/png":     { label: "Image",    contentType: "FILE",  maxBytes: MAX_10MB },
  "image/gif":     { label: "Image",    contentType: "FILE",  maxBytes: MAX_10MB },
  "image/webp":    { label: "Image",    contentType: "FILE",  maxBytes: MAX_10MB },
  "video/mp4":     { label: "Video",    contentType: "VIDEO", maxBytes: MAX_50MB },
  "video/quicktime":{ label: "Video",   contentType: "VIDEO", maxBytes: MAX_50MB },
  "video/webm":    { label: "Video",    contentType: "VIDEO", maxBytes: MAX_50MB },
  "audio/mpeg":    { label: "Audio",    contentType: "AUDIO", maxBytes: MAX_50MB },
  "audio/mp4":     { label: "Audio",    contentType: "AUDIO", maxBytes: MAX_50MB },
  "audio/wav":     { label: "Audio",    contentType: "AUDIO", maxBytes: MAX_50MB },
  "audio/ogg":     { label: "Audio",    contentType: "AUDIO", maxBytes: MAX_50MB },
  "audio/webm":    { label: "Audio",    contentType: "AUDIO", maxBytes: MAX_50MB },
  "application/pdf": { label: "PDF",   contentType: "FILE",  maxBytes: MAX_50MB },
  "application/msword": { label: "Doc", contentType: "FILE", maxBytes: MAX_50MB },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
                   { label: "Doc",      contentType: "FILE",  maxBytes: MAX_50MB },
};

const ACCEPT_ATTR =
  "image/jpeg,image/png,image/gif,image/webp,video/mp4,video/quicktime,video/webm,audio/mpeg,audio/mp4,audio/wav,audio/ogg,audio/webm,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sanitize(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9.\-_]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 120);
}

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

// ─── XHR upload (gives real progress; Supabase storage-js uses plain fetch) ──

function xhrUpload(
  url: string,
  file: File,
  headers: Record<string, string>,
  onProgress: (pct: number) => void,
  signal: AbortSignal
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    signal.addEventListener("abort", () => {
      xhr.abort();
      reject(new DOMException("Upload aborted", "AbortError"));
    });

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    });

    xhr.addEventListener("load", () => {
      if (xhr.status === 200 || xhr.status === 201) {
        resolve();
      } else {
        let msg = `Upload failed (HTTP ${xhr.status})`;
        try {
          const body = JSON.parse(xhr.responseText);
          if (body?.error) msg = body.error;
        } catch {}
        reject(new Error(msg));
      }
    });

    xhr.addEventListener("error", () => reject(new Error("Network error during upload")));
    xhr.addEventListener("timeout", () => reject(new Error("Upload timed out")));

    xhr.open("POST", url);
    Object.entries(headers).forEach(([k, v]) => xhr.setRequestHeader(k, v));
    xhr.timeout = 10 * 60 * 1000; // 10 min timeout for large files
    xhr.send(file);
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  packId: string;
  userId: string;
}

export default function MediaUploader({ packId, userId }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const [state, setState] = useState<UploadState>({ phase: "idle" });
  const [isDragging, setIsDragging] = useState(false);

  // ── Validate ───────────────────────────────────────────────────────────────

  function validate(file: File): string | null {
    const spec = ACCEPTED[file.type];
    if (!spec) return `"${file.name}" is not a supported file type.`;
    if (file.size > spec.maxBytes) {
      return `"${file.name}" is too large. Maximum is ${formatBytes(spec.maxBytes)}.`;
    }
    return null;
  }

  // ── Upload ─────────────────────────────────────────────────────────────────

  const upload = useCallback(
    async (file: File) => {
      const validationError = validate(file);
      if (validationError) {
        setState({ phase: "error", message: validationError });
        return;
      }

      const spec = ACCEPTED[file.type]!;
      const timestamp = Date.now();
      const safeName = sanitize(file.name);
      const storagePath = `${userId}/${packId}/${timestamp}_${safeName}`;

      setState({ phase: "uploading", filename: file.name, progress: 0 });

      const supabase = createClient();

      // Get the current session access token for the Authorization header
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setState({ phase: "error", message: "Session expired. Please refresh and try again." });
        return;
      }

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

      // Encode each path segment so filenames with special chars are safe
      const encodedPath = storagePath
        .split("/")
        .map(encodeURIComponent)
        .join("/");

      const uploadUrl = `${supabaseUrl}/storage/v1/object/arca-media/${encodedPath}`;

      abortRef.current = new AbortController();

      try {
        await xhrUpload(
          uploadUrl,
          file,
          {
            Authorization: `Bearer ${session.access_token}`,
            apikey: anonKey,
            "Content-Type": file.type,
            "x-upsert": "false",
          },
          (pct) =>
            setState({ phase: "uploading", filename: file.name, progress: pct }),
          abortRef.current.signal
        );

        // File is in Storage — create the Prisma record
        const result = await addMediaContent(packId, storagePath, spec.contentType);

        if ("error" in result) {
          setState({ phase: "error", message: result.error });
          return;
        }

        setState({ phase: "done", filename: file.name });

        // Refresh the Server Component tree so the gallery re-fetches
        router.refresh();

        // Reset to idle after a short success flash
        setTimeout(() => setState({ phase: "idle" }), 2000);
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === "AbortError") {
          setState({ phase: "idle" });
        } else {
          setState({
            phase: "error",
            message:
              err instanceof Error ? err.message : "Upload failed. Please try again.",
          });
        }
      } finally {
        abortRef.current = null;
      }
    },
    [packId, userId, router]
  );

  // ── Drag handlers ──────────────────────────────────────────────────────────

  const onDragOver = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const onDragLeave = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) upload(file);
  };

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) upload(file);
    // Reset so the same file can be re-selected after an error
    e.target.value = "";
  };

  const cancel = () => abortRef.current?.abort();

  // ── Render ─────────────────────────────────────────────────────────────────

  const isUploading = state.phase === "uploading";
  const isBlocked = isUploading || state.phase === "validating";

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => !isBlocked && inputRef.current?.click()}
        className={[
          "relative rounded-xl border transition-all duration-200 overflow-hidden",
          isBlocked
            ? "cursor-default border-neutral-700"
            : "cursor-pointer hover:border-neutral-600 hover:bg-neutral-900/40",
          isDragging
            ? "border-neutral-500 bg-neutral-900/60 scale-[1.01]"
            : "border-dashed border-neutral-800 bg-neutral-900/20",
        ].join(" ")}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT_ATTR}
          onChange={onChange}
          className="sr-only"
          tabIndex={-1}
        />

        {/* Idle / drag state */}
        {(state.phase === "idle" || state.phase === "validating") && (
          <div className="flex flex-col items-center gap-2 px-6 py-8 text-center">
            <div className="text-2xl text-neutral-700 select-none">
              {isDragging ? "↓" : "↑"}
            </div>
            <p className="text-sm text-neutral-500">
              {isDragging ? "Drop to upload" : "Drag a file here, or click to browse"}
            </p>
            <p className="text-[11px] text-neutral-700">
              Images · Video · Audio · PDF · Word — max 50 MB
            </p>
          </div>
        )}

        {/* Uploading state */}
        {state.phase === "uploading" && (
          <div className="px-6 py-6 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-neutral-300 truncate">{state.filename}</p>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs font-mono text-neutral-500 tabular-nums">
                  {state.progress}%
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); cancel(); }}
                  className="text-[10px] text-neutral-700 hover:text-red-400 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>

            {/* Progress bar */}
            <div className="h-1 rounded-full bg-neutral-800 overflow-hidden">
              <div
                className="h-full bg-neutral-200 rounded-full transition-all duration-150"
                style={{ width: `${state.progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Done state */}
        {state.phase === "done" && (
          <div className="flex items-center gap-3 px-6 py-5">
            <span className="text-emerald-500 text-sm">✓</span>
            <p className="text-sm text-emerald-400 truncate">{state.filename} uploaded</p>
          </div>
        )}
      </div>

      {/* Error message (sits outside the drop zone so it's always readable) */}
      {state.phase === "error" && (
        <div className="flex items-start justify-between gap-3 rounded-lg border border-red-900/60 bg-red-950/40 px-4 py-3">
          <p className="text-sm text-red-400 leading-snug">{state.message}</p>
          <button
            onClick={() => setState({ phase: "idle" })}
            className="shrink-0 text-xs text-red-700 hover:text-red-400 transition-colors mt-0.5"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}
