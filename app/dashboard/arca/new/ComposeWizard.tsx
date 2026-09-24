"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useTranslations, useLocale } from "next-intl";
import { createPackFull, addMediaContent } from "@/app/actions/arca";
import { createClient } from "@/lib/supabase/client";
import ArcaRichEditor, { type ArcaRichEditorHandle } from "@/components/arca/ArcaRichEditor";
import { Avatar } from "@/components/arca/Avatar";
import { computeAgeMilestoneDate, computeRelativeOffsetDate, isFutureDate, nextValidTargetAge } from "@/lib/triggers/milestone";

// ── Icons ─────────────────────────────────────────────────────────────────────

const Ic = ({ children, size = 16, style }: { children: React.ReactNode; size?: number; style?: React.CSSProperties }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" style={style}>
    {children}
  </svg>
);
const IcText     = () => <Ic><path d="M5 6h14M5 12h14M5 18h9"/></Ic>;
const IcVoice    = () => <Ic><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0"/><path d="M12 18v3"/></Ic>;
const IcVideo    = () => <Ic><rect x="3" y="6" width="13" height="12" rx="2"/><path d="M16 10l5-3v10l-5-3"/></Ic>;
const IcPhoto    = () => <Ic><rect x="3.5" y="5" width="17" height="14" rx="2"/><circle cx="9" cy="10.5" r="1.5"/><path d="M4 17l5-4 4 3 3-2 4 3"/></Ic>;
const IcArrow    = () => <Ic><path d="M5 12h14M13 6l6 6-6 6"/></Ic>;
const IcCalPlus  = () => <Ic><rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 9.5h17"/><path d="M12 13v5M9.5 15.5h5"/></Ic>;
const IcHeart    = () => <Ic><path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10Z"/></Ic>;
const IcLock     = () => <Ic><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></Ic>;
const IcChevron  = () => <Ic><path d="M9 6l6 6-6 6"/></Ic>;
const IcSparkle  = () => <Ic><path d="M12 4v4M12 16v4M4 12h4M16 12h4M6.5 6.5l2.8 2.8M14.7 14.7l2.8 2.8M17.5 6.5l-2.8 2.8M9.3 14.7L6.5 17.5"/></Ic>;
const IcMic      = IcVoice;
const IcEye      = () => <Ic><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></Ic>;
const IcBack     = () => <Ic><path d="M15 6l-6 6 6 6"/></Ic>;
const IcPlus     = () => <Ic><path d="M12 5v14M5 12h14"/></Ic>;
const IcX        = () => <Ic size={12}><path d="M18 6L6 18M6 6l12 12"/></Ic>;
const IcCheck    = () => <Ic size={12}><path d="M5 12l4 4 10-10"/></Ic>;
const IcHourglass= () => <Ic><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.2 2"/></Ic>;
const IcShield   = () => <Ic><path d="M12 3l8 3v5c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-3Z"/><path d="M9 12l2 2 4-4"/></Ic>;

// ── Types ─────────────────────────────────────────────────────────────────────

type Kind = "text" | "voice" | "video" | "photo";
type Trigger = "date" | "event" | "sealed" | "age" | "relative";
type PackType = "EMOTIONAL" | "PRACTICAL";
type MessageMode = "SELF" | "LEGACY";

interface Recipient { id: string; name: string; email: string | null; groupId?: string | null; avatarUrl?: string | null; birthday?: string | null; }
interface ContactGroup { id: string; name: string; color: string; emoji: string | null; }
interface NewPerson { name: string; email: string; birthday?: string }

function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function formatCzDate(d: Date, dateLocale: string): string {
  return d.toLocaleDateString(dateLocale, { day: "numeric", month: "long", year: "numeric" });
}

interface Props {
  recipients: Recipient[];
  contactGroups: ContactGroup[];
  isPro: boolean;
  currentUser: { name: string; email: string };
  prefilledRecipientId?: string;
  prefilledOccasion?: "birthday" | "anniversary";
  prefilledDate?: string;
  // Fáze 2 — "Napsat odpověď" on a delivered SELF message. When set, the
  // wizard skips ModeSelect straight into SELF, defaults the trigger to
  // "relative" (1 year), and pre-fills the original message's recipient
  // (still editable — same pattern as prefilledRecipientId, just sourced
  // from the message being replied to instead of a reminder link).
  replyToMessageId?: string;
  replyRecipient?: { id: string; name: string; email: string | null } | null;
}

const MODE_META: { id: MessageMode; Ic: React.ComponentType }[] = [
  { id: "SELF", Ic: IcHourglass },
  { id: "LEGACY", Ic: IcShield },
];

const KIND_META: { id: Kind; Ic: React.ComponentType }[] = [
  { id: "text",  Ic: IcText },
  { id: "voice", Ic: IcVoice },
  { id: "video", Ic: IcVideo },
  { id: "photo", Ic: IcPhoto },
];

const TONE_GRADS: Record<string, string> = {
  clay: "linear-gradient(135deg, #B6754A, #8B5430)",
  sage: "linear-gradient(135deg, #7C8A6B, #5C6B4D)",
  sky:  "linear-gradient(135deg, #6F8AA8, #4B6685)",
  ink:  "linear-gradient(135deg, #3D3830, #1C1A16)",
};
const TONES = ["clay", "sage", "sky", "ink"];
function toneFor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return TONES[Math.abs(h) % TONES.length];
}
function initials(name: string): string {
  return name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");
}

// ── Step header ───────────────────────────────────────────────────────────────

function Step({ n, label }: { n: string; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
      <span style={{ fontFamily: "var(--f-mono)", color: "var(--accent)", fontSize: 12 }}>{n}</span>
      <h3 style={{ fontSize: 15, fontWeight: 550, letterSpacing: "-.005em", margin: 0 }}>{label}</h3>
      <div style={{ flex: 1, height: 1, background: "var(--hairline)" }} />
    </div>
  );
}

// ── Voice recorder — real mic capture via MediaRecorder ────────────────────────

function bestAudioMime(): string {
  for (const t of ["audio/webm;codecs=opus", "audio/webm", "audio/ogg", "audio/mp4"]) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(t)) return t;
  }
  return "";
}
function bestVideoMime(): string {
  for (const t of ["video/webm;codecs=vp9,opus", "video/webm", "video/mp4"]) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(t)) return t;
  }
  return "";
}

