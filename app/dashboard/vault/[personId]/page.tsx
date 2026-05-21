import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function generateMetadata({ params }: { params: Promise<{ personId: string }> }) {
  const { personId } = await params;
  const r = await prisma.recipient.findUnique({ where: { id: personId }, select: { name: true } });
  return { title: r ? `${r.name} — ARCA` : "Příjemce" };
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const TONES = ["clay", "sage", "sky", "ink", "clay", "sage", "sky"];
function toneFor(name: string) {
  let h = 0; for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return TONES[Math.abs(h) % TONES.length];
}
function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join("");
}

// Status config for timeline nodes
const STATUS = {
  DRAFT:    { label: "Návrh",      chip: "",      tl: "" },
  ACTIVE:   { label: "Naplánováno",chip: "clay",  tl: "scheduled" },
  TRIGGERED:{ label: "Doručeno",   chip: "sage",  tl: "released" },
  DELIVERED:{ label: "Doručeno",   chip: "sage",  tl: "released" },
  GRACE_PERIOD:{ label: "Lhůta",  chip: "",      tl: "scheduled" },
  PENDING_GUARDIAN_APPROVAL:{ label: "Strážci", chip: "", tl: "scheduled" },
  ARCHIVED: { label: "Archiv",     chip: "",      tl: "" },
} as Record<string, { label: string; chip: string; tl: string }>;

// ── SVG icons ─────────────────────────────────────────────────────────────────
const Ic = ({ d, size = 14 }: { d: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);
const IcText  = () => <Ic d="M5 6h14M5 12h14M5 18h9" />;
const IcVideo = () => <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="6" width="13" height="12" rx="2"/><path d="M16 10l5-3v10l-5-3"/></svg>;
const IcVoice = () => <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0"/><path d="M12 18v3"/></svg>;
const IcPhoto = () => <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"><rect x="3.5" y="5" width="17" height="14" rx="2"/><circle cx="9" cy="10.5" r="1.5"/><path d="M4 17l5-4 4 3 3-2 4 3"/></svg>;
const IcLock  = () => <Ic d="M5 11V8a7 7 0 0 1 14 0v3M3 11h18v10H3z" size={11} />;
const IcClock = () => <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}><circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3 2"/></svg>;
const IcHeart = () => <Ic d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10Z" size={11} />;
const IcCheck = () => <Ic d="M5 12l4 4 10-10" size={11} />;
const IcChev  = ({ rotate }: { rotate?: boolean }) => (
  <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round"
    style={{ transform: rotate ? "rotate(180deg)" : undefined, display: "inline-flex" }}>
    <path d="M9 6l6 6-6 6"/>
  </svg>
);
const IcPlus  = () => <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>;
const IcPlay  = () => <svg width={18} height={18} viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7L8 5z"/></svg>;
const IcSparkle = () => <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}><path d="M12 4v4M12 16v4M4 12h4M16 12h4M6.5 6.5l2.8 2.8M14.7 14.7l2.8 2.8M17.5 6.5l-2.8 2.8M9.3 14.7L6.5 17.5"/></svg>;

function Topbar({ name }: { name: string }) {
  return (
    <div className="arca-topbar">
      <div className="arca-topbar__crumbs">
        <span style={{ fontFamily: "var(--f-serif)", fontStyle: "italic", color: "var(--accent)" }}>arca</span>
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <IcChev />
          <Link href="/dashboard/vault" style={{ color: "var(--muted)", textDecoration: "none" }}>Schránka</Link>
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <IcChev />
          <span style={{ color: "var(--ink)" }}>{name}</span>
        </span>
      </div>
    </div>
  );
}

// ── Content kind detection ────────────────────────────────────────────────────
type ContentKind = "text" | "video" | "voice" | "photo";
type ContentRow = { id: string; type: string; textBody: string | null; s3FileKey: string | null; signedUrl?: string | null };

function dominantKind(contents: ContentRow[]): ContentKind {
  if (contents.some(c => c.type === "VIDEO")) return "video";
  if (contents.some(c => c.type === "AUDIO")) return "voice";
  if (contents.some(c => c.type === "FILE")) return "photo";
  return "text";
}

function KindIcon({ kind }: { kind: ContentKind }) {
  if (kind === "video") return <IcVideo />;
  if (kind === "voice") return <IcVoice />;
  if (kind === "photo") return <IcPhoto />;
  return <IcText />;
}

