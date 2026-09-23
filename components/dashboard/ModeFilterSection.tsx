"use client";

import { useState } from "react";
import Link from "next/link";
import { Avatar } from "@/components/arca/Avatar";

// ── Types ─────────────────────────────────────────────────────────────────────

type Filter = "ALL" | "SELF" | "LEGACY";

interface PackLite {
  id: string;
  title: string;
  type: "EMOTIONAL" | "PRACTICAL";
  status: string;
  messageMode: "SELF" | "LEGACY";
  updatedAt: string;
  recipients: { id: string; name: string; email: string | null; avatarUrl: string | null }[];
  triggerCondition: { type: string; executeAtDate: string | null } | null;
}

interface Guardian {
  id: string;
  name: string;
  email: string;
}

interface Props {
  packs: PackLite[];
  guardians: Guardian[];
  avatarUrlByPath: Record<string, string | null>;
  daysSinceActive: number;
  // Fáze 2 — oldest delivered SELF message still waiting for a reply, if any.
  unansweredSelfPack: { id: string; title: string; deliveredAt: string | null } | null;
}

function initialsFor(name: string): string {
  return name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");
}
const TONES = ["clay", "sage", "sky", "ink"];
function toneFor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return TONES[Math.abs(h) % TONES.length];
}
const kindIcon = (type: "EMOTIONAL" | "PRACTICAL") => (type === "EMOTIONAL" ? "✦" : "⬡");
const kindColor = (type: "EMOTIONAL" | "PRACTICAL") => (type === "EMOTIONAL" ? "var(--accent)" : "var(--sky)");

