import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";

export const metadata = { title: "Schránka — ARCA" };

const ChevronRight = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 6l6 6-6 6"/>
  </svg>
);
const IcPlus = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 5v14M5 12h14"/>
  </svg>
);
const IcUsers = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="9" cy="9" r="3.5"/><path d="M3 19c0-3 2.7-5 6-5s6 2 6 5"/><circle cx="17" cy="8" r="2.5"/><path d="M15 14.5c2.7 0 6 1.4 6 4.5"/>
  </svg>
);
const IcSparkle = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 4v4M12 16v4M4 12h4M16 12h4M6.5 6.5l2.8 2.8M14.7 14.7l2.8 2.8M17.5 6.5l-2.8 2.8M9.3 14.7L6.5 17.5"/>
  </svg>
);

const TONES = ["clay", "sage", "sky", "ink", "clay", "sage", "sky"];
function toneFor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return TONES[Math.abs(h) % TONES.length];
}
function initials(name: string): string {
  return name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");
}

function Topbar() {
  return (
    <div className="arca-topbar">
      <div className="arca-topbar__crumbs">
        <span style={{ fontFamily: "var(--f-serif)", fontStyle: "italic", color: "var(--accent)" }}>arca</span>
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}><path d="M9 6l6 6-6 6"/></svg>
          <span className="here">Schránka</span>
        </span>
      </div>
    </div>
  );
}

