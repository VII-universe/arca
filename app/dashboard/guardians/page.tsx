import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";
import GuardianManager from "@/components/dashboard/GuardianManager";
import CheckInButton from "@/components/dashboard/CheckInButton";
import HeartbeatWidget from "@/components/dashboard/HeartbeatWidget";

export const metadata = { title: "Strážci — ARCA" };

function Topbar() {
  return (
    <div className="arca-topbar">
      <div className="arca-topbar__crumbs">
        <span style={{ fontFamily: "var(--f-serif)", fontStyle: "italic", color: "var(--accent)" }}>arca</span>
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}><path d="M9 6l6 6-6 6"/></svg>
          <span className="here">Strážci</span>
        </span>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="arca-row arca-between" style={{ padding: "6px 0" }}>
      <span style={{ fontSize: 12.5, color: "var(--muted)" }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 500 }}>{value}</span>
    </div>
  );
}

function PingStep({ n, label, sub }: { n: string; label: string; sub: string }) {
  return (
    <div style={{ padding: 16, borderRadius: 12, background: "var(--bg-tint)" }}>
      <span className="arca-mono" style={{ color: "var(--accent)", fontSize: 11 }}>{n}</span>
      <div style={{ fontWeight: 550, fontSize: 14, marginTop: 6 }}>{label}</div>
      <div className="arca-sub" style={{ fontSize: 12.5, marginTop: 2 }}>{sub}</div>
    </div>
  );
}

