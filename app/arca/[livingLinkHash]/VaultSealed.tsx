// No interactivity — plain Server Component

const STATE: Record<
  string,
  { headline: string; body: string }
> = {
  DRAFT: {
    headline: "Not yet ready.",
    body: "This message is still being composed. It has not been finalized or released.",
  },
  ACTIVE: {
    headline: "Being kept safe.",
    body: "This Arca is sealed and waiting. The person who created it has ensured it will reach you at exactly the right moment — that moment has not yet come.",
  },
  GRACE_PERIOD: {
    headline: "Almost time.",
    body: "This Arca is preparing itself for delivery. You may receive it very soon.",
  },
  DELIVERED: {
    headline: "Already delivered.",
    body: "This message has been delivered. If you believe you received it in error, please contact the person who sent it to you.",
  },
  ARCHIVED: {
    headline: "No longer available.",
    body: "This Arca has been archived and can no longer be accessed.",
  },
};

const FALLBACK = {
  headline: "Not available.",
  body: "This link may have expired or the Arca may no longer be accessible.",
};

export default function VaultSealed({ status }: { status: string }) {
  const { headline, body } = STATE[status] ?? FALLBACK;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 py-20">
      <div className="max-w-xs w-full text-center space-y-8">
        {/* Seal symbol */}
        <div className="flex justify-center">
          <div className="relative flex h-16 w-16 items-center justify-center">
            <div className="absolute inset-0 rounded-full border border-border" />
            <span className="text-xl text-muted-foreground/30 select-none">◈</span>
          </div>
        </div>

        {/* Message */}
        <div className="space-y-3">
          <h1 className="text-base font-semibold text-muted-foreground">{headline}</h1>
          <p className="text-sm text-muted-foreground/60 leading-[1.8]">{body}</p>
        </div>

        {/* Footer mark */}
        <p className="text-[10px] tracking-widest uppercase text-muted-foreground/20">
          ARCA — A Sealed Vault
        </p>
      </div>
    </div>
  );
}
