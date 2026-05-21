import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";

const TONES = ["clay", "sage", "sky", "ink", "clay", "sage", "sky"];
function toneFor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return TONES[Math.abs(h) % TONES.length];
}
function initials(name: string): string {
  return name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");
}

const IcChevron = ({ rotate }: { rotate?: boolean }) => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"
    style={{ transform: rotate ? "rotate(180deg)" : undefined, display: "inline-flex" }}>
    <path d="M9 6l6 6-6 6"/>
  </svg>
);
const IcPlus = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 5v14M5 12h14"/>
  </svg>
);

const STATUS_LABEL: Record<string, { label: string; cls: string; tl: string }> = {
  DRAFT:    { label: "Návrh",    cls: "",      tl: "scheduled" },
  ACTIVE:   { label: "Aktivní",  cls: "clay",  tl: "released" },
  TRIGGERED:{ label: "Odesláno",cls: "sage",  tl: "released" },
  DELIVERED:{ label: "Doručeno",cls: "sage",  tl: "released" },
  ARCHIVED: { label: "Archiv",  cls: "",      tl: "scheduled" },
  GRACE_PERIOD: { label: "Lhůta", cls: "",    tl: "scheduled" },
  PENDING_GUARDIAN_APPROVAL: { label: "Strážci", cls: "", tl: "scheduled" },
};

function Topbar({ name }: { name: string }) {
  return (
    <div className="arca-topbar">
      <div className="arca-topbar__crumbs">
        <span style={{ fontFamily: "var(--f-serif)", fontStyle: "italic", color: "var(--accent)" }}>arca</span>
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <IcChevron />
          <Link href="/dashboard/vault" style={{ color: "var(--muted)", textDecoration: "none" }}>Schránka</Link>
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <IcChevron />
          <span className="here">{name}</span>
        </span>
      </div>
    </div>
  );
}

