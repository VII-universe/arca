export function Skeleton({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return <div className={`arca-skeleton${className ? ` ${className}` : ""}`} style={style} />;
}

// Generic page shell: a header line plus a grid of card-shaped blocks.
// Deliberately approximate rather than pixel-matched to each page — its job
// is to avoid a blank screen / layout jump during data fetch, not to mirror
// the loaded content exactly.
export function PageSkeleton({ cards = 6 }: { cards?: number }) {
  return (
    <div className="mx-auto max-w-[1100px] px-6 py-10">
      <Skeleton style={{ width: 180, height: 28, marginBottom: 8 }} />
      <Skeleton style={{ width: 280, height: 16, marginBottom: 32 }} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16 }}>
        {Array.from({ length: cards }).map((_, i) => (
          <Skeleton key={i} style={{ height: 140 }} />
        ))}
      </div>
    </div>
  );
}

// Generic form shell: a header line plus stacked field-shaped rows.
export function FormSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="mx-auto max-w-[680px] px-6 py-10">
      <Skeleton style={{ width: 180, height: 28, marginBottom: 32 }} />
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i}>
            <Skeleton style={{ width: 100, height: 12, marginBottom: 8 }} />
            <Skeleton style={{ height: 44 }} />
          </div>
        ))}
      </div>
    </div>
  );
}