function VoiceRecorder({ blob, onChange }: { blob: Blob | null; onChange: (b: Blob | null) => void }) {
  const t = useTranslations("Compose.voiceRecorder");
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!recording) return;
    const id = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [recording]);

  // Regenerate the preview URL from the lifted `blob` prop whenever it
  // changes — including on mount. The blob itself lives in the parent
  // (ComposeWizard), so it survives switching away to another "Forma" tab
  // and back; without this, only the local previewSrc was reset on that
  // remount, so a recording that was still there internally looked lost —
  // the UI dropped back to the empty "start recording" state instead of
  // showing playback.
  useEffect(() => {
    if (!blob) { setPreviewSrc(null); return; }
    const url = URL.createObjectURL(blob);
    setPreviewSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [blob]);

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach((tr) => tr.stop());
  }, []);

  async function start() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = bestAudioMime();
      const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      recorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        const b = new Blob(chunksRef.current, { type: recorder.mimeType });
        stream.getTracks().forEach((tr) => tr.stop());
        streamRef.current = null;
        onChange(b);
      };
      recorder.start(250);
      setElapsed(0);
      setRecording(true);
    } catch {
      setError(t("micError"));
    }
  }
  function stop() {
    recorderRef.current?.stop();
    setRecording(false);
  }
  function discard() {
    setElapsed(0);
    onChange(null);
  }

  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");

  if (blob && previewSrc) {
    return (
      <div className="arca-card" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ color: "var(--accent)" }}><IcCheck /></span>
          <span style={{ fontSize: 13, fontWeight: 500 }}>{t("ready")}</span>
        </div>
        <audio controls src={previewSrc} style={{ width: "100%" }} />
        <button type="button" onClick={discard} className="arca-btn sm arca-btn--ghost" style={{ alignSelf: "flex-start" }}>
          <IcX /> {t("recordAgain")}
        </button>
      </div>
    );
  }

  return (
    <div className="arca-card" style={{ padding: 28, display: "flex", alignItems: "center", gap: 28 }}>
      <button
        type="button"
        onClick={recording ? stop : start}
        style={{
          width: 64, height: 64, borderRadius: "50%",
          background: recording ? "var(--accent)" : "var(--ink)",
          color: "#fff", border: "none", cursor: "pointer",
          display: "grid", placeItems: "center",
          boxShadow: recording ? "0 0 0 8px var(--accent-tint)" : "var(--sh-2)",
          transition: "all .2s ease", flexShrink: 0,
        }}
      >
        {recording
          ? <div style={{ width: 18, height: 18, background: "#fff", borderRadius: 3 }} />
          : <IcMic />}
      </button>
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ fontFamily: "var(--f-serif)", fontSize: 22 }}>{mm}:{ss}</span>
          <span className="arca-mono" style={{ color: "var(--muted)" }}>{recording ? t("recording") : t("readyStatus")}</span>
        </div>
        <div style={{ display: "flex", gap: 2, alignItems: "center", height: 36 }}>
          {Array.from({ length: 56 }).map((_, i) => {
            const h = 6 + Math.abs(Math.sin(i * 0.6) * 22) + (i % 5) * 2;
            const active = recording && i < (elapsed * 0.9) % 56;
            return <div key={i} style={{ width: 3, height: h, background: active ? "var(--accent)" : "var(--hairline-2)", borderRadius: 2 }} />;
          })}
        </div>
        {error && <p style={{ fontSize: 12, color: "var(--danger-deep, #B8452F)", margin: "8px 0 0" }}>{error}</p>}
      </div>
    </div>
  );
}

// ── Video recorder — real webcam capture, or pick an existing file ─────────────

