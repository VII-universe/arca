import { notFound } from "next/navigation";
import { getSanctuaryContent } from "@/app/actions/sanctuary";
import SanctuaryClient from "./SanctuaryClient";
import SanctiaryChallengeGate from "./SanctiaryChallengeGate";

export const dynamic = "force-dynamic";
export const metadata = { robots: "noindex, nofollow" };

// ── Sealed screen ─────────────────────────────────────────────────────────────

function SanctuarySealed({ status }: { status: string }) {
  const label =
    status === "DRAFT"     ? "Zpráva ještě nebyla odeslána." :
    status === "ARCHIVED"  ? "Tato zpráva byla archivována." :
    status === "DELIVERED" ? "Zpráva byla doručena." :
    "Zpráva ještě nebyla aktivována.";

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: 32,
      textAlign: "center",
      animation: "sancFadeIn 1.8s ease both",
      gap: 20,
    }}>
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.25 }}>
        <path d="M5 18c0-7 3-12 7-12s7 5 7 12" stroke="#f5f0df" strokeWidth="1.5" strokeLinecap="round"/>
        <circle cx="12" cy="19" r="1.5" fill="#c9a96e"/>
      </svg>
      <p style={{
        fontFamily: "var(--font-playfair), Georgia, serif",
        fontStyle: "italic",
        fontSize: 22,
        color: "#f5f0df",
        margin: 0,
        opacity: 0.5,
      }}>
        {label}
      </p>
      <p style={{
        fontSize: 12,
        color: "#a1a1aa",
        fontFamily: "var(--font-inter), sans-serif",
        letterSpacing: "0.05em",
        margin: 0,
        opacity: 0.5,
      }}>
        Tento odkaz není zatím aktivní.
      </p>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function SanctuaryPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const result = await getSanctuaryContent(token);

  if (result.status === "not_found") notFound();
  if (result.status === "sealed") return <SanctuarySealed status={result.packStatus} />;
  if (result.status === "challenge") {
    return (
      <SanctiaryChallengeGate
        packId={result.packId}
        token={token}
        question={result.question}
      />
    );
  }

  return (
    <SanctuaryClient
      ownerName={result.ownerName}
      packType={result.packType}
      createdAt={result.createdAt}
      contents={result.contents}
      memories={result.memories}
      blueprintItems={result.blueprintItems}
    />
  );
}