export default async function RecipientDetailPage({ params }: { params: Promise<{ personId: string }> }) {
  const { personId } = await params;
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) redirect("/login");

  // Find the recipient (must belong to this user's packs)
  const recipient = await prisma.recipient.findFirst({
    where: { id: personId, messagePack: { ownerId: authUser.id } },
    select: { id: true, name: true, email: true, phone: true },
  });
  if (!recipient) notFound();

  // All packs this person is on
  const packs = await prisma.messagePack.findMany({
    where: {
      ownerId: authUser.id,
      recipients: { some: { id: personId } },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true, title: true, type: true, status: true, createdAt: true,
      triggerCondition: { select: { type: true, executeAtDate: true, inactivityDaysLimit: true } },
      contents: { where: { type: "TEXT" }, select: { textBody: true }, take: 1 },
    },
  });

  const tone = toneFor(recipient.name);
  const init = initials(recipient.name);
  const msgCount = packs.length;

  function triggerLabel(pack: typeof packs[0]): string {
    const t = pack.triggerCondition;
    if (!t) return "Bez spouštěče";
    if (t.type === "SPECIFIC_DATE" && t.executeAtDate) {
      return t.executeAtDate.toLocaleDateString("cs-CZ", { day: "numeric", month: "long", year: "numeric" });
    }
    if (t.type === "INACTIVITY" && t.inactivityDaysLimit) return `Po ${t.inactivityDaysLimit} dnech nečinnosti`;
    if (t.type === "MANUAL_EMERGENCY") return "Ruční spouštěč";
    return "—";
  }

  return (
    <>
      <Topbar name={recipient.name} />
      <div className="arca-inner arca-fade-in">

        {/* Back */}
        <Link href="/dashboard/vault" className="arca-btn sm arca-btn--ghost" style={{ marginLeft: -10, marginBottom: 14 }}>
          <IcChevron rotate /> Schránka
        </Link>

        {/* Hero card */}
        <div className="arca-card elev" style={{ marginBottom: 28, overflow: "hidden" }}>
          <div style={{
            height: 100,
            background: `linear-gradient(135deg, var(--accent-tint) 0%, var(--accent-soft) 100%)`,
            position: "relative"
          }}>
            <svg width="100%" height="100%" viewBox="0 0 800 100" preserveAspectRatio="xMidYMid slice" style={{ position: "absolute", inset: 0 }}>
              {[0,1,2,3].map((i) => (
                <path key={i} d={`M -20 ${120 - i*14} Q 400 ${40 - i*14} 820 ${120 - i*14}`}
                  fill="none" stroke="var(--accent)" strokeOpacity={0.18 - i*0.03} strokeWidth="1"/>
              ))}
            </svg>
          </div>
          <div style={{ padding: "0 32px 24px", marginTop: -36, display: "flex", alignItems: "flex-end", gap: 22 }}>
            <span className={`arca-avatar xl ${tone}`} style={{ border: "4px solid var(--surface)" }}>{init}</span>
            <div style={{ flex: 1, paddingBottom: 6 }}>
              <h1 className="arca-h1" style={{ margin: 0, fontSize: 32 }}>{recipient.name}</h1>
              <div className="arca-row" style={{ gap: 12, marginTop: 6, color: "var(--muted)", fontSize: 13 }}>
                {recipient.email && <span>{recipient.email}</span>}
                {recipient.phone && <><span style={{ opacity: .4 }}>·</span><span>{recipient.phone}</span></>}
                <span style={{ opacity: .4 }}>·</span>
                <span>{msgCount} {msgCount === 1 ? "zpráva" : msgCount < 5 ? "zprávy" : "zpráv"} připraveno</span>
              </div>
            </div>
            <div className="arca-row" style={{ gap: 8, paddingBottom: 6 }}>
              <Link href="/dashboard/arca/new" className="arca-btn arca-btn--primary"><IcPlus /> Nová zpráva</Link>
            </div>
          </div>
        </div>

        {/* Split layout */}
        <div className="arca-split">
          {/* Timeline */}
          <div>
            <h3 className="arca-h3" style={{ marginBottom: 16 }}>Co {recipient.name.split(" ")[0]} jednou najde</h3>

            {packs.length === 0 ? (
              <div className="arca-card" style={{ padding: "32px 24px", textAlign: "center" }}>
                <p className="arca-sub">Zatím žádné zprávy pro tuto osobu.</p>
                <Link href="/dashboard/arca/new" className="arca-btn arca-btn--primary" style={{ marginTop: 16, display: "inline-flex" }}>
                  <IcPlus /> Nová zpráva
                </Link>
              </div>
            ) : (
              <div className="arca-tl">
                {packs.map((pack) => {
                  const st = STATUS_LABEL[pack.status] ?? STATUS_LABEL.DRAFT;
                  const preview = pack.contents[0]?.textBody?.slice(0, 120);
                  return (
                    <div key={pack.id} className={`arca-tl__node ${st.tl}`}>
                      <div className="arca-row arca-between" style={{ marginBottom: 6 }}>
                        <div className="arca-row" style={{ gap: 8 }}>
                          <span style={{ fontSize: 16 }}>{pack.type === "EMOTIONAL" ? "✦" : "⬡"}</span>
                          <strong style={{ fontSize: 14, fontWeight: 550 }}>{pack.title}</strong>
                          <span className={`arca-chip ${st.cls}`}>{st.label}</span>
                        </div>
                        <div className="arca-row" style={{ gap: 8 }}>
                          <span className="arca-mono" style={{ color: "var(--muted)", fontSize: 11 }}>{triggerLabel(pack)}</span>
                          <Link href={`/dashboard/arca/${pack.id}/edit`} className="arca-btn icon-btn arca-btn--ghost">
                            <IcChevron />
                          </Link>
                        </div>
                      </div>
                      {preview && (
                        <p className="arca-sub" style={{ fontSize: 13, margin: 0, lineHeight: 1.5 }}>
                          {preview}{preview.length >= 120 ? "…" : ""}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <Link href="/dashboard/arca/new" className="arca-card flat" style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 18px", borderStyle: "dashed", background: "transparent", color: "var(--muted)", cursor: "pointer", textDecoration: "none", borderRadius: "var(--r-lg)", border: "1px dashed var(--hairline)" }}>
              <IcPlus />
              <span>Přidat další zprávu pro {recipient.name.split(" ")[0]}</span>
            </Link>
          </div>

          {/* Sidebar info */}
          <div className="arca-stack-4">
            <div className="arca-card">
              <div style={{ padding: "20px 22px" }}>
                <h3 className="arca-h3" style={{ marginBottom: 14 }}>O příjemci</h3>
                {[
                  ["E-mail", recipient.email ?? "—"],
                  ["Telefon", recipient.phone ?? "—"],
                  ["Zpráv celkem", msgCount.toString()],
                ].map(([label, value]) => (
                  <div key={label} className="arca-row arca-between" style={{ padding: "6px 0", borderBottom: "1px solid var(--hairline)" }}>
                    <span className="arca-mono" style={{ color: "var(--muted)" }}>{label}</span>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="arca-card flat" style={{ background: "var(--accent-tint)", border: "none" }}>
              <div style={{ padding: "20px 22px" }}>
                <div className="arca-row" style={{ gap: 8, marginBottom: 8 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"><path d="M12 4v4M12 16v4M4 12h4M16 12h4M6.5 6.5l2.8 2.8M14.7 14.7l2.8 2.8M17.5 6.5l-2.8 2.8M9.3 14.7L6.5 17.5"/></svg>
                  <span style={{ fontSize: 12, fontWeight: 550, color: "var(--accent-deep)" }}>Návrh od ARCA</span>
                </div>
                <p style={{ fontFamily: "var(--f-serif)", fontSize: 17, lineHeight: 1.3, margin: "0 0 14px", color: "var(--accent-deep)" }}>
                  „Napiš {recipient.name.split(" ")[0]}, co pro tebe znamená."
                </p>
                <Link href="/dashboard/arca/new" className="arca-btn sm" style={{ background: "#fff", color: "var(--accent)", textDecoration: "none" }}>
                  Začít psát
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}><path d="M5 12h14M13 6l6 6-6 6"/></svg>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
