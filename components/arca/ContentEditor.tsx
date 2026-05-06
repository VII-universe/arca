"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { upsertContent } from "@/app/actions/arca";
import RichTextEditor from "./RichTextEditor";

type SaveStatus = "idle" | "unsaved" | "saving" | "saved" | "error";

interface Props {
  packId: string;
  userId: string;
  initialContent: string;
}

const AUTOSAVE_DELAY_MS = 1600;

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

export default function ContentEditor({ packId, userId, initialContent }: Props) {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [wordCount, setWordCount] = useState(() => {
    const text = stripHtml(initialContent);
    return text ? text.split(/\s+/).filter(Boolean).length : 0;
  });
  const latestHtmlRef = useRef(initialContent);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const save = useCallback(
    async (html: string) => {
      setStatus("saving");
      const result = await upsertContent(packId, html);
      if ("ok" in result) setStatus("saved");
      else setStatus("error");
    },
    [packId]
  );

  const handleChange = useCallback(
    (html: string) => {
      latestHtmlRef.current = html;
      const text = stripHtml(html);
      setWordCount(text ? text.split(/\s+/).filter(Boolean).length : 0);
      setStatus("unsaved");

      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        save(latestHtmlRef.current);
      }, AUTOSAVE_DELAY_MS);
    },
    [save]
  );

  // Save immediately on page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (status === "unsaved") save(latestHtmlRef.current);
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [status, save]);

  return (
    <div className="flex flex-col w-full">
      {/* The editor lives inside a Paper container in the page — no nested card needed */}
      <RichTextEditor
        content={initialContent}
        onChange={handleChange}
        packId={packId}
        userId={userId}
      />
      <div className="flex items-center justify-between pt-4 mt-4 border-t border-border/30">
        <span className="text-xs text-muted-foreground/50 tabular-nums">
          {wordCount} {wordCount === 1 ? "word" : "words"}
        </span>
        <SaveStatusIndicator status={status} />
      </div>
    </div>
  );
}

function SaveStatusIndicator({ status }: { status: SaveStatus }) {
  const map: Record<SaveStatus, { label: string; className: string }> = {
    idle:    { label: "",                          className: "" },
    unsaved: { label: "Unsaved",                  className: "text-zinc-600" },
    saving:  { label: "Saving…",                  className: "text-zinc-500" },
    saved:   { label: "Saved",                    className: "text-emerald-600" },
    error:   { label: "Save failed — retrying",   className: "text-destructive" },
  };
  const { label, className } = map[status];
  if (!label) return null;
  return (
    <span className={`text-xs transition-colors duration-300 ${className}`}>
      {label}
    </span>
  );
}
