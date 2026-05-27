import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";
import BlueprintClient from "./BlueprintClient";
import type { BlueprintItem } from "./BlueprintClient";

export const metadata = { title: "Manuál k životu — ARCA" };

function Topbar() {
  return (
    <div className="arca-topbar">
      <div className="arca-topbar__crumbs">
        <span style={{ fontFamily: "var(--f-serif)", fontStyle: "italic", color: "var(--accent)" }}>arca</span>
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}><path d="M9 6l6 6-6 6"/></svg>
          <span className="here">Manuál k životu</span>
        </span>
      </div>
    </div>
  );
}

export default async function BlueprintPage() {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) redirect("/login");

  const items = await prisma.blueprintItem.findMany({
    where: { ownerId: authUser.id },
    orderBy: [{ isCritical: "desc" }, { createdAt: "asc" }],
  });

  return (
    <>
      <Topbar />
      <div className="arca-inner arca-fade-in">

        {/* Hero */}
        <div style={{ marginBottom: 32 }}>
          <div className="arca-kicker">Manuál k životu</div>
          <h1 className="arca-h1" style={{ marginTop: 8 }}>
            Průvodce tvým světem pro ty, kdo to <em>budou potřebovat.</em>
          </h1>
          <p className="arca-sub" style={{ maxWidth: 580, marginTop: 12 }}>
            Ulož sem instrukce, smlouvy, běžící závazky a cokoliv, co by jinak nikdo nevěděl.
            Tvoji blízcí to najdou, až to bude potřeba — přehledně, krok za krokem.
          </p>
        </div>

        {/* Stats chips */}
        {items.length > 0 && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 28 }}>
            <span className="arca-chip">
              {items.length} {items.length === 1 ? "položka" : items.length < 5 ? "položky" : "položek"}
            </span>
            {items.filter(i => i.isCritical).length > 0 && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600, color: "#D35400", background: "rgba(211,84,0,.10)", padding: "3px 10px", borderRadius: 20 }}>
                <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M12 9v4M12 17h.01"/><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg>
                {items.filter(i => i.isCritical).length} urgentní
              </span>
            )}
          </div>
        )}

        <BlueprintClient initialItems={items as BlueprintItem[]} />

        {/* Reassurance footer */}
        <div className="arca-card flat" style={{ background: "var(--ink)", color: "var(--bg)", border: "none", marginTop: 40 }}>
          <div style={{ padding: "20px 24px", display: "flex", alignItems: "center", gap: 18 }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              <path d="M9 12l2 2 4-4"/>
            </svg>
            <div>
              <div style={{ fontFamily: "var(--f-serif)", fontSize: 18, fontWeight: 400 }}>
                Informace vidíš jen ty. <em style={{ color: "var(--accent)" }}>Vždy.</em>
              </div>
              <p style={{ margin: "4px 0 0", color: "rgba(255,255,255,.6)", fontSize: 12.5 }}>
                Strážci ani příjemci nemají k manuálu přístup. Data jsou součástí tvého uzamčeného profilu.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
