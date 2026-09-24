import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";
import GuardianListClient from "@/components/arca/GuardianListClient";
import type { GuardianItem, GuardianGroup } from "@/components/arca/GuardianListClient";
import CheckInButton from "@/components/dashboard/CheckInButton";
import HeartbeatWidget from "@/components/dashboard/HeartbeatWidget";

export async function generateMetadata() {
  const t = await getTranslations("Guardians");
  return { title: `${t("kicker")} — ARCA` };
}

function Topbar({ crumb }: { crumb: string }) {
  return (
    <div className="arca-topbar">
      <div className="arca-topbar__crumbs">
        <span style={{ fontFamily: "var(--f-serif)", fontStyle: "italic", color: "var(--accent)" }}>arca</span>
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}><path d="M9 6l6 6-6 6"/></svg>
          <span className="here">{crumb}</span>
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
  const t = await getTranslations("Guardians");
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) redirect("/login");

  const [user, guardians, groups] = await Promise.all([
    prisma.user.findUnique({
      where: { id: authUser.id },
      select: { lastActiveAt: true, webhookSecret: true, name: true },
    }),
    prisma.guardian.findMany({
      where: { userId: authUser.id },
      orderBy: { createdAt: "asc" },
      select: {
        id: true, name: true, email: true, createdAt: true,
        groupId: true,
        group: { select: { id: true, name: true, color: true, emoji: true } },
      },
    }),
    prisma.contactGroup.findMany({
      where: { userId: authUser.id },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, color: true, emoji: true },
    }),
  ]);

  if (!user) redirect("/login");

  const now = new Date();
  const daysSinceActive = Math.floor((now.getTime() - user.lastActiveAt.getTime()) / 86_400_000);

  const guardianList: GuardianItem[] = guardians.map((g) => ({
    id: g.id,
    name: g.name,
    email: g.email,
    groupId: g.groupId,
    group: g.group,
  }));

  return (
    <>
      <Topbar crumb={t("kicker")} />
      <div className="arca-inner arca-fade-in">

        {/* Header */}
        <div className="arca-row arca-between" style={{ marginBottom: 8 }}>
          <div>
            <div className="arca-kicker">{t("kicker")}</div>
            <h1 className="arca-h1" style={{ marginTop: 8 }}>{t.rich("title", { em: (chunks) => <em>{chunks}</em> })}</h1>
          </div>
        </div>
        <p className="arca-sub" style={{ maxWidth: 580, marginBottom: 28 }}>
          {t("subtitle")}
        </p>

        {/* Rule card */}
        <div className="arca-card elev" style={{ marginBottom: 28, overflow: "hidden" }}>
          <div className="arca-guardian-rule-grid" style={{ padding: "24px 28px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 28, alignItems: "center" }}>
            <div>
              <span className="arca-chip sage"><span className="dot" /> {t("ruleCard.badge")}</span>
              <h2 className="arca-h2" style={{ marginTop: 12 }}>{t("ruleCard.title")}</h2>
              <p className="arca-sub" style={{ marginTop: 8 }}>
                {t.rich("ruleCard.body", { strong: (chunks) => <strong style={{ color: "var(--ink)" }}>{chunks}</strong> })}
              </p>
            </div>
            <div className="arca-card flat" style={{ background: "var(--bg-tint)", border: "none", padding: 22 }}>
              <div className="arca-row arca-between" style={{ marginBottom: 14 }}>
                <span style={{ fontSize: 12, color: "var(--muted)", fontFamily: "var(--f-mono)" }}>{t("ruleCard.status")}</span>
                <span className="arca-chip sage">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l4 4 10-10"/></svg>
                  {t("ruleCard.allGood")}
                </span>
              </div>
              <Row label={t("ruleCard.lastSeen")} value={daysSinceActive === 0 ? t("ruleCard.justNow") : t("ruleCard.daysAgo", { days: daysSinceActive })} />
              <Row label={t("ruleCard.confirmRule")} value={t("ruleCard.confirmRatio")} />
              <Row label={t("ruleCard.guardianCount")} value={`${guardians.length} / 3`} />
              <Row label={t("ruleCard.firstDeliveryLabel")} value={t("ruleCard.firstDeliveryValue")} />
            </div>
          </div>
        </div>

        {/* Guardian list with groups */}
        <h3 className="arca-h3" style={{ marginBottom: 14 }}>{t("yourGuardians")} · {guardians.length}</h3>
        <div style={{ marginBottom: 32 }}>
          <GuardianListClient
            initialGuardians={guardianList}
            initialGroups={groups as GuardianGroup[]}
          />
        </div>

        {/* Check-in + Heartbeat */}
        <div className="arca-presence-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 28 }}>
          {/* Presence check-in */}
          <div className="arca-card">
            <div style={{ padding: "20px 22px" }}>
              <div className="arca-row arca-between" style={{ marginBottom: 12 }}>
                <h3 className="arca-h3">{t("presence.title")}</h3>
                <span className="arca-chip sage"><span className="dot" /> {t("presence.active")}</span>
              </div>
              <p className="arca-sub" style={{ fontSize: 12.5, marginBottom: 16 }}>
                {t("presence.hint")}
              </p>
              <CheckInButton lastActiveAt={user.lastActiveAt} />
            </div>
          </div>

          {/* Heartbeat webhook */}
          <HeartbeatWidget
            webhookSecret={user.webhookSecret ?? ""}
            appUrl={process.env.NEXT_PUBLIC_SITE_URL ?? "https://arca-taupe.vercel.app"}
          />
        </div>

        {/* Ping steps */}
        <div className="arca-card">
          <div style={{ padding: "20px 22px" }}>
            <h3 className="arca-h3" style={{ marginBottom: 6 }}>{t("pingSteps.title")}</h3>
            <p className="arca-sub" style={{ fontSize: 12.5, marginBottom: 16 }}>
              {t("pingSteps.subtitle")}
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
              <PingStep n="01" label={t("pingSteps.step1Label")} sub={t("pingSteps.step1Sub")} />
              <PingStep n="02" label={t("pingSteps.step2Label")} sub={t("pingSteps.step2Sub")} />
              <PingStep n="03" label={t("pingSteps.step3Label")} sub={t("pingSteps.step3Sub")} />
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
                {t("reassurance.titlePlain")} <em style={{ color: "var(--accent)" }}>{t("reassurance.titleItalic")}</em>
              </h3>
              <p style={{ margin: "6px 0 0", color: "color-mix(in srgb, var(--bg) 65%, transparent)", fontSize: 13 }}>
                {t("reassurance.body")}
              </p>
            </div>
            <Link href="/dashboard/billing" className="arca-btn" style={{ background: "color-mix(in srgb, var(--bg) 8%, transparent)", color: "var(--bg)", borderColor: "color-mix(in srgb, var(--bg) 12%, transparent)" }}>
              {t("reassurance.explorePlanBtn")}
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