const KIND_LABEL: Record<ContentKind, string> = { text: "Text", video: "Video", voice: "Hlas", photo: "Foto" };

// ── Photo grid colours (deterministic) ───────────────────────────────────────
const PHOTO_PAIRS = [
  ["#E8D4C0","#D4B89A"], ["#D7DCCB","#B8C2A3"], ["#D5DEE7","#B0BFD0"],
  ["#EFE9DD","#D9D1BD"], ["#F4E8DC","#E8D4C0"], ["#E5EAD8","#A8B58C"],
];

// ── Page ─────────────────────────────────────────────────────────────────────
export default async function RecipientDetailPage({ params }: { params: Promise<{ personId: string }> }) {
  const { personId } = await params;
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) redirect("/login");

  const recipient = await prisma.recipient.findFirst({
    where: { id: personId, messagePack: { ownerId: authUser.id } },
    select: { id: true, name: true, email: true, phone: true },
  });
  if (!recipient) notFound();

  const rawPacks = await prisma.messagePack.findMany({
    where: { ownerId: authUser.id, recipients: { some: { id: personId } } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true, title: true, type: true, status: true, createdAt: true,
      triggerCondition: { select: { type: true, executeAtDate: true, inactivityDaysLimit: true } },
      contents: {
        select: { id: true, type: true, textBody: true, s3FileKey: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  // Generate signed URLs for media content
  const packs = await Promise.all(rawPacks.map(async (pack) => {
    const contents: ContentRow[] = await Promise.all(pack.contents.map(async (c) => {
      if (!c.s3FileKey) return { ...c, signedUrl: null };
      const { data } = await supabaseAdmin.storage.from("arca-media").createSignedUrl(c.s3FileKey, 3600);
      return { ...c, signedUrl: data?.signedUrl ?? null };
    }));
    return { ...pack, contents };
  }));

  const tone = toneFor(recipient.name);
  const init = initials(recipient.name);
  const msgCount = packs.length;

  function triggerLabel(pack: typeof packs[0]): string {
    const t = pack.triggerCondition;
    if (!t) return "kdykoli";
    if (t.type === "SPECIFIC_DATE" && t.executeAtDate) {
      return t.executeAtDate.toLocaleDateString("cs-CZ", { day: "numeric", month: "long", year: "numeric" });
    }
    if (t.type === "INACTIVITY" && t.inactivityDaysLimit) return `po ${t.inactivityDaysLimit} dnech`;
    if (t.type === "MANUAL_EMERGENCY") return "při události";
    return "—";
  }

  return (
    <>
      <Topbar name={recipient.name} />
      <div className="arca-inner arca-fade-in" style={{ color: "var(--ink)" }}>

        {/* Back */}
        <Link href="/dashboard/vault" className="arca-btn sm arca-btn--ghost"
          style={{ marginLeft: -10, marginBottom: 14, display: "inline-flex" }}>
          <IcChev rotate /> Schránka
        </Link>

        {/* Hero card */}
        <div className="arca-card elev" style={{ marginBottom: 28, overflow: "hidden" }}>
          <div style={{ height: 100, background: "linear-gradient(135deg, var(--accent-tint) 0%, var(--accent-soft) 100%)", position: "relative" }}>
            <svg width="100%" height="100%" viewBox="0 0 800 100" preserveAspectRatio="xMidYMid slice" style={{ position: "absolute", inset: 0 }}>
              {[0,1,2,3].map(i => (
                <path key={i} d={`M -20 ${120 - i*14} Q 400 ${40 - i*14} 820 ${120 - i*14}`}
                  fill="none" stroke="var(--accent)" strokeOpacity={0.18 - i*0.03} strokeWidth="1"/>
              ))}
            </svg>
          </div>
          <div style={{ padding: "0 32px 24px", marginTop: -36, display: "flex", alignItems: "flex-end", gap: 22 }}>
            <span className={`arca-avatar xl ${tone}`} style={{ border: "4px solid var(--surface)", flexShrink: 0 }}>{init}</span>
            <div style={{ flex: 1, paddingBottom: 6 }}>
              <h1 className="arca-h1" style={{ margin: 0, fontSize: 32 }}>{recipient.name}</h1>
              <div style={{ display: "flex", gap: 12, marginTop: 6, color: "var(--muted)", fontSize: 13, flexWrap: "wrap" }}>
                {recipient.email && <span>{recipient.email}</span>}
                {recipient.phone && <><span style={{ opacity: .4 }}>·</span><span>{recipient.phone}</span></>}
                <span style={{ opacity: .4 }}>·</span>
                <span>{msgCount} {msgCount === 1 ? "zpráva" : msgCount < 5 ? "zprávy" : "zpráv"} připraveno</span>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, paddingBottom: 6 }}>
              <Link href="/dashboard/arca/new" className="arca-btn arca-btn--primary"><IcPlus /> Nová zpráva</Link>
            </div>
          </div>
        </div>

        {/* Split layout */}
        <div className="arca-split">

          {/* Timeline */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 className="arca-h3">Co {recipient.name.split(" ")[0]} jednou najde</h3>
              <div className="arca-seg">
                <button className="active">Vše</button>
                <button>Texty</button>
                <button>Video</button>
                <button>Hlas</button>
              </div>
            </div>

            {packs.length === 0 ? (
              <div className="arca-card" style={{ padding: "32px 24px", textAlign: "center" }}>
                <p className="arca-sub">Zatím žádné zprávy pro tuto osobu.</p>
                <Link href="/dashboard/arca/new" className="arca-btn arca-btn--primary"
                  style={{ marginTop: 16, display: "inline-flex" }}>
                  <IcPlus /> Nová zpráva
                </Link>
              </div>
            ) : (
              <div className="arca-tl">
                {packs.map(pack => {
                  const st = STATUS[pack.status] ?? STATUS.DRAFT;
                  const kind = dominantKind(pack.contents);
                  const textContent = pack.contents.find(c => c.type === "TEXT");
                  const mediaContent = pack.contents.find(c => c.type !== "TEXT");
                  const whenLabel = triggerLabel(pack);

                  const TlIc = kind === "video" ? IcVideo : kind === "voice" ? IcVoice : kind === "photo" ? IcPhoto : IcText;
                  const StatusIc = pack.status === "DRAFT" ? IcLock : pack.status === "ACTIVE" ? IcClock : IcCheck;

                  return (
                    <div key={pack.id} className={`arca-tl__node ${st.tl}`}>
                      <div className="arca-card" style={{ padding: "16px 20px" }}>
                        {/* Header row */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                            <div style={{ width: 30, height: 30, borderRadius: 8, background: "var(--bg-tint)", display: "grid", placeItems: "center", color: "var(--ink-2)", flexShrink: 0 }}>
                              <TlIc />
                            </div>
                            <div>
                              <div style={{ fontWeight: 550, fontSize: 14.5 }}>{pack.title}</div>
                              <div className="arca-mono" style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{whenLabel}</div>
                            </div>
                          </div>
                          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            <span className={`arca-chip ${st.chip}`} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                              <StatusIc />{st.label}
                            </span>
                            <Link href={`/dashboard/arca/${pack.id}/edit`} className="arca-btn icon-btn arca-btn--ghost">
                              <IcChev />
                            </Link>
                          </div>
                        </div>

                        {/* Content preview */}
                        {kind === "text" && textContent?.textBody && (
                          <p style={{ margin: "10px 0 0", fontSize: 14, color: "var(--ink-2)", fontFamily: "var(--f-serif)", lineHeight: 1.5, fontStyle: "italic" }}>
                            &ldquo;{textContent.textBody.slice(0, 180)}{textContent.textBody.length > 180 ? "…" : ""}&rdquo;
                          </p>
                        )}

                        {kind === "video" && (
                          <div style={{ marginTop: 12, aspectRatio: "16/7", background: "linear-gradient(135deg, #2A241C, #1C1A16)", borderRadius: "var(--r-md)", position: "relative", overflow: "hidden", display: "grid", placeItems: "center" }}>
                            {mediaContent?.signedUrl ? (
                              <video src={mediaContent.signedUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            ) : null}
                            <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
                              <div style={{ width: 52, height: 52, borderRadius: "50%", background: "rgba(0,0,0,0.6)", display: "grid", placeItems: "center", color: "#fff", backdropFilter: "blur(6px)" }}>
                                <IcPlay />
                              </div>
                            </div>
                            {pack.contents.find(c => c.type === "VIDEO") && (
                              <span className="arca-mono" style={{ position: "absolute", top: 10, left: 10, background: "rgba(0,0,0,0.6)", color: "#fff", padding: "2px 8px", borderRadius: 5, fontSize: 11 }}>
                                VIDEO
                              </span>
                            )}
                          </div>
                        )}

                        {kind === "voice" && (
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
                            <span className="arca-mono" style={{ color: "var(--muted)", fontSize: 12, flexShrink: 0 }}>hlasová zpráva</span>
                          </div>
                        )}

                        {kind === "photo" && (
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6, marginTop: 12 }}>
                            {PHOTO_PAIRS.slice(0, 4).map(([a, b], i) => (
                              <div key={i} style={{ aspectRatio: "1", borderRadius: 8, background: `linear-gradient(135deg, ${a}, ${b})` }} />
                            ))}
                          </div>
                        )}

                        {/* Footer */}
                        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12, paddingTop: 8, borderTop: "1px solid var(--hairline)" }}>
                          <span className={`arca-tag ${pack.type === "EMOTIONAL" ? "clay" : "sky"}`}>
                            {pack.type === "EMOTIONAL" ? "✦ Emocionální" : "⬡ Praktická"}
                          </span>
                          <span className="arca-tag">{KIND_LABEL[kind]}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Add more */}
            <Link href="/dashboard/arca/new"
              className="arca-card flat"
              style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 18px", borderStyle: "dashed", background: "transparent", color: "var(--muted)", cursor: "pointer", textDecoration: "none", borderRadius: "var(--r-lg)", border: "1px dashed var(--hairline)", marginTop: 8 }}>
              <IcPlus />
              <span>Přidat další zprávu pro {recipient.name.split(" ")[0]}</span>
            </Link>
          </div>

          {/* Sidebar */}
          <div className="arca-stack-4">
            <div className="arca-card">
              <div style={{ padding: "20px 22px" }}>
                <h3 className="arca-h3" style={{ marginBottom: 14 }}>O příjemci</h3>
                {[
                  ["E-mail", recipient.email ?? "—"],
                  ["Telefon", recipient.phone ?? "—"],
                  ["Zpráv", msgCount.toString()],
                  ["Typů obsahu", [...new Set(packs.flatMap(p => p.contents.map(c => c.type)))].length.toString()],
                ].map(([label, value]) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--hairline)" }}>
                    <span className="arca-mono" style={{ color: "var(--muted)" }}>{label}</span>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Message type summary */}
            {packs.length > 0 && (
              <div className="arca-card">
                <div style={{ padding: "20px 22px" }}>
                  <h3 className="arca-h3" style={{ marginBottom: 12 }}>Obsah</h3>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    {[
                      { label: "Texty",  count: packs.filter(p => p.contents.some(c => c.type === "TEXT")).length,  Ic: IcText },
                      { label: "Videa",  count: packs.filter(p => p.contents.some(c => c.type === "VIDEO")).length, Ic: IcVideo },
                      { label: "Hlas",   count: packs.filter(p => p.contents.some(c => c.type === "AUDIO")).length, Ic: IcVoice },
                      { label: "Soubory",count: packs.filter(p => p.contents.some(c => c.type === "FILE")).length,  Ic: IcPhoto },
                    ].filter(t => t.count > 0).map(t => (
                      <div key={t.label} style={{ padding: "8px 12px", borderRadius: "var(--r-md)", background: "var(--bg-tint)", display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ color: "var(--accent)" }}><t.Ic /></span>
                        <span style={{ fontWeight: 550, fontSize: 13 }}>{t.count}</span>
                        <span className="arca-sub" style={{ fontSize: 12 }}>{t.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="arca-card flat" style={{ background: "var(--accent-tint)", border: "none" }}>
              <div style={{ padding: "20px 22px" }}>
                <div style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}>
                  <span style={{ color: "var(--accent)" }}><IcSparkle /></span>
                  <span style={{ fontSize: 12, fontWeight: 550, color: "var(--accent-deep)" }}>Návrh od ARCA</span>
                </div>
                <p style={{ fontFamily: "var(--f-serif)", fontSize: 17, lineHeight: 1.3, margin: "0 0 14px", color: "var(--accent-deep)" }}>
                  „Napiš {recipient.name.split(" ")[0]}, co pro tebe znamená."
                </p>
                <Link href="/dashboard/arca/new" className="arca-btn sm"
                  style={{ background: "var(--surface-2)", color: "var(--accent)", textDecoration: "none" }}>
                  Začít psát <IcChev />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
