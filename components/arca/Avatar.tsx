import Image from "next/image";

// Shared avatar renderer — shows the recipient's uploaded photo when
// available, falling back to the existing gradient + initials look.
// `src` must already be a resolved (signed) URL, not a storage path.

// Mirrors .arca-avatar / .arca-avatar.{sm,lg,xl} in globals.css — next/image
// needs explicit pixel dimensions even though the CSS class does the actual
// visual sizing (max-width/max-height are reset to none there for exactly
// this reason, see the comment on .arca-avatar).
const SIZE_PX: Record<"default" | "sm" | "lg" | "xl", number> = {
  default: 40, sm: 30, lg: 56, xl: 88,
};

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
  const px = SIZE_PX[size ?? "default"];

  if (src) {
    return (
      <Image
        src={src}
        alt={title ?? ""}
        title={title}
        width={px}
        height={px}
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