function VideoRecorder({ blob, onChange }: { blob: Blob | null; onChange: (b: Blob | null) => void }) {
  const t = useTranslations("Compose.videoRecorder");
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const liveRef = useRef<HTMLVideoElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);

  // Same reasoning as VoiceRecorder: derive the preview from the lifted
  // `blob` prop so switching to another "Forma" tab and back still shows
  // the recorded video instead of an empty recorder.
  useEffect(() => {
    if (!blob) { setPreviewSrc(null); return; }
    const url = URL.createObjectURL(blob);
    setPreviewSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [blob]);

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach((tr) => tr.stop());
  }, []);

  function setResult(b: Blob) {
    onChange(b);
  }

  async function start() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: { width: 1280, height: 720 } });
      streamRef.current = stream;
      if (liveRef.current) liveRef.current.srcObject = stream;
      const mime = bestVideoMime();
      const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      recorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        const b = new Blob(chunksRef.current, { type: recorder.mimeType });
        stream.getTracks().forEach((tr) => tr.stop());
        streamRef.current = null;
        setResult(b);
      };
      recorder.start(250);
      setRecording(true);
    } catch {
      setError(t("camError"));
    }
  }
  function stop() {
    recorderRef.current?.stop();
    setRecording(false);
  }
  function discard() {
    onChange(null);
  }
  function handleFile(f: File) {
    if (!f.type.startsWith("video/")) { setError(t("pickVideoError")); return; }
    setError(null);
    setResult(f);
  }

  if (blob && previewSrc) {
    return (
      <div className="arca-card" style={{ padding: 0, overflow: "hidden" }}>
        <video controls src={previewSrc} style={{ width: "100%", aspectRatio: "16/9", background: "#111", display: "block" }} />
        <div style={{ padding: 14, display: "flex", justifyContent: "center" }}>
          <button type="button" onClick={discard} className="arca-btn sm arca-btn--ghost">
            <IcX /> {t("recordAgainOrPick")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="arca-card" style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ aspectRatio: "16/9", background: "linear-gradient(135deg, #2A241C, #1C1A16)", position: "relative", display: "grid", placeItems: "center" }}>
        {recording ? (
          <video ref={liveRef} autoPlay muted playsInline style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <div style={{ color: "rgba(255,255,255,0.4)", textAlign: "center" }}>
            <IcVideo />
            <div style={{ marginTop: 12, fontSize: 13 }}>{t("webcamHint")}</div>
          </div>
        )}
        <span className="arca-mono" style={{ position: "absolute", top: 12, left: 12, color: "rgba(255,255,255,0.5)", fontSize: 11 }}>
          {recording ? t("recording") : t("ready")}
        </span>
      </div>
      <div style={{ padding: 14, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
        <div style={{ display: "flex", gap: 10 }}>
          <button type="button" onClick={recording ? stop : start} className="arca-btn arca-btn--clay">
            {recording ? <>■ {t("stop")}</> : <>● {t("record")}</>}
          </button>
          <button type="button" onClick={() => fileRef.current?.click()} className="arca-btn arca-btn--outline" disabled={recording}>
            {t("pickFile")}
          </button>
          <input ref={fileRef} type="file" accept="video/*" style={{ display: "none" }}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />
        </div>
        {error && <p style={{ fontSize: 12, color: "var(--danger-deep, #B8452F)", margin: 0 }}>{error}</p>}
      </div>
    </div>
  );
}

// ── Photo picker — real multi-file picker with thumbnails ──────────────────────

function PhotoPicker({ photos, onChange }: { photos: File[]; onChange: (files: File[]) => void }) {
  const t = useTranslations("Compose.photoPicker");
  const fileRef = useRef<HTMLInputElement>(null);
  const replaceRef = useRef<HTMLInputElement>(null);
  const [urls, setUrls] = useState<string[]>([]);
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  useEffect(() => {
    const next = photos.map((f) => URL.createObjectURL(f));
    setUrls(next);
    return () => { next.forEach((u) => URL.revokeObjectURL(u)); };
  }, [photos]);

  // Close the lightbox if its photo got removed from elsewhere
  useEffect(() => {
    if (openIndex !== null && openIndex >= photos.length) setOpenIndex(null);
  }, [photos.length, openIndex]);

  function addFiles(files: FileList) {
    const images = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (images.length) onChange([...photos, ...images]);
  }
  function removeAt(i: number) {
    onChange(photos.filter((_, idx) => idx !== i));
  }
  function replaceAt(i: number, f: File) {
    if (!f.type.startsWith("image/")) return;
    onChange(photos.map((p, idx) => idx === i ? f : p));
  }

  return (
    <div className="arca-card" style={{ padding: 22 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
        {photos.map((f, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setOpenIndex(i)}
            title={t("viewReplace")}
            style={{ position: "relative", aspectRatio: "1", padding: 0, border: "none", cursor: "pointer", borderRadius: 10, overflow: "hidden" }}
          >
            <img src={urls[i]} alt={f.name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            <span
              onClick={(e) => { e.stopPropagation(); removeAt(i); }}
              role="button"
              title={t("remove")}
              style={{
                position: "absolute", top: 4, right: 4, width: 20, height: 20, borderRadius: "50%",
                background: "rgba(0,0,0,0.55)", color: "#fff",
                display: "grid", placeItems: "center",
              }}
            >
              <IcX />
            </span>
          </button>
        ))}
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          style={{ aspectRatio: "1", borderRadius: 10, border: "1.5px dashed var(--hairline-2)", background: "transparent", color: "var(--muted)", display: "grid", placeItems: "center", cursor: "pointer" }}
        >
          {t("add")}
        </button>
        <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: "none" }}
          onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ""; }} />
      </div>
      <hr className="arca-divider" />
      <span className="arca-sub" style={{ fontSize: 12 }}>
        {t("count", { count: photos.length })}
      </span>

      {/* Lightbox — view full size, replace or remove */}
      {openIndex !== null && photos[openIndex] && (
        <div
          onMouseDown={(e) => { if (e.target === e.currentTarget) setOpenIndex(null); }}
          style={{
            position: "fixed", inset: 0, zIndex: 600,
            display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
            background: "rgba(20,16,12,.7)", backdropFilter: "blur(4px)",
          }}
        >
          <div style={{ width: "min(560px, 100%)", display: "flex", flexDirection: "column", gap: 14 }}>
            <img
              src={urls[openIndex]}
              alt={photos[openIndex].name}
              style={{ width: "100%", maxHeight: "70vh", objectFit: "contain", borderRadius: 12, background: "#000" }}
            />
            <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
              <button type="button" onClick={() => replaceRef.current?.click()} className="arca-btn sm arca-btn--outline" style={{ background: "var(--surface)" }}>
                {t("replace")}
              </button>
              <button
                type="button"
                onClick={() => { removeAt(openIndex); setOpenIndex(null); }}
                className="arca-btn sm"
                style={{ color: "var(--danger-deep, #B8452F)", borderColor: "var(--danger-soft, #E6C4B6)", background: "var(--surface)" }}
              >
                {t("remove")}
              </button>
              <button type="button" onClick={() => setOpenIndex(null)} className="arca-btn sm arca-btn--ghost" style={{ background: "var(--surface)" }}>
                {t("close")}
              </button>
            </div>
            <input
              ref={replaceRef} type="file" accept="image/*" style={{ display: "none" }}
              onChange={(e) => { const f = e.target.files?.[0]; if (f && openIndex !== null) replaceAt(openIndex, f); e.target.value = ""; }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Trigger card ──────────────────────────────────────────────────────────────

function TriggerCard({ active, onClick, Ic: IconComp, title, sub }: {
  active: boolean; onClick: () => void;
  Ic: React.ComponentType; title: string; sub: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "16px 18px", textAlign: "left", cursor: "pointer", borderRadius: "var(--r-lg)",
        background: active ? "var(--ink)" : "var(--surface)",
        color: active ? "var(--bg)" : "var(--ink)",
        border: `1px solid ${active ? "var(--ink)" : "var(--hairline)"}`,
        display: "flex", flexDirection: "column", gap: 10, transition: "all .18s",
      }}
    >
      <span style={{ color: "var(--accent)" }}><IconComp /></span>
      <div style={{ fontWeight: 550, fontSize: 14 }}>{title}</div>
      <div style={{ fontSize: 12, color: active ? "color-mix(in srgb, var(--bg) 60%, transparent)" : "var(--muted)", marginTop: -4 }}>{sub}</div>
    </button>
  );
}

// ── Mode select — the very first screen, before any other step ────────────────

function ModeSelect({ onChoose, onBack }: { onChoose: (m: MessageMode) => void; onBack: () => void }) {
  const t = useTranslations("Compose");
  const MODES = MODE_META.map(m => ({
    ...m,
    title: t(`modeSelect.${m.id === "SELF" ? "self" : "legacy"}.title`),
    desc: t(`modeSelect.${m.id === "SELF" ? "self" : "legacy"}.desc`),
    pills: m.id === "SELF"
      ? [t("modeSelect.self.pillDate"), t("modeSelect.self.pillNoGuardians")]
      : [t("modeSelect.legacy.pillGuardian")],
  }));
  return (
    <div data-arca-theme="" style={{ minHeight: "100vh", background: "var(--bg)", fontFamily: "var(--f-sans)", color: "var(--ink)" }}>
      <div className="arca-topbar">
        <div className="arca-topbar__crumbs">
          <span style={{ fontFamily: "var(--f-serif)", fontStyle: "italic", color: "var(--accent)" }}>arca</span>
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <IcChevron />
            <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", fontSize: 13, fontFamily: "var(--f-sans)" }}>
              {t("dashboard")}
            </button>
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <IcChevron />
            <span className="here">{t("newMessage")}</span>
          </span>
        </div>
      </div>

      <div className="arca-inner" style={{ maxWidth: 760 }}>
        <div style={{ marginBottom: 32 }}>
          <div className="arca-kicker">{t("modeSelect.kicker")}</div>
          <h1 className="arca-h1" style={{ marginTop: 8 }}>{t.rich("modeSelect.title", { em: (chunks) => <em>{chunks}</em> })}</h1>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => onChoose(m.id)}
              className="arca-card"
              style={{
                textAlign: "left", padding: "30px 26px", cursor: "pointer",
                display: "flex", flexDirection: "column", border: "1.5px solid var(--hairline)",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "color-mix(in srgb, var(--accent) 55%, var(--hairline))"; (e.currentTarget as HTMLElement).style.transform = "translateY(-3px)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--hairline)"; (e.currentTarget as HTMLElement).style.transform = ""; }}
            >
              <span style={{
                width: 46, height: 46, borderRadius: 13, marginBottom: 18,
                display: "grid", placeItems: "center",
                background: m.id === "SELF" ? "var(--accent-tint)" : "var(--sky-soft)",
                color: m.id === "SELF" ? "var(--accent-deep)" : "var(--sky)",
              }}>
                <m.Ic />
              </span>
              <h3 style={{ fontFamily: "var(--f-serif)", fontSize: 22, fontWeight: 400, margin: "0 0 10px" }}>{m.title}</h3>
              <p className="arca-sub" style={{ fontSize: 13.5, lineHeight: 1.6, margin: "0 0 18px" }}>{m.desc}</p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: "auto" }}>
                {m.pills.map((pill) => (
                  <span key={pill} className="arca-mono" style={{
                    fontSize: 10.5, padding: "4px 10px", borderRadius: "var(--r-pill)",
                    border: "1px solid var(--hairline-2)", color: "var(--muted)", background: "var(--surface)",
                  }}>
                    {pill}
                  </span>
                ))}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main Compose Wizard ───────────────────────────────────────────────────────

const OCCASION_TRIGGER_MAP: Record<string, Trigger> = {
  birthday: "date",
  anniversary: "date",
};

export default function ComposeWizard({ recipients, contactGroups, isPro, currentUser, prefilledRecipientId, prefilledOccasion, prefilledDate, replyToMessageId, replyRecipient }: Props) {
  const t = useTranslations("Compose");
  const dateLocale = useLocale() === "cs" ? "cs-CZ" : "en-GB";
  const KINDS = KIND_META.map(k => ({ ...k, label: t(`kinds.${k.id}.label`), sub: t(`kinds.${k.id}.sub`) }));
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  // A reply only ever happens in SELF mode — skip ModeSelect entirely rather
  // than making the user pick a mode they were never going to choose.
  const [messageMode, setMessageMode] = useState<MessageMode | null>(replyToMessageId ? "SELF" : null);

  // replyRecipient mirrors the original message's recipient — pre-select it
  // if it's still one of the user's existing recipients, otherwise carry it
  // over as a new person (deferred-commit, same as any other newPeople entry).
  const replyRecipientIsExisting = !!replyRecipient && recipients.some(r => r.id === replyRecipient.id);

  // Multi-recipient selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    prefilledRecipientId ? new Set([prefilledRecipientId])
      : replyRecipientIsExisting ? new Set([replyRecipient!.id])
      : new Set()
  );
  const [newPeople, setNewPeople] = useState<NewPerson[]>(() => {
    if (replyRecipient && !replyRecipientIsExisting) return [{ name: replyRecipient.name, email: replyRecipient.email ?? "" }];
    // No recipient found on the original message (shouldn't normally happen,
    // since Fáze 1.5 already guards against a recipient-less SELF pack) —
    // fall back to the same "myself" default a fresh SELF mode choice gets.
    if (replyToMessageId && !replyRecipient) return [{ name: currentUser.name, email: currentUser.email }];
    return [];
  });
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [kind, setKind] = useState<Kind>("text");
  const [trigger, setTrigger] = useState<Trigger>(
    replyToMessageId ? "relative"
      : prefilledOccasion ? (OCCASION_TRIGGER_MAP[prefilledOccasion] ?? "date") : "date"
  );
  const [packType, setPackType] = useState<PackType>("EMOTIONAL");
  const [text, setText] = useState("");
  const [bgColor,  setBgColor]  = useState<string | null>(null);
  const [txtColor, setTxtColor] = useState<string | null>(null);
  const [dateVal, setDateVal] = useState(prefilledDate ?? "");
  const [timeVal, setTimeVal] = useState("08:00");
  // Age-milestone / relative-offset triggers (Fáze 1)
  const [targetAge, setTargetAge] = useState(18);
  const [relativeYears, setRelativeYears] = useState(1);
  const [relativeMonths, setRelativeMonths] = useState(0);
  const [birthdayDraft, setBirthdayDraft] = useState("");
  const [recipientBirthdayOverrides, setRecipientBirthdayOverrides] = useState<Record<string, string>>({});
  const [showPreview, setShowPreview] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const richEditorRef = useRef<ArcaRichEditorHandle>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [photos, setPhotos] = useState<File[]>([]);
  const [uploadingMedia, setUploadingMedia] = useState(false);

  // Sync date from URL param — handles App Router component reuse across navigations
  useEffect(() => {
    if (prefilledDate) setDateVal(prefilledDate);
  }, [prefilledDate]);

  const selectedRecipients = recipients.filter(r => selectedIds.has(r.id));
  const allSelected = [...selectedRecipients, ...newPeople];
  const displayName = allSelected[0]?.name ?? t("recipientFallback");

  // The implicit target for an age-milestone trigger is always the first
  // selected recipient (matches the read-only "Komu bude" display) — there's
  // no picker, since SELF messages are addressed to one primary recipient.
  const primaryTarget = allSelected[0];
  const primaryIsExisting = selectedRecipients.length > 0 && primaryTarget === selectedRecipients[0];
  let primaryBirthdayIso: string | null = null;
  if (primaryIsExisting) {
    const primaryRecipient = primaryTarget as Recipient;
    primaryBirthdayIso = recipientBirthdayOverrides[primaryRecipient.id] ?? primaryRecipient.birthday ?? null;
  } else if (primaryTarget) {
    primaryBirthdayIso = (primaryTarget as NewPerson).birthday ?? null;
  }

  function commitBirthdayDraft() {
    if (!birthdayDraft || !primaryTarget) return;
    if (primaryIsExisting) {
      setRecipientBirthdayOverrides(prev => ({ ...prev, [(primaryTarget as Recipient).id]: birthdayDraft }));
    } else {
      setNewPeople(prev => prev.map((p, i) => i === 0 ? { ...p, birthday: birthdayDraft } : p));
    }
  }

  const ageComputedDate = primaryBirthdayIso ? computeAgeMilestoneDate(parseISODate(primaryBirthdayIso), targetAge) : null;
  const relativeComputedDate = computeRelativeOffsetDate(new Date(), relativeYears, relativeMonths);

  // The fixed default (18) is wrong for most real recipients — anyone already
  // past it would hit "this age is already in the past" the instant they open
  // the trigger, with no obvious reason why "Zapečetit a uložit" won't go
  // through. Whenever a birthday becomes known (recipient selected, or just
  // filled in inline) and the CURRENT targetAge would already be in the past
  // for them, bump it forward to the next age that's actually reachable —
  // but only as a one-time correction of the default, never overriding an
  // age the user is actively (if deliberately invalidly) typing.
  useEffect(() => {
    if (trigger !== "age" || !primaryBirthdayIso) return;
    const birthday = parseISODate(primaryBirthdayIso);
    if (!isFutureDate(computeAgeMilestoneDate(birthday, targetAge))) {
      setTargetAge(nextValidTargetAge(birthday));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger, primaryBirthdayIso]);

  function toggleId(id: string) {
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function toggleGroup(groupId: string) {
    const members = recipients.filter(r => r.groupId === groupId);
    const allIn = members.every(r => selectedIds.has(r.id));
    setSelectedIds(prev => {
      const n = new Set(prev);
      members.forEach(r => allIn ? n.delete(r.id) : n.add(r.id));
      return n;
    });
  }
  function addNewPerson() {
    if (!newName.trim()) return;
    setNewPeople(prev => [...prev, { name: newName.trim(), email: newEmail.trim() }]);
    setNewName(""); setNewEmail("");
  }
  function removeNewPerson(i: number) {
    setNewPeople(prev => prev.filter((_, idx) => idx !== i));
  }

  async function uploadMedia(packId: string) {
    if (!audioBlob && !videoBlob && photos.length === 0) return;
    setUploadingMedia(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error(t("errors.sessionExpired")); return; }

      const uploadOne = async (blob: Blob, name: string, contentType: "AUDIO" | "VIDEO" | "FILE") => {
        const path = `${user.id}/compose/${packId}/${name}`;
        const { error } = await supabase.storage
          .from("arca-media")
          .upload(path, blob, { contentType: blob.type || undefined, upsert: false });
        if (error) { toast.error(t("errors.uploadFailed", { message: error.message })); return; }
        const res = await addMediaContent(packId, path, contentType);
        if ("error" in res) toast.error(res.error);
      };

      if (audioBlob) {
        const ext = audioBlob.type.includes("mp4") ? "m4a" : audioBlob.type.includes("ogg") ? "ogg" : "webm";
        await uploadOne(audioBlob, `voice-${Date.now()}.${ext}`, "AUDIO");
      }
      if (videoBlob) {
        const ext = videoBlob.type.includes("mp4") ? "mp4" : "webm";
        await uploadOne(videoBlob, `video-${Date.now()}.${ext}`, "VIDEO");
      }
      for (let i = 0; i < photos.length; i++) {
        const f = photos[i];
        const safeName = f.name.toLowerCase().replace(/[^a-z0-9.\-_]/g, "_") || `photo-${i}.jpg`;
        await uploadOne(f, `photo-${Date.now()}-${i}-${safeName}`, "FILE");
      }
    } finally {
      setUploadingMedia(false);
    }
  }

  function handleSave(isDraft: boolean) {
    setSaveError(null);

    // Creation-time validation for milestone triggers — block save immediately
    // rather than silently creating a trigger whose date is already past.
    if (!isDraft && trigger === "age") {
      if (!primaryBirthdayIso) { setSaveError(t("errors.needBirthdayFirst")); return; }
      if (!ageComputedDate || !isFutureDate(ageComputedDate)) {
        setSaveError(t("errors.ageAlreadyPast", { name: displayName }));
        return;
      }
    }
    if (!isDraft && trigger === "relative") {
      if (relativeYears === 0 && relativeMonths === 0) { setSaveError(t("errors.needFutureMonthSave")); return; }
      if (!isFutureDate(relativeComputedDate)) { setSaveError(t("errors.mustBeFuture")); return; }
    }

    const title = `${displayName} — ${t(`titleKindLabels.${kind}`)}`;
    const formData = new FormData();
    formData.set("type", packType);
    formData.set("title", title);
    selectedIds.forEach(id => formData.append("recipientId", id));
    formData.set("newPeople", JSON.stringify(newPeople));
    formData.set("kind", kind);
    formData.set("trigger", trigger);
    formData.set("date", dateVal);
    formData.set("time", timeVal);
    formData.set("text", text);
    formData.set("draft", isDraft ? "1" : "0");
    formData.set("messageMode", messageMode ?? "LEGACY");
    if (replyToMessageId) formData.set("replyToMessageId", replyToMessageId);
    if (bgColor)  formData.set("backgroundColor", bgColor);
    if (txtColor) formData.set("textColor", txtColor);
    if (trigger === "age") {
      formData.set("targetAge", String(targetAge));
      if (primaryBirthdayIso) formData.set("primaryBirthday", primaryBirthdayIso);
    }
    if (trigger === "relative") {
      formData.set("relativeYears", String(relativeYears));
      formData.set("relativeMonths", String(relativeMonths));
    }

    startTransition(async () => {
      const result = await createPackFull(null, formData);
      if ("error" in result) {
        setSaveError(result.error);
        return;
      }
      await uploadMedia(result.packId);
      router.push("/dashboard/vault");
    });
  }

  const previewRecipient = allSelected[0];
  const tone = previewRecipient ? toneFor(previewRecipient.name) : "clay";
  const init = previewRecipient ? initials(previewRecipient.name) : "?";

  const meAlreadyAdded = newPeople.some(p => p.email === currentUser.email)
    || selectedRecipients.some(r => r.email === currentUser.email);
  function addMyself() {
    if (meAlreadyAdded) return;
    setNewPeople(prev => [...prev, { name: currentUser.name, email: currentUser.email }]);
  }

  // Gate the whole wizard behind a mode choice — every step after this reads
  // `messageMode`, so nothing below should render until it's set.
  if (!messageMode) {
    return (
      <ModeSelect
        onBack={() => router.back()}
        onChoose={(m) => {
          setMessageMode(m);
          setTrigger("date");
          // SELF messages default to "myself" as the recipient — the owner
          // shouldn't have to remember to click "Přidat sebe jako příjemce"
          // for the common case (a letter to their own future self) to
          // actually reach them. Still just a default: the chip has its own
          // "x" to remove, and the "Pro koho" step is unrestricted either way.
          if (m === "SELF") addMyself();
        }}
      />
    );
  }

  return (
    <div data-arca-theme="" style={{ minHeight: "100vh", background: "var(--bg)", fontFamily: "var(--f-sans)", color: "var(--ink)" }}>
      {/* Topbar */}
      <div className="arca-topbar">
        <div className="arca-topbar__crumbs">
          <span style={{ fontFamily: "var(--f-serif)", fontStyle: "italic", color: "var(--accent)" }}>arca</span>
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <IcChevron />
            <button onClick={() => router.back()} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", fontSize: 13, fontFamily: "var(--f-sans)" }}>
              {t("dashboard")}
            </button>
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <IcChevron />
            <button onClick={() => setMessageMode(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", fontSize: 13, fontFamily: "var(--f-sans)" }}>
              {t("newMessage")}
            </button>
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <IcChevron />
            <span className="here">{messageMode === "SELF" ? t("topbar.self") : t("topbar.legacy")}</span>
          </span>
        </div>
        <div className="arca-grow" />
        {/* Pack type toggle — subtle, right side */}
        <div className="arca-seg" style={{ marginRight: 8 }}>
          <button className={packType === "EMOTIONAL" ? "active" : ""} onClick={() => setPackType("EMOTIONAL")}>{t("packType.emotional")}</button>
          <button className={packType === "PRACTICAL" ? "active" : ""} onClick={() => setPackType("PRACTICAL")}>{t("packType.practical")}</button>
        </div>
      </div>

      <div className="arca-inner">
        <div style={{ marginBottom: 24 }}>
          <div className="arca-kicker">{messageMode === "SELF" ? t("topbar.self") : t("topbar.legacy")}</div>
          <h1 className="arca-h1" style={{ marginTop: 8 }}>
            {t.rich(messageMode === "SELF" ? "heading.self" : "heading.legacy", { em: (chunks) => <em>{chunks}</em> })}
          </h1>
        </div>

        <div className="arca-compose-split" style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 28 }}>
          {/* ── Left: editor steps ─────────────────────────────── */}
          <div className="arca-stack-5">

            {/* Step 01 — recipient */}
            <div>
              <Step n="01" label={t("steps.recipient")} />

              {messageMode === "SELF" && (
                <button
                  type="button"
                  onClick={addMyself}
                  disabled={meAlreadyAdded}
                  className="arca-btn sm arca-btn--outline"
                  style={{ marginBottom: 12, opacity: meAlreadyAdded ? 0.5 : 1 }}
                >
                  {meAlreadyAdded ? <><IcCheck /> {t("recipient.alreadyAdded")}</> : <><IcPlus /> {t("recipient.addMyself")}</>}
                </button>
              )}

              {/* Selected chips */}
              {allSelected.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                  {selectedRecipients.map(r => (
                    <div key={r.id} style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "4px 10px 4px 4px", borderRadius: "var(--r-pill)", background: "var(--ink)", color: "var(--bg)", fontSize: 13, fontWeight: 500, fontFamily: "var(--f-sans)" }}>
                      <Avatar src={r.avatarUrl} initials={initials(r.name)} tone={toneFor(r.name)} size="sm" style={{ border: "1.5px solid color-mix(in srgb, var(--bg) 25%, transparent)" }} />
                      {r.name.split(" ")[0]}
                      <button type="button" onClick={() => toggleId(r.id)} style={{ background: "none", border: "none", color: "color-mix(in srgb, var(--bg) 60%, transparent)", cursor: "pointer", padding: 0, display: "flex" }}><IcX /></button>
                    </div>
                  ))}
                  {newPeople.map((p, i) => (
                    <div key={i} style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "4px 10px 4px 4px", borderRadius: "var(--r-pill)", background: "var(--ink)", color: "var(--bg)", fontSize: 13, fontWeight: 500, fontFamily: "var(--f-sans)" }}>
                      <span className="arca-avatar sm" style={{ background: "color-mix(in srgb, var(--bg) 15%, transparent)", fontSize: 9 }}>{initials(p.name)}</span>
                      {p.name.split(" ")[0]}
                      <button type="button" onClick={() => removeNewPerson(i)} style={{ background: "none", border: "none", color: "color-mix(in srgb, var(--bg) 60%, transparent)", cursor: "pointer", padding: 0, display: "flex" }}><IcX /></button>
                    </div>
                  ))}
                </div>
              )}

              {/* Groups */}
              {contactGroups.length > 0 && (
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontFamily: "var(--f-mono)", fontSize: 10, textTransform: "uppercase", letterSpacing: ".1em", color: "var(--muted)", marginBottom: 6 }}>{t("recipient.groupsLabel")}</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {contactGroups.map(g => {
                      const members = recipients.filter(r => r.groupId === g.id);
                      const allIn = members.length > 0 && members.every(r => selectedIds.has(r.id));
                      return (
                        <button key={g.id} type="button" onClick={() => toggleGroup(g.id)} disabled={members.length === 0}
                          style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: "var(--r-pill)", border: `1.5px solid ${allIn ? "var(--ink)" : "var(--hairline)"}`, background: allIn ? "var(--ink)" : "var(--surface)", color: allIn ? "var(--bg)" : "var(--ink)", fontSize: 12, fontWeight: 500, cursor: members.length === 0 ? "default" : "pointer", opacity: members.length === 0 ? 0.4 : 1, transition: "all .15s", fontFamily: "var(--f-sans)" }}>
                          {g.emoji && <span>{g.emoji}</span>}
                          {g.name}
                          <span style={{ opacity: .6, fontSize: 11 }}>({members.length})</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Existing contacts — bigger photo cards, easy to scan/tap */}
              {recipients.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
                  {recipients.map(r => {
                    const sel = selectedIds.has(r.id);
                    const t = toneFor(r.name);
                    return (
                      <button key={r.id} type="button" onClick={() => toggleId(r.id)}
                        style={{
                          display: "flex", flexDirection: "column", alignItems: "center", gap: 7,
                          width: 76, padding: "10px 6px 8px", borderRadius: 14,
                          border: `1.5px solid ${sel ? "var(--accent)" : "var(--hairline)"}`,
                          background: sel ? "var(--accent-tint)" : "var(--surface)",
                          cursor: "pointer", transition: "all .15s", fontFamily: "var(--f-sans)",
                        }}>
                        <div style={{ position: "relative" }}>
                          <Avatar src={r.avatarUrl} initials={initials(r.name)} tone={t} size="lg"
                            style={sel ? { boxShadow: "0 0 0 2.5px var(--accent-tint), 0 0 0 4.5px var(--accent)" } : undefined} />
                          {sel && (
                            <span style={{
                              position: "absolute", right: -2, bottom: -2, width: 18, height: 18, borderRadius: "50%",
                              background: "var(--accent)", color: "var(--on-accent)", display: "grid", placeItems: "center",
                              border: "2px solid var(--surface)",
                            }}><IcCheck /></span>
                          )}
                        </div>
                        <span style={{
                          fontSize: 12, fontWeight: 500, color: sel ? "var(--accent-deep)" : "var(--ink)",
                          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%",
                        }}>
                          {r.name.split(" ")[0]}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* New person inline */}
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                <input className="arca-input" style={{ width: 150, padding: "7px 10px", fontSize: 13 }} placeholder={t("recipient.namePlaceholder")} value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === "Enter" && addNewPerson()} />
                <input className="arca-input" style={{ width: 180, padding: "7px 10px", fontSize: 13 }} placeholder={t("recipient.emailPlaceholder")} type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && addNewPerson()} />
                <button type="button" onClick={addNewPerson} disabled={!newName.trim()} className="arca-btn arca-btn--ghost sm" style={{ whiteSpace: "nowrap" }}><IcPlus /> {t("recipient.addBtn")}</button>
              </div>
            </div>

            {/* Step 02 — kind */}
            <div>
              <Step n="02" label={t("steps.kind")} />
              <div className="arca-kind-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14 }}>
                {KINDS.map((k) => {
                  const active = kind === k.id;
                  const isProOnly = (k.id === "voice" || k.id === "video") && !isPro;
                  return (
                    <button
                      key={k.id}
                      type="button"
                      onClick={() => { if (!isProOnly) setKind(k.id); }}
                      className={`arca-compose-tile ${active ? "active" : ""}`}
                      style={{ opacity: isProOnly ? 0.6 : 1, position: "relative" }}
                    >
                      <div style={{ width: 38, height: 38, borderRadius: 11, background: active ? "rgba(255,255,255,0.08)" : "var(--bg-tint)", display: "grid", placeItems: "center", color: active ? "var(--accent)" : "var(--ink-2)" }}>
                        <k.Ic />
                      </div>
                      <div style={{ fontWeight: 600, fontSize: 15 }}>{k.label}</div>
                      <div className="arca-sub" style={{ fontSize: 12.5 }}>{k.sub}</div>
                      {isProOnly && (
                        <span style={{ position: "absolute", top: 10, right: 10, fontSize: 10, fontFamily: "var(--f-mono)", background: "var(--accent-tint)", color: "var(--accent-deep)", padding: "2px 6px", borderRadius: 4 }}>
                          PRO
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 03 — content */}
            <div>
              <Step n="03" label={t("steps.content")} />
              {kind === "text" && (
                <ArcaRichEditor
                  ref={richEditorRef}
                  content={text}
                  onChange={setText}
                  placeholder={t("editorPlaceholder", { name: displayName })}
                  minHeight={260}
                  recipientName={displayName}
                  backgroundColor={bgColor}
                  textColor={txtColor}
                  onThemeChange={(bg, text) => { setBgColor(bg); setTxtColor(text); }}
                />
              )}
              {kind === "voice" && <VoiceRecorder blob={audioBlob} onChange={setAudioBlob} />}
              {kind === "video" && <VideoRecorder blob={videoBlob} onChange={setVideoBlob} />}
              {kind === "photo" && <PhotoPicker photos={photos} onChange={setPhotos} />}
            </div>

            {/* Step 04 — trigger */}
            <div>
              <Step n="04" label={t("steps.trigger")} />
              {/* "Sobě do budoucna" only ever offers a fixed date — no Guardian-
                  verified triggers exist in this mode, so those cards are left
                  out entirely rather than shown disabled/struck-through. A
                  single relevant option should read as clean and deliberate,
                  not like a trimmed-down version of the other flow. */}
              <div className="arca-trigger-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                <TriggerCard active={trigger === "date"}   onClick={() => setTrigger("date")}   Ic={IcCalPlus} title={t("trigger.date.title")}    sub={t("trigger.date.sub")} />
                {messageMode === "SELF" && (
                  <>
                    <TriggerCard active={trigger === "age"}      onClick={() => setTrigger("age")}      Ic={IcHeart}      title={t("trigger.age.title")} sub={t("trigger.age.sub")} />
                    <TriggerCard active={trigger === "relative"} onClick={() => setTrigger("relative")} Ic={IcHourglass}  title={t("trigger.relative.title")}   sub={t("trigger.relative.sub")} />
                  </>
                )}
                {messageMode === "LEGACY" && (
                  <>
                    <TriggerCard active={trigger === "event"}  onClick={() => setTrigger("event")}  Ic={IcHeart}   title={t("trigger.event.title")} sub={t("trigger.event.sub")} />
                    <TriggerCard active={trigger === "sealed"} onClick={() => setTrigger("sealed")} Ic={IcLock}    title={t("trigger.sealed.title")}   sub={t("trigger.sealed.sub")} />
                  </>
                )}
              </div>

              {trigger === "date" && (
                <div className="arca-card arca-date-grid" style={{ padding: 18, marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                  <div>
                    <label className="arca-mono" style={{ color: "var(--muted)", fontSize: 11, display: "block", marginBottom: 6 }}>{t("trigger.dateLabel")}</label>
                    <input type="date" className="arca-input" value={dateVal} onChange={(e) => setDateVal(e.target.value)} />
                  </div>
                  <div>
                    <label className="arca-mono" style={{ color: "var(--muted)", fontSize: 11, display: "block", marginBottom: 6 }}>{t("trigger.timeLabel")}</label>
                    <input type="time" className="arca-input" value={timeVal} onChange={(e) => setTimeVal(e.target.value)} />
                  </div>
                  <div>
                    <label className="arca-mono" style={{ color: "var(--muted)", fontSize: 11, display: "block", marginBottom: 6 }}>{t("trigger.repeatLabel")}</label>
                    <select className="arca-input">
                      <option value="once">{t("trigger.repeatOnce")}</option>
                      <option value="year">{t("trigger.repeatYearly")}</option>
                    </select>
                  </div>
                </div>
              )}

              {trigger === "event" && (
                <div className="arca-card" style={{ padding: 18, marginTop: 12 }}>
                  <label className="arca-mono" style={{ color: "var(--muted)", fontSize: 11, display: "block", marginBottom: 6 }}>{t("trigger.eventTriggerLabel")}</label>
                  <select className="arca-input">
                    <option>{t("trigger.eventOption18")}</option>
                    <option>{t("trigger.eventOptionWedding")}</option>
                    <option>{t("trigger.eventOptionFirstChild")}</option>
                    <option>{t("trigger.eventOptionCustom")}</option>
                  </select>
                  <p className="arca-sub" style={{ fontSize: 12.5, marginTop: 10 }}>
                    {t("trigger.eventHint")}
                  </p>
                </div>
              )}

              {trigger === "sealed" && (
                <div className="arca-card flat" style={{ background: "var(--bg-tint)", border: "none", padding: 18, marginTop: 12 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{ color: "var(--accent)" }}><IcLock /></span>
                    <span style={{ fontSize: 13, fontWeight: 550 }}>{t("trigger.sealedTitle")}</span>
                  </div>
                  <p className="arca-sub" style={{ fontSize: 12.5, margin: "6px 0 0" }}>
                    {t("trigger.sealedHint")}
                  </p>
                </div>
              )}

              {trigger === "age" && (
                <div className="arca-card" style={{ padding: 20, marginTop: 12 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                    <div>
                      <label className="arca-mono" style={{ color: "var(--muted)", fontSize: 11, display: "block", marginBottom: 6 }}>{t("trigger.whoLabel")}</label>
                      {primaryTarget ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", borderRadius: 10, border: "1px solid var(--hairline-2)", background: "var(--surface)", fontSize: 13.5 }}>
                          <span className="arca-avatar sm" style={{ background: TONE_GRADS[toneFor(primaryTarget.name)], color: "#fff", fontSize: 9 }}>{initials(primaryTarget.name)}</span>
                          {primaryTarget.name}
                          {primaryBirthdayIso && <span style={{ color: "var(--muted)" }}>· {t("trigger.bornOn", { date: formatCzDate(parseISODate(primaryBirthdayIso), dateLocale) })}</span>}
                        </div>
                      ) : (
                        <div className="arca-sub" style={{ fontSize: 12.5, padding: "9px 0" }}>{t("trigger.selectRecipientFirst")}</div>
                      )}
                    </div>
                    <div>
                      <label className="arca-mono" style={{ color: "var(--muted)", fontSize: 11, display: "block", marginBottom: 6 }}>{t("trigger.ageLabel")}</label>
                      <input type="number" min={1} max={120} className="arca-input" value={targetAge}
                        onChange={(e) => setTargetAge(Math.max(1, Math.min(120, Number(e.target.value) || 1)))} />
                    </div>
                  </div>

                  {primaryTarget && !primaryBirthdayIso && (
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "14px 16px", borderRadius: "var(--r-lg)", background: "var(--accent-tint)", border: "1px solid var(--accent-soft, var(--hairline-2))" }}>
                      <span style={{ color: "var(--accent-deep)", marginTop: 2 }}>
                        <Ic size={16}><path d="M12 9v4M12 17h.01"/><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></Ic>
                      </span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--accent-deep)", marginBottom: 3 }}>{t("trigger.noBirthdayTitle", { name: primaryTarget.name })}</div>
                        <div className="arca-sub" style={{ fontSize: 12, lineHeight: 1.5, marginBottom: 10 }}>
                          {t("trigger.noBirthdayHint", { age: targetAge })}
                        </div>
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <input type="date" className="arca-input" style={{ maxWidth: 170 }} value={birthdayDraft} onChange={(e) => setBirthdayDraft(e.target.value)} />
                          <button type="button" className="arca-btn sm arca-btn--primary" disabled={!birthdayDraft} onClick={commitBirthdayDraft}>
                            {t("trigger.saveAndCompute")}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {primaryBirthdayIso && ageComputedDate && (
                    isFutureDate(ageComputedDate) ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 14, padding: "12px 16px", borderRadius: "var(--r-lg)", background: "var(--accent-tint)", border: "1px solid var(--accent-soft, var(--hairline-2))", fontSize: 13, color: "var(--accent-deep)" }}>
                        <IcCheck />
                        {t.rich("trigger.opensOn", { b: (chunks) => <b>{chunks}</b>, date: formatCzDate(ageComputedDate, dateLocale), name: displayName, age: targetAge })}
                      </div>
                    ) : (
                      <p style={{ fontSize: 12.5, color: "var(--danger-deep, #B8452F)", marginTop: 14, marginBottom: 0 }}>
                        {t("trigger.ageInPast", { name: displayName, date: formatCzDate(ageComputedDate, dateLocale) })}
                      </p>
                    )
                  )}
                </div>
              )}

              {trigger === "relative" && (
                <div className="arca-card" style={{ padding: 20, marginTop: 12 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div>
                      <label className="arca-mono" style={{ color: "var(--muted)", fontSize: 11, display: "block", marginBottom: 6 }}>{t("trigger.yearsLabel")}</label>
                      <input type="number" min={0} max={99} className="arca-input" value={relativeYears}
                        onChange={(e) => setRelativeYears(Math.max(0, Math.min(99, Number(e.target.value) || 0)))} />
                    </div>
                    <div>
                      <label className="arca-mono" style={{ color: "var(--muted)", fontSize: 11, display: "block", marginBottom: 6 }}>{t("trigger.monthsLabel")}</label>
                      <input type="number" min={0} max={11} className="arca-input" value={relativeMonths}
                        onChange={(e) => setRelativeMonths(Math.max(0, Math.min(11, Number(e.target.value) || 0)))} />
                    </div>
                  </div>

                  {relativeYears === 0 && relativeMonths === 0 ? (
                    <p style={{ fontSize: 12.5, color: "var(--danger-deep, #B8452F)", marginTop: 14, marginBottom: 0 }}>
                      {t("trigger.needFutureMonth")}
                    </p>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 14, padding: "12px 16px", borderRadius: "var(--r-lg)", background: "var(--accent-tint)", border: "1px solid var(--accent-soft, var(--hairline-2))", fontSize: 13, color: "var(--accent-deep)" }}>
                      <IcCheck />
                      {t.rich("trigger.opensOnSimple", { b: (chunks) => <b>{chunks}</b>, date: formatCzDate(relativeComputedDate, dateLocale) })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ── Right: preview ─────────────────────────────────── */}
          <div className="arca-compose-preview" style={{ position: "sticky", top: 90, alignSelf: "start" }}>
            <div className="arca-card elev" style={{ overflow: "hidden" }}>
              <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--hairline)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span className="arca-kicker">{t("preview.title")}</span>
                <button type="button" className="arca-btn sm arca-btn--ghost"><IcEye /></button>
              </div>

              <div style={{ padding: "20px 22px", background: "var(--bg-tint)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                  <Avatar src={previewRecipient && "avatarUrl" in previewRecipient ? previewRecipient.avatarUrl : null} initials={init} tone={tone} size="lg" />
                  <div>
                    <div style={{ fontWeight: 550, fontSize: 13.5 }}>{t("preview.for", { name: displayName })}</div>
                    <div className="arca-sub" style={{ fontSize: 11.5 }}>
                      {trigger === "date" && dateVal
                        ? formatCzDate(new Date(dateVal), dateLocale)
                        : trigger === "age" && primaryBirthdayIso && ageComputedDate
                        ? `${formatCzDate(ageComputedDate, dateLocale)} (${t("preview.ageSuffix", { age: targetAge })})`
                        : trigger === "age"
                        ? t("preview.fillBirthday")
                        : trigger === "relative"
                        ? formatCzDate(relativeComputedDate, dateLocale)
                        : trigger === "sealed" ? t("preview.whenTimeComes") : t("preview.atEvent")}
                    </div>
                  </div>
                </div>
                {kind === "text" && text ? (
                  <div
                    dangerouslySetInnerHTML={{ __html: text }}
                    style={{
                      fontFamily: "var(--f-serif)", fontSize: 14, lineHeight: 1.55,
                      maxHeight: 160, overflow: "hidden",
                      color: txtColor ?? "var(--ink-2)",
                      ...(bgColor ? { background: bgColor, borderRadius: 10, padding: "14px 16px", margin: "-2px -2px 0" } : {}),
                    }}
                  />
                ) : (
                  <p className="arca-sub" style={{ fontSize: 13, margin: 0, fontStyle: "italic" }}>
                    {kind === "voice"
                      ? (audioBlob ? t("preview.voiceReady") : t("preview.noRecordingYet"))
                      : kind === "video"
                      ? (videoBlob ? t("preview.videoReady") : t("preview.noVideoYet"))
                      : kind === "photo"
                      ? (photos.length > 0 ? t("preview.photosReady", { count: photos.length }) : t("preview.noPhotosYet"))
                      : t("preview.startWriting")}
                  </p>
                )}
              </div>

              <div style={{ padding: "14px 18px" }}>
                {[
                  [t("preview.formLabel"), t(`titleKindLabels.${kind}`)],
                  [t("preview.typeLabel"), packType === "EMOTIONAL" ? t("packType.emotionalPlain") : t("packType.practicalPlain")],
                  [t("preview.triggerLabel"), trigger === "date" ? t("preview.triggerDate") : trigger === "age" ? t("preview.triggerAge") : trigger === "relative" ? t("preview.triggerRelative") : trigger === "event" ? t("preview.triggerEvent") : t("preview.triggerSealed")],
                  ...(trigger === "age" ? [[t("preview.computedDateLabel"), primaryBirthdayIso && ageComputedDate ? formatCzDate(ageComputedDate, dateLocale) : "—"]] : []),
                  ...(trigger === "relative" ? [[t("preview.computedDateLabel"), formatCzDate(relativeComputedDate, dateLocale)]] : []),
                ].map(([label, value]) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ fontSize: 12, color: "var(--muted)" }}>{label}</span>
                    <span style={{ fontSize: 12.5, fontWeight: 500 }}>{value}</span>
                  </div>
                ))}
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 12, color: "var(--muted)" }}>{t("preview.statusLabel")}</span>
                  <span className="arca-chip clay"><span className="dot" /> {t("preview.statusDraft")}</span>
                </div>

                <hr className="arca-divider" />

                <button
                  type="button"
                  disabled={isPending || uploadingMedia || (selectedIds.size === 0 && newPeople.length === 0)}
                  onClick={() => handleSave(false)}
                  className="arca-btn arca-btn--primary lg"
                  style={{ width: "100%", justifyContent: "center" }}
                >
                  {uploadingMedia ? t("preview.uploadingMedia") : isPending ? t("preview.saving") : t("preview.sealAndSave")}
                  {!isPending && !uploadingMedia && <IcArrow />}
                </button>
                <button
                  type="button"
                  disabled={isPending || uploadingMedia}
                  onClick={() => handleSave(true)}
                  className="arca-btn arca-btn--ghost"
                  style={{ width: "100%", justifyContent: "center", marginTop: 6 }}
                >
                  {t("preview.saveDraft")}
                </button>
                {saveError && (
                  <p style={{ fontSize: 12, color: "var(--destructive, #e05454)", margin: "8px 0 0", textAlign: "center" }}>
                    {saveError}
                  </p>
                )}
              </div>
            </div>

            {kind === "text" && (
              <button
                type="button"
                onClick={() => richEditorRef.current?.openAiAssist()}
                className="arca-ai-cta"
              >
                <span className="arca-ai-cta__icon"><IcSparkle /></span>
                <span className="arca-ai-cta__body">
                  <span className="arca-ai-cta__title">{t("preview.aiTitle")}</span>
                  <span className="arca-ai-cta__sub">{t("preview.aiSub")}</span>
                </span>
                <span className="arca-ai-cta__arrow"><IcArrow /></span>
              </button>
            )}

            <p className="arca-sub" style={{ fontSize: 12, textAlign: "center", marginTop: 14, padding: "0 8px" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <IcLock /> {t("preview.encryptedHint")}
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