export default async function GuardiansPage() {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) redirect("/login");

  const [user, guardians] = await Promise.all([
    prisma.user.findUnique({
      where: { id: authUser.id },
      select: { lastActiveAt: true, webhookSecret: true, name: true },
    }),
    prisma.guardian.findMany({
      where: { userId: authUser.id },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, email: true, createdAt: true },
    }),
  ]);

  if (!user) redirect("/login");

  const now = new Date();
  const daysSinceActive = Math.floor((now.getTime() - user.lastActiveAt.getTime()) / 86_400_000);

  const guardianList = guardians.map((g) => ({
    id: g.id,
    name: g.name,
    email: g.email,
  }));

  return (
    <>
      <Topbar />
      <div className="arca-inner arca-fade-in">

        {/* Header */}
        <div className="arca-row arca-between" style={{ marginBottom: 8 }}>
          <div>
            <div className="arca-kicker">Strážci</div>
            <h1 className="arca-h1" style={{ marginTop: 8 }}>Lidé, kterým <em>věříš.</em></h1>
          </div>
        </div>
        <p className="arca-sub" style={{ maxWidth: 580, marginBottom: 28 }}>
          Strážci nikdy nevidí obsah tvých zpráv. Jen rozhodují společně o tom, kdy je čas, aby je ARCA doručila.
          Doporučujeme aspoň tři.
        </p>

        {/* Rule card */}
        <div className="arca-card elev" style={{ marginBottom: 28, overflow: "hidden" }}>
          <div style={{ padding: "24px 28px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 28, alignItems: "center" }}>
            <div>
              <span className="arca-chip sage"><span className="dot" /> Pravidlo doručení</span>
              <h2 className="arca-h2" style={{ marginTop: 12 }}>Tichý strážce</h2>
              <p className="arca-sub" style={{ marginTop: 8 }}>
                Když se v ARCA dlouho neukážeš, jemně se zeptá tvých strážců.
                Pokud <strong style={{ color: "var(--ink)" }}>2 ze 3</strong> potvrdí, naplánované zprávy se začnou doručovat.
              </p>
            </div>
            <div className="arca-card flat" style={{ background: "var(--bg-tint)", border: "none", padding: 22 }}>
              <div className="arca-row arca-between" style={{ marginBottom: 14 }}>
                <span style={{ fontSize: 12, color: "var(--muted)", fontFamily: "var(--f-mono)" }}>Status</span>
                <span className="arca-chip sage">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l4 4 10-10"/></svg>
                  Vše v pořádku
                </span>
              </div>
              <Row label="Naposledy jsi byl zde" value={daysSinceActive === 0 ? "právě teď" : `před ${daysSinceActive} dny`} />
              <Row label="Strážci potvrdí" value="2 ze 3" />
              <Row label="Počet strážců" value={`${guardians.length} / 3`} />
              <Row label="První doručení po" value="14 dní od potvrzení" />
            </div>
          </div>
        </div>

        {/* Guardians manager */}
        <h3 className="arca-h3" style={{ marginBottom: 14 }}>Tvoji strážci · {guardians.length}</h3>

        {/* Guardian rows */}
        <div className="arca-stack-3" style={{ marginBottom: 32 }}>
          {guardianList.map((g, i) => {
            const tones = ["sage", "sky", "clay"];
            const tone = tones[i % tones.length];
            const init = g.name.split(" ").filter(Boolean).slice(0, 2).map((w: string) => w[0].toUpperCase()).join("");
            return (
              <div key={g.id} className="arca-card" style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: 16 }}>
                <span className={`arca-avatar lg ${tone}`}>{init}</span>
                <div style={{ flex: 1 }}>
                  <div className="arca-row" style={{ gap: 8 }}>
                    <span style={{ fontWeight: 550, fontSize: 14.5 }}>{g.name}</span>
                    <span className="arca-chip sage">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M5 12l4 4 10-10"/></svg>
                      Potvrzeno
                    </span>
                  </div>
                  <div className="arca-sub" style={{ fontSize: 12.5, marginTop: 2 }}>{g.email}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* GuardianManager component for adding/removing */}
        <div style={{ marginBottom: 32 }}>
          <GuardianManager initialGuardians={guardianList} />
        </div>

        {/* Check-in + Heartbeat */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 28 }}>
          {/* Presence check-in */}
          <div className="arca-card">
            <div style={{ padding: "20px 22px" }}>
              <div className="arca-row arca-between" style={{ marginBottom: 12 }}>
                <h3 className="arca-h3">Přítomnost</h3>
                <span className="arca-chip sage"><span className="dot" /> Aktivní</span>
              </div>
              <p className="arca-sub" style={{ fontSize: 12.5, marginBottom: 16 }}>
                Potvrď, že jsi tu a resetuj všechny časovače nečinnosti.
              </p>
              <CheckInButton lastActiveAt={user.lastActiveAt} />
            </div>
          </div>

          {/* Heartbeat webhook */}
          <HeartbeatWidget
            webhookSecret={user.webhookSecret ?? ""}
            appUrl={process.env.NEXT_PUBLIC_SITE_URL ?? "https://arca-navy.vercel.app"}
          />
        </div>

        {/* Ping steps */}
        <div className="arca-card">
          <div style={{ padding: "20px 22px" }}>
            <h3 className="arca-h3" style={{ marginBottom: 6 }}>Jemné kontaktování</h3>
            <p className="arca-sub" style={{ fontSize: 12.5, marginBottom: 16 }}>
              Před tím, než ARCA cokoli doručí, tě kontaktuje ve třech krocích.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
              <PingStep n="01" label="60 dní" sub="Mírná notifikace v aplikaci." />
              <PingStep n="02" label="75 dní" sub="E-mail s dotazem 'Jsi tu?'" />
              <PingStep n="03" label="90 dní" sub="Aktivace strážců — 14 dní na reakci." />
            </div>
          </div>
        </div>

        {/* Reassurance */}
        <div className="arca-card flat" style={{ background: "var(--ink)", color: "var(--bg)", border: "none", marginTop: 28 }}>
          <div style={{ padding: "20px 22px", display: "flex", alignItems: "center", gap: 20 }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3l8 3v5c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-3Z"/><path d="M9 12l2 2 4-4"/>
            </svg>
            <div style={{ flex: 1 }}>
              <h3 style={{ fontFamily: "var(--f-serif)", fontSize: 22, margin: 0, fontWeight: 400 }}>
                Můžeš si oddechnout. <em style={{ color: "var(--accent)" }}>Máme to.</em>
              </h3>
              <p style={{ margin: "6px 0 0", color: "rgba(255,255,255,0.65)", fontSize: 13 }}>
                Tvoje zprávy jsou šifrované a doručí se přesně tehdy, kdy jsi to chtěl. Ani dříve, ani později.
              </p>
            </div>
            <Link href="/dashboard/billing" className="arca-btn" style={{ background: "rgba(255,255,255,0.08)", color: "var(--bg)", borderColor: "rgba(255,255,255,0.12)" }}>
              Prozkoumat plán
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