export default async function VaultPage() {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) redirect("/login");

  // Get all recipients grouped by unique person
  const allRecipients = await prisma.recipient.findMany({
    where: { messagePack: { ownerId: authUser.id } },
    select: {
      id: true, name: true, email: true, phone: true,
      messagePack: { select: { id: true, type: true, status: true, triggerCondition: { select: { executeAtDate: true } } } },
    },
    orderBy: { createdAt: "asc" },
  });

  // Deduplicate by email/name — build person cards
  const personMap = new Map<string, {
    id: string; name: string; email: string | null;
    packs: { id: string; type: string; status: string; executeAtDate: Date | null }[];
  }>();

  for (const r of allRecipients) {
    const key = r.email ?? r.name;
    if (!personMap.has(key)) {
      personMap.set(key, { id: r.id, name: r.name, email: r.email, packs: [] });
    }
    const person = personMap.get(key)!;
    if (!person.packs.find((p) => p.id === r.messagePack.id)) {
      person.packs.push({
        id: r.messagePack.id,
        type: r.messagePack.type,
        status: r.messagePack.status,
        executeAtDate: r.messagePack.triggerCondition?.executeAtDate ?? null,
      });
    }
  }

  const people = Array.from(personMap.values()).sort((a, b) => a.name.localeCompare(b.name, "cs"));

  // Categories as "groups"
  const categories = await prisma.category.findMany({
    where: { userId: authUser.id },
    include: { messagePacks: { select: { id: true } } },
    orderBy: { createdAt: "asc" },
  });

  return (
    <>
      <Topbar />
      <div className="arca-inner arca-fade-in" style={{ color: "var(--ink)" }}>
        <div className="arca-row arca-between" style={{ marginBottom: 8 }}>
          <div>
            <div className="arca-kicker">Schránka</div>
            <h1 className="arca-h1" style={{ marginTop: 8 }}>Komu zanecháváš <em>stopu.</em></h1>
          </div>
          <div className="arca-row" style={{ gap: 8 }}>
            <Link href="/dashboard/arca/new" className="arca-btn arca-btn--primary"><IcPlus /> Nová zpráva</Link>
          </div>
        </div>

        <p className="arca-sub" style={{ maxWidth: 540, marginBottom: 24 }}>
          Každý člověk má vlastní schránku. Otevři kohokoli a uvidíš zprávy, fotky a videa, které ho jednou najdou.
        </p>

        {/* People grid */}
        <h3 className="arca-h3" style={{ marginBottom: 14 }}>Lidé · {people.length}</h3>
        {people.length === 0 ? (
          <div className="arca-card" style={{ padding: "40px 32px", textAlign: "center", marginBottom: 28 }}>
            <p className="arca-sub">Zatím žádní příjemci. Přidej je přes editor zprávy.</p>
            <Link href="/dashboard/arca/new" className="arca-btn arca-btn--primary" style={{ marginTop: 16, display: "inline-flex" }}>
              <IcPlus /> Nová zpráva
            </Link>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12, marginBottom: 36 }}>
            {people.map((p) => {
              const tone = toneFor(p.name);
              const init = initials(p.name);
              const activePacks = p.packs.filter((pk) => pk.status === "ACTIVE").length;
              const nextDate = p.packs
                .filter((pk) => pk.executeAtDate)
                .sort((a, b) => a.executeAtDate!.getTime() - b.executeAtDate!.getTime())[0]?.executeAtDate;

              return (
                <Link key={p.id} href={`/dashboard/vault/${p.id}`} style={{ textDecoration: "none" }}>
                  <div className="arca-recip" style={{ color: "var(--ink)" }}>
                    <span className={`arca-avatar lg ${tone}`}>{init}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 550, fontSize: 14.5, color: "var(--ink)" }}>{p.name}</div>
                      <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                        {p.email ?? "Bez e-mailu"}
                        {nextDate && ` · nejbližší ${nextDate.toLocaleDateString("cs-CZ", { day: "numeric", month: "short" })}`}
                      </div>
                      <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                        <span className="arca-tag">{p.packs.length} {p.packs.length === 1 ? "zpráva" : p.packs.length < 5 ? "zprávy" : "zpráv"}</span>
                        {activePacks > 0 && <span className="arca-tag clay">{activePacks} aktivní</span>}
                      </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
                      <span style={{ fontFamily: "var(--f-serif)", fontSize: 24, color: "var(--ink)", lineHeight: 1 }}>{p.packs.length}</span>
                      <span style={{ fontFamily: "var(--f-mono)", fontSize: 11, color: "var(--muted)" }}>zpráv</span>
                    </div>
                    <ChevronRight />
                  </div>
                </Link>
              );
            })}

            <Link href="/dashboard/arca/new" style={{ textDecoration: "none" }}>
              <div className="arca-recip" style={{ borderStyle: "dashed", justifyContent: "center", background: "transparent", color: "var(--muted)", gap: 8 }}>
                <IcPlus /> Přidat dalšího člověka
              </div>
            </Link>
          </div>
        )}

        {/* Categories as groups */}
        {categories.length > 0 && (
          <>
            <h3 className="arca-h3" style={{ marginBottom: 14 }}>Kategorie · {categories.length}</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 36 }}>
              {categories.map((cat) => (
                <div key={cat.id} className="arca-card" style={{ padding: 22, cursor: "pointer" }}>
                  <div className="arca-row arca-between" style={{ marginBottom: 14 }}>
                    <span className={`arca-chip ${cat.color ?? "ink"}`} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <IcUsers /> {cat.messagePacks.length}
                    </span>
                    <span className="arca-mono" style={{ color: "var(--muted)" }}>{cat.messagePacks.length} zpráv</span>
                  </div>
                  <h3 style={{ fontFamily: "var(--f-serif)", fontSize: 22, margin: "0 0 6px", fontWeight: 400 }}>{cat.name}</h3>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Tip */}
        <div className="arca-card flat" style={{ background: "var(--bg-tint)", border: "none", marginTop: 8, padding: "20px 24px", display: "flex", alignItems: "center", gap: 16 }}>
          <IcSparkle />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 550, fontSize: 14 }}>Tip pro psaní</div>
            <p className="arca-sub" style={{ fontSize: 12.5, margin: "2px 0 0" }}>
              Nemusíš psát nic velkého. Často stačí jedna věta a vůně okamžiku.
            </p>
          </div>
          <Link href="/dashboard/arca/new" className="arca-btn sm arca-btn--outline">Začít psát</Link>
        </div>
      </div>
    </>
  );
}
