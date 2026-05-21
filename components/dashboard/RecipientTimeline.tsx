"use client";

import { useState } from "react";
import Link from "next/link";

type ContentKind = "text" | "video" | "voice" | "photo";
type Filter = "all" | ContentKind;

interface ContentRow { id: string; type: string; textBody: string | null; s3FileKey: string | null; signedUrl?: string | null; }
interface Pack {
  id: string; title: string; type: string; status: string; createdAt: Date;
  triggerLabel: string;
  kind: ContentKind;
  contents: ContentRow[];
}

const STATUS: Record<string, { label: string; chip: string; tl: string }> = {
  DRAFT:    { label: "Návrh",        chip: "",      tl: "" },
  ACTIVE:   { label: "Naplánováno",  chip: "clay",  tl: "scheduled" },
  TRIGGERED:{ label: "Doručeno",     chip: "sage",  tl: "released" },
  DELIVERED:{ label: "Doručeno",     chip: "sage",  tl: "released" },
  GRACE_PERIOD:{ label: "Lhůta",     chip: "",      tl: "scheduled" },
  PENDING_GUARDIAN_APPROVAL:{ label: "Strážci", chip: "", tl: "scheduled" },
  ARCHIVED: { label: "Archiv",       chip: "",      tl: "" },
};

const IcText  = () => <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round"><path d="M5 6h14M5 12h14M5 18h9"/></svg>;
const IcVideo = () => <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round"><rect x="3" y="6" width="13" height="12" rx="2"/><path d="M16 10l5-3v10l-5-3"/></svg>;
const IcVoice = () => <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round"><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0"/><path d="M12 18v3"/></svg>;
const IcPhoto = () => <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round"><rect x="3.5" y="5" width="17" height="14" rx="2"/><circle cx="9" cy="10.5" r="1.5"/><path d="M4 17l5-4 4 3 3-2 4 3"/></svg>;
const IcPlay  = () => <svg width={18} height={18} viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7L8 5z"/></svg>;
const IcChev  = () => <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round"><path d="M9 6l6 6-6 6"/></svg>;
const IcLock  = () => <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>;
const IcClock = () => <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}><circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3 2"/></svg>;
const IcCheck = () => <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M5 12l4 4 10-10"/></svg>;
const IcPlus  = () => <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>;

const PHOTO_PAIRS = [
  ["#E8D4C0","#D4B89A"],["#D7DCCB","#B8C2A3"],["#D5DEE7","#B0BFD0"],["#EFE9DD","#D9D1BD"],
];

function KindIc({ kind }: { kind: ContentKind }) {
  if (kind === "video") return <IcVideo />;
  if (kind === "voice") return <IcVoice />;
  if (kind === "photo") return <IcPhoto />;
  return <IcText />;
}

const KIND_LABEL: Record<ContentKind, string> = { text: "Text", video: "Video", voice: "Hlas", photo: "Foto" };

