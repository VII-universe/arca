"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Mic, Video, Square, Check, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { addMediaContent } from "@/app/actions/arca";

type Mode = "audio" | "video";
type Phase =
  | "idle"
  | "requesting"
  | "recording"
  | "preview"
  | "uploading"
  | "done"
  | "error";

function formatTime(secs: number) {
  const m = Math.floor(secs / 60).toString().padStart(2, "0");
  const s = (secs % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function bestMime(mode: Mode): string {
  if (mode === "audio") {
    for (const t of ["audio/webm;codecs=opus", "audio/webm", "audio/ogg", "audio/mp4"])
      if (MediaRecorder.isTypeSupported(t)) return t;
    return "";
  }
  for (const t of ["video/webm;codecs=vp9,opus", "video/webm", "video/mp4"])
    if (MediaRecorder.isTypeSupported(t)) return t;
  return "";
}

function ext(mime: string) {
  if (mime.includes("mp4")) return "mp4";
  if (mime.includes("ogg")) return "ogg";
  return "webm";
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  packId: string;
  userId: string;
  onUploaded: () => void;
}

export default function NativeRecorder({ packId, userId, onUploaded }: Props) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [mode, setMode] = useState<Mode>("audio");
  const [elapsed, setElapsed] = useState(0);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const blobRef = useRef<Blob | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const liveVideoRef = useRef<HTMLVideoElement>(null);

  // Wire live stream into the preview video element while recording
  useEffect(() => {
    if (liveVideoRef.current && streamRef.current && phase === "recording") {
      liveVideoRef.current.srcObject = streamRef.current;
    }
  }, [phase]);

  const stopTimer = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  };

  const begin = useCallback(async (m: Mode) => {
    setMode(m);
    setErrMsg(null);
    setPhase("requesting");

    try {
      const stream = await navigator.mediaDevices.getUserMedia(
        m === "audio" ? { audio: true } : { audio: true, video: { width: 1280, height: 720 } }
      );
      streamRef.current = stream;

      const mime = bestMime(m);
      const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
        blobRef.current = blob;
        setBlobUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        stopTimer();
        setPhase("preview");
      };

      recorder.start(250);
      setElapsed(0);
      setPhase("recording");
      timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    } catch (err) {
      stopTimer();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      setPhase("error");
      setErrMsg(
        err instanceof Error
          ? err.message.includes("denied")
            ? "Microphone / camera access was denied."
            : err.message
          : "Could not access media devices."
      );
    }
  }, []);

  const stop = () => recorderRef.current?.stop();

  const discard = () => {
    if (blobUrl) URL.revokeObjectURL(blobUrl);
    setBlobUrl(null);
    blobRef.current = null;
    setElapsed(0);
    setPhase("idle");
  };

  const save = async () => {
    if (!blobRef.current) return;
    setPhase("uploading");

    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setPhase("error"); setErrMsg("Session expired — please refresh."); return; }

    const mime = blobRef.current.type;
    const filename = `rec-${Date.now()}.${ext(mime)}`;
    const path = `${userId}/recordings/${packId}/${filename}`;

    const { error } = await supabase.storage
      .from("arca-media")
      .upload(path, blobRef.current, { contentType: mime, upsert: false });

    if (error) { setPhase("error"); setErrMsg(error.message); return; }

    const result = await addMediaContent(packId, path, mode === "audio" ? "AUDIO" : "VIDEO");
    if ("error" in result) { setPhase("error"); setErrMsg(result.error); return; }

    if (blobUrl) URL.revokeObjectURL(blobUrl);
    setBlobUrl(null);
    blobRef.current = null;
    setElapsed(0);
    setPhase("done");
    onUploaded();
    setTimeout(() => setPhase("idle"), 1800);
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  if (phase === "idle" || phase === "error") {
    return (
      <div className="space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
          Record
        </p>
        <div className="grid grid-cols-2 gap-2">
          <RecordBtn
            icon={<Mic className="size-4" />}
            label="Voice message"
            onClick={() => begin("audio")}
          />
          <RecordBtn
            icon={<Video className="size-4" />}
            label="Video message"
            onClick={() => begin("video")}
          />
        </div>
        {phase === "error" && errMsg && (
          <p className="text-xs text-destructive mt-1">{errMsg}</p>
        )}
      </div>
    );
  }

  if (phase === "requesting") {
    return (
      <div className="flex items-center gap-2 py-3 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Requesting {mode} access…
      </div>
    );
  }

  if (phase === "recording") {
    return (
      <div className="rounded-2xl border border-border/40 bg-muted/30 p-4 space-y-3">
        {/* Live video preview */}
        {mode === "video" && (
          <video
            ref={liveVideoRef}
            autoPlay
            muted
            playsInline
            className="w-full aspect-video rounded-xl bg-black object-cover"
          />
        )}

        {/* Timer + stop */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="relative flex size-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
              <span className="relative inline-flex rounded-full size-2.5 bg-red-500" />
            </span>
            <span className="text-sm font-mono text-foreground tabular-nums">
              {formatTime(elapsed)}
            </span>
          </div>
          <button
            onClick={stop}
            className="flex items-center gap-1.5 rounded-full bg-red-600 hover:bg-red-500 text-white px-4 py-1.5 text-xs font-semibold transition-colors"
          >
            <Square className="size-3 fill-white" />
            Stop
          </button>
        </div>
      </div>
    );
  }

  if (phase === "preview") {
    return (
      <div className="rounded-2xl border border-border/40 bg-muted/30 p-4 space-y-3">
        {blobUrl && mode === "audio" && (
          <audio controls src={blobUrl} className="w-full" />
        )}
        {blobUrl && mode === "video" && (
          <video
            controls
            src={blobUrl}
            className="w-full aspect-video rounded-xl bg-black object-cover"
          />
        )}
        <p className="text-xs text-muted-foreground text-center">
          {formatTime(elapsed)} recorded — happy with it?
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={discard}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-border/50 py-2 text-xs text-muted-foreground hover:text-foreground hover:border-border transition-colors"
          >
            <X className="size-3.5" />
            Discard
          </button>
          <button
            onClick={save}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-foreground text-background py-2 text-xs font-semibold hover:opacity-90 transition-opacity"
          >
            <Check className="size-3.5" />
            Save recording
          </button>
        </div>
      </div>
    );
  }

  if (phase === "uploading") {
    return (
      <div className="flex items-center gap-2 py-3 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Saving your recording…
      </div>
    );
  }

  // done
  return (
    <div className="flex items-center gap-2 py-3 text-sm text-emerald-600">
      <Check className="size-4" />
      Recording saved
    </div>
  );
}

function RecordBtn({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-2 rounded-xl border border-border/50 p-4",
        "text-muted-foreground hover:text-foreground hover:border-border hover:bg-accent/40",
        "transition-all duration-150 group"
      )}
    >
      <span className="text-muted-foreground/70 group-hover:text-foreground transition-colors">
        {icon}
      </span>
      <span className="text-[11px] font-medium leading-tight text-center">{label}</span>
    </button>
  );
}