function StatCard({ label, value, hint, tone }: { label: string; value: number | string; hint: string; tone?: "clay" | "sage" | "sky" }) {
  const color = tone === "clay" ? "var(--accent)" : tone === "sage" ? "var(--sage)" : tone === "sky" ? "var(--sky)" : "var(--ink)";
  return (
    <div className="arca-card" style={{ padding: "20px 22px", minHeight: 120, display: "flex", flexDirection: "column", justifyContent: "space-between", alignItems: "center", textAlign: "center" }}>
      <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 500 }}>{label}</span>
      <span style={{ fontFamily: "var(--f-serif)", fontSize: 42, lineHeight: 1, fontWeight: 400, color }}>{value}</span>
      <span style={{ fontSize: 11, color: "var(--muted)", fontFamily: "var(--f-mono)" }}>{hint}</span>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function ModeFilterSection({ packs, guardians, avatarUrlByPath, daysSinceActive, unansweredSelfPack }: Props) {
  const [filter, setFilter] = useState<Filter>("ALL");

  const selfCount = packs.filter((p) => p.messageMode === "SELF").length;
  const legacyCount = packs.filter((p) => p.messageMode === "LEGACY").length;

  const filtered = filter === "ALL" ? packs : packs.filter((p) => p.messageMode === filter);

  const activeCount = filtered.filter((p) => p.status === "ACTIVE").length;
  const deliveredCount = filtered.filter((p) => p.status === "DELIVERED" || p.status === "TRIGGERED").length;
  const draftCount = filtered.filter((p) => p.status === "DRAFT").length;
  const totalRecipients = new Set(filtered.flatMap((p) => p.recipients.map((r) => r.email ?? r.name))).size;

  const upcomingAll = packs
    .filter((p) => p.triggerCondition?.type === "SPECIFIC_DATE" && p.triggerCondition.executeAtDate)
    .sort((a, b) => new Date(a.triggerCondition!.executeAtDate!).getTime() - new Date(b.triggerCondition!.executeAtDate!).getTime());
  const upcoming = (filter === "ALL" ? upcomingAll : upcomingAll.filter((p) => p.messageMode === filter)).slice(0, 4);
  const hiddenUpcomingCount = filter === "ALL" ? 0 : upcomingAll.filter((p) => p.messageMode !== filter).length;

  const recent = filtered.slice(0, 4);

  const avatarFor = (path: string | null) => (path ? avatarUrlByPath[path] ?? null : null);

  const FilterTab = ({ id, label, count }: { id: Filter; label: string; count: number }) => {
    const active = filter === id;
    const dotColor = id === "SELF" ? "var(--accent-deep)" : id === "LEGACY" ? "var(--sky)" : null;
    return (
      <button
        type="button"
        onClick={() => setFilter(id)}
        style={{
          display: "inline-flex", alignItems: "center", gap: 7,
          padding: "7px 16px", borderRadius: "var(--r-pill)", border: "none",
          background: active ? "var(--ink)" : "transparent",
          color: active ? "var(--bg)" : "var(--muted)",
          fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "var(--f-sans)",
          transition: "all .15s",
        }}
      >
        {dotColor && <span style={{ width: 7, height: 7, borderRadius: "50%", background: dotColor, flexShrink: 0 }} />}
        {label}
        <span className="arca-mono" style={{ fontSize: 11, opacity: active ? 0.55 : 0.7 }}>{count}</span>
      </button>
    );
  };

  return (
    <>
      {/* ── Filter tabs — only shown when there's actually a mix to filter ── */}
      {selfCount > 0 && legacyCount > 0 && (
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 4, marginBottom: 20,
          padding: 4, borderRadius: "var(--r-pill)", background: "var(--surface)", border: "1px solid var(--hairline)",
        }}>
          <FilterTab id="ALL" label="Vše" count={packs.length} />
          <FilterTab id="SELF" label="Sobě" count={selfCount} />
          <FilterTab id="LEGACY" label="Odkazy" count={legacyCount} />
        </div>
      )}

      {/* ── Stats row ───────────────────────────────────────────── */}
      <div className="arca-stats-row" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 36 }}>
        <StatCard label="Ve schránce" value={filtered.length} hint={`pro ${totalRecipients} ${totalRecipients === 1 ? "člověka" : "lidí"}`} />
        <StatCard label="Aktivní" value={activeCount} hint="připraveny k doručení" tone="clay" />
        <StatCard label="Doručené" value={deliveredCount} hint="úspěšně doručeno" tone="sage" />
        {filter === "SELF" ? (
          <StatCard label="Návrhy" value={draftCount} hint={draftCount > 0 ? "čekají na dopsání" : "žádné zatím"} tone="sky" />
        ) : (
          <StatCard label="Strážci" value={guardians.length} hint={guardians.length > 0 ? "aktivní ochrana" : "žádní zatím"} tone="sky" />
        )}
      </div>

      {/* ── Two columns ─────────────────────────────────────────── */}
      <div className="arca-dashboard-2col" style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 22 }}>
        {/* Upcoming */}
        <div>
          <div className="arca-row arca-between" style={{ marginBottom: 14 }}>
            <h3 className="arca-h3">Nejbližší okamžiky</h3>
            <Link href="/dashboard/calendar" className="arca-btn sm arca-btn--ghost">
              Otevřít kalendář
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}><path d="M9 6l6 6-6 6"/></svg>
            </Link>
          </div>

          {upcoming.length === 0 ? (
            <div className="arca-card" style={{ padding: "28px 24px", textAlign: "center" }}>
              <p className="arca-sub" style={{ fontSize: 13 }}>Žádné naplánované zprávy. <Link href="/dashboard/arca/new" style={{ color: "var(--accent)" }}>Vytvoř první →</Link></p>
            </div>
          ) : (
            <div className="arca-stack-3">
              {upcoming.map((pack) => {
                const d = new Date(pack.triggerCondition!.executeAtDate!);
                const dayLabel = d.toLocaleDateString("cs-CZ", { weekday: "short" });
                const dateLabel = d.toLocaleDateString("cs-CZ", { day: "numeric", month: "numeric" });
                const recipient = pack.recipients[0];
                const recipientName = recipient?.name ?? "—";
                return (
                  <Link key={pack.id} href={`/dashboard/arca/${pack.id}/edit`} style={{ textDecoration: "none" }}>
                    <div className="arca-card" style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: 16, cursor: "pointer" }}>
                      <div style={{ width: 54, textAlign: "center", borderRight: "1px solid var(--hairline)", paddingRight: 16 }}>
                        <div className="arca-mono" style={{ fontSize: 11, color: "var(--muted)" }}>{dayLabel}</div>
                        <div style={{ fontFamily: "var(--f-serif)", fontSize: 20, lineHeight: 1.1 }}>{dateLabel}</div>
                      </div>
                      {recipient && (
                        <Avatar
                          src={avatarFor(recipient.avatarUrl)}
                          initials={initialsFor(recipient.name)}
                          tone={toneFor(recipient.name)}
                          size="lg"
                        />
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 550, fontSize: 14 }}>{pack.title}</div>
                        <div className="arca-sub" style={{ fontSize: 12.5 }}>pro {recipientName}</div>
                      </div>
                      <span style={{ color: kindColor(pack.type), fontSize: 16 }}>{kindIcon(pack.type)}</span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} style={{ color: "var(--muted)" }}><path d="M9 6l6 6-6 6"/></svg>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          {hiddenUpcomingCount > 0 && (
            <button
              type="button"
              onClick={() => setFilter("ALL")}
              style={{
                width: "100%", marginTop: 8, padding: "14px 18px", textAlign: "center",
                border: "1px dashed var(--hairline-2)", borderRadius: "var(--r-lg)", background: "transparent",
                color: "var(--muted)", fontSize: 12.5, cursor: "pointer", fontFamily: "var(--f-sans)",
              }}
            >
              {hiddenUpcomingCount}{" "}
              {filter === "SELF"
                ? hiddenUpcomingCount === 1 ? "odkaz pro blízké je skrytý" : hiddenUpcomingCount < 5 ? "odkazy pro blízké jsou skryté" : "odkazů pro blízké je skrytých"
                : hiddenUpcomingCount === 1 ? "zpráva sobě do budoucna je skrytá" : hiddenUpcomingCount < 5 ? "zprávy sobě do budoucna jsou skryté" : "zpráv sobě do budoucna je skrytých"}
              {" "}— přepni na „Vše"
            </button>
          )}
        </div>

        {/* Right column */}
        <div className="arca-stack-4">
          {/* Tichý strážce — doesn't apply to SELF packs, hide rather than show an empty/irrelevant panel */}
          {filter !== "SELF" && (
            <div className="arca-card">
              <div style={{ padding: "20px 22px" }}>
                <div className="arca-row arca-between" style={{ marginBottom: 12 }}>
                  <h3 className="arca-h3">Tichý strážce</h3>
                  <span className="arca-chip sage"><span className="dot" /> Aktivní</span>
                </div>
                <p className="arca-sub" style={{ fontSize: 12.5, marginBottom: 14 }}>
                  ARCA bdí jemně na pozadí. Pokud se po dlouhou dobu neozveš, zeptá se tvých strážců, než cokoli odešle.
                </p>
                <div className="arca-row arca-between" style={{ marginBottom: 8 }}>
                  <span className="arca-mono" style={{ color: "var(--muted)" }}>Naposledy zde</span>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>
                    {daysSinceActive === 0 ? "právě teď" : `před ${daysSinceActive} ${daysSinceActive === 1 ? "dnem" : "dny"}`}
                  </span>
                </div>
                <div className="arca-row arca-between">
                  <span className="arca-mono" style={{ color: "var(--muted)" }}>Strážci</span>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{guardians.length} aktivních</span>
                </div>
                <hr className="arca-divider" />
                <div className="arca-row" style={{ gap: 8 }}>
                  {guardians.slice(0, 3).map((g) => (
                    <span key={g.id} className="arca-avatar sm sage" title={g.name}>
                      {g.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
                    </span>
                  ))}
                  {guardians.length === 0 && (
                    <span className="arca-sub" style={{ fontSize: 12 }}>Žádní strážci</span>
                  )}
                  <Link href="/dashboard/guardians" className="arca-btn sm arca-btn--ghost" style={{ marginLeft: "auto" }}>
                    Spravovat
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Weekly ritual — mode-agnostic, always shown. Fáze 2: reuses this
              same card for "napsat odpověď" when there's a delivered SELF
              message still waiting for one, instead of a new component. */}
          <div className="arca-card flat" style={{ background: "var(--ink)", color: "var(--bg)", border: "none" }}>
            <div style={{ padding: "20px 22px" }}>
              <div className="arca-row arca-between" style={{ marginBottom: 10 }}>
                <span className="arca-kicker" style={{ color: "color-mix(in srgb, var(--bg) 55%, transparent)" }}>Týdenní rituál</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth={1.6}>
                  {unansweredSelfPack
                    ? <path d="M9 17l-5-5 5-5M4 12h11a5 5 0 0 1 5 5v1"/>
                    : <path d="M12 4v4M12 16v4M4 12h4M16 12h4M6.5 6.5l2.8 2.8M14.7 14.7l2.8 2.8M17.5 6.5l-2.8 2.8M9.3 14.7L6.5 17.5"/>}
                </svg>
              </div>
              {unansweredSelfPack ? (
                <>
                  <p style={{ fontFamily: "var(--f-serif)", fontSize: 22, lineHeight: 1.25, margin: "0 0 18px" }}>
                    Tvoje minulé já ti něco <em style={{ color: "var(--accent)" }}>napsalo.</em><br />Chceš mu odpovědět?
                  </p>
                  <Link href={`/dashboard/arca/new?replyTo=${unansweredSelfPack.id}`} className="arca-btn" style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-deep))", color: "#fff", border: "none" }}>
                    Napsat odpověď
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}><path d="M5 12h14M13 6l6 6-6 6"/></svg>
                  </Link>
                  <div style={{ fontSize: 11, color: "color-mix(in srgb, var(--bg) 45%, transparent)", marginTop: 12 }}>
                    „{unansweredSelfPack.title}"
                    {unansweredSelfPack.deliveredAt && ` · doručeno ${new Date(unansweredSelfPack.deliveredAt).toLocaleDateString("cs-CZ")}`}
                  </div>
                </>
              ) : (
                <>
                  <p style={{ fontFamily: "var(--f-serif)", fontSize: 22, lineHeight: 1.2, margin: "0 0 18px" }}>
                    Co bys chtěl, aby si dnes <em style={{ color: "var(--accent)" }}>někdo</em> pamatoval?
                  </p>
                  <Link href="/dashboard/arca/new" className="arca-btn" style={{ background: "color-mix(in srgb, var(--bg) 8%, transparent)", color: "var(--bg)", borderColor: "color-mix(in srgb, var(--bg) 12%, transparent)" }}>
                    Tříminutové psaní
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}><path d="M5 12h14M13 6l6 6-6 6"/></svg>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Recent ──────────────────────────────────────────────── */}
      {recent.length > 0 && (
        <div style={{ marginTop: 44 }}>
          <div className="arca-row arca-between" style={{ marginBottom: 14 }}>
            <h3 className="arca-h3">Naposledy uložené</h3>
            <Link href="/dashboard/vault" className="arca-btn sm arca-btn--ghost">
              Vše ve schránce
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}><path d="M9 6l6 6-6 6"/></svg>
            </Link>
          </div>
          <div className="arca-card">
            {recent.map((pack, i) => {
              const recipient = pack.recipients[0];
              return (
                <div key={pack.id}>
                  {i > 0 && <hr style={{ height: 1, background: "var(--hairline)", border: 0, margin: 0 }} />}
                  <Link href={`/dashboard/arca/${pack.id}/edit`} style={{ textDecoration: "none" }}>
                    <div style={{ padding: "14px 22px", display: "flex", alignItems: "center", gap: 14 }}>
                      {recipient ? (
                        <Avatar
                          src={avatarFor(recipient.avatarUrl)}
                          initials={initialsFor(recipient.name)}
                          tone={toneFor(recipient.name)}
                          size="lg"
                        />
                      ) : (
                        <div style={{ width: 56, height: 56, borderRadius: 14, background: "var(--bg-tint)", display: "grid", placeItems: "center", color: "var(--ink-2)", fontSize: 22, flexShrink: 0 }}>
                          {kindIcon(pack.type)}
                        </div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 500, fontSize: 14 }}>{pack.title}</div>
                        <div className="arca-sub" style={{ fontSize: 12 }}>
                          {pack.recipients.map((r) => r.name).join(", ") || "bez příjemce"} · {new Date(pack.updatedAt).toLocaleDateString("cs-CZ")}
                        </div>
                      </div>
                      <span className={`arca-chip ${pack.type === "EMOTIONAL" ? "clay" : "sky"}`}>
                        {pack.type === "EMOTIONAL" ? "Emocionální" : "Praktická"}
                      </span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} style={{ color: "var(--muted)" }}><path d="M9 6l6 6-6 6"/></svg>
                    </div>
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