export default function RecipientTimeline({ packs, recipientFirstName }: { packs: Pack[]; recipientFirstName: string }) {
  const [filter, setFilter] = useState<Filter>("all");

  const visible = filter === "all" ? packs : packs.filter(p => p.kind === filter);
  const filters: { id: Filter; label: string }[] = [
    { id: "all", label: `Vše · ${packs.length}` },
    ...(packs.some(p => p.kind === "text")  ? [{ id: "text"  as Filter, label: "Texty" }] : []),
    ...(packs.some(p => p.kind === "voice") ? [{ id: "voice" as Filter, label: "Hlas" }]  : []),
    ...(packs.some(p => p.kind === "video") ? [{ id: "video" as Filter, label: "Video" }] : []),
    ...(packs.some(p => p.kind === "photo") ? [{ id: "photo" as Filter, label: "Foto" }]  : []),
  ];

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, gap: 12, flexWrap: "wrap" }}>
        <h3 style={{ fontSize: 15, fontWeight: 550, margin: 0 }}>Co {recipientFirstName} jednou najde</h3>
        {filters.length > 1 && (
          <div className="arca-seg">
            {filters.map(f => (
              <button key={f.id} className={filter === f.id ? "active" : ""} onClick={() => setFilter(f.id)}>
                {f.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {visible.length === 0 ? (
        <div className="arca-card" style={{ padding: "28px 24px", textAlign: "center" }}>
          <p className="arca-sub">Žádné zprávy tohoto typu.</p>
        </div>
      ) : (
        <div className="arca-tl">
          {visible.map(pack => {
            const st = STATUS[pack.status] ?? STATUS.DRAFT;
            const textContent = pack.contents.find(c => c.type === "TEXT");
            const mediaContent = pack.contents.find(c => c.type !== "TEXT");
            const StatusIc = pack.status === "DRAFT" ? IcLock : (pack.status === "ACTIVE") ? IcClock : IcCheck;

            return (
              <div key={pack.id} className={`arca-tl__node ${st.tl}`}>
                <div className="arca-card" style={{ padding: "16px 20px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, gap: 8 }}>
                    <div style={{ display: "flex", gap: 10, alignItems: "center", minWidth: 0 }}>
                      <div style={{ width: 30, height: 30, borderRadius: 8, background: "var(--bg-tint)", display: "grid", placeItems: "center", color: "var(--ink-2)", flexShrink: 0 }}>
                        <KindIc kind={pack.kind} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 550, fontSize: 14.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{pack.title}</div>
                        <div style={{ fontFamily: "var(--f-mono)", fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{pack.triggerLabel}</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
                      <span className={`arca-chip ${st.chip}`} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11 }}>
                        <StatusIc />{st.label}
                      </span>
                      <Link href={`/dashboard/arca/${pack.id}/edit`} className="arca-btn icon-btn arca-btn--ghost">
                        <IcChev />
                      </Link>
                    </div>
                  </div>

                  {pack.kind === "text" && textContent?.textBody && (
                    <p style={{ margin: "10px 0 0", fontSize: 14, color: "var(--ink-2)", fontFamily: "var(--f-serif)", lineHeight: 1.5, fontStyle: "italic" }}>
                      &ldquo;{textContent.textBody.slice(0, 200)}{textContent.textBody.length > 200 ? "…" : ""}&rdquo;
                    </p>
                  )}

                  {pack.kind === "video" && (
                    <div style={{ marginTop: 12, aspectRatio: "16/7", background: "linear-gradient(135deg,#2A241C,#1C1A16)", borderRadius: "var(--r-md)", position: "relative", overflow: "hidden", display: "grid", placeItems: "center" }}>
                      {mediaContent?.signedUrl && (
                        <video src={mediaContent.signedUrl} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                      )}
                      <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
                        <div style={{ width: 52, height: 52, borderRadius: "50%", background: "rgba(0,0,0,0.6)", display: "grid", placeItems: "center", color: "#fff" }}>
                          <IcPlay />
                        </div>
                      </div>
                    </div>
                  )}

                  {pack.kind === "voice" && (
                    <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 16, padding: "12px 16px", background: "var(--bg-tint)", borderRadius: "var(--r-md)" }}>
                      <div style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--ink)", display: "grid", placeItems: "center", color: "var(--bg)", flexShrink: 0 }}>
                        <IcPlay />
                      </div>
                      <div style={{ flex: 1, display: "flex", gap: 2, alignItems: "center", height: 32 }}>
                        {Array.from({ length: 48 }).map((_, i) => {
                          const h = 4 + Math.abs(Math.sin(i * 0.7) * 20) + (i % 4) * 1.5;
                          return <div key={i} style={{ width: 3, height: h, background: "var(--accent)", borderRadius: 2, opacity: 0.7 }} />;
                        })}
                      </div>
                      <span style={{ fontFamily: "var(--f-mono)", color: "var(--muted)", fontSize: 12, flexShrink: 0 }}>hlas</span>
                    </div>
                  )}

                  {pack.kind === "photo" && (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6, marginTop: 12 }}>
                      {PHOTO_PAIRS.slice(0, 4).map(([a, b], i) => (
                        <div key={i} style={{ aspectRatio: "1", borderRadius: 8, background: `linear-gradient(135deg,${a},${b})` }} />
                      ))}
                    </div>
                  )}

                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12, paddingTop: 8, borderTop: "1px solid var(--hairline)" }}>
                    <span className={`arca-tag ${pack.type === "EMOTIONAL" ? "clay" : "sky"}`}>
                      {pack.type === "EMOTIONAL" ? "✦ Emocionální" : "⬡ Praktická"}
                    </span>
                    <span className="arca-tag">{KIND_LABEL[pack.kind]}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Link href="/dashboard/arca/new"
        style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 18px", marginTop: 8, borderStyle: "dashed", background: "transparent", color: "var(--muted)", cursor: "pointer", textDecoration: "none", borderRadius: "var(--r-lg)", border: "1px dashed var(--hairline)" }}>
        <IcPlus />
        <span>Přidat další zprávu pro {recipientFirstName}</span>
      </Link>
    </>
  );
}
