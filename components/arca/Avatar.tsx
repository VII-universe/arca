// Shared avatar renderer — shows the recipient's uploaded photo when
// available, falling back to the existing gradient + initials look.
// `src` must already be a resolved (signed) URL, not a storage path.

export function Avatar({
  src,
  initials,
  tone,
  size,
  className,
  style,
  title,
}: {
  src?: string | null;
  initials: string;
  tone: string;
  size?: "sm" | "lg" | "xl";
  className?: string;
  style?: React.CSSProperties;
  title?: string;
}) {
  const sizeClass = size ? ` ${size}` : "";
  const classes = `arca-avatar${sizeClass} ${tone}${className ? ` ${className}` : ""}`;

  if (src) {
    return (
      <img
        src={src}
        alt={title ?? ""}
        title={title}
        className={classes}
        style={{ objectFit: "cover", ...style }}
      />
    );
  }

  return (
    <span className={classes} style={style} title={title}>
      {initials}
    </span>
  );
}
