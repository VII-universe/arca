import type { ComponentPropsWithoutRef, CSSProperties, ElementType } from "react";
import { JOURNEY, type WaypointId } from "../cosmos/journey";

// One stretch of the page = one waypoint of the camera: the section's content
// (the camera holds while it's read), then its leg (the camera flies on to the
// next waypoint). SkyStage measures both from these attributes.

type Props<T extends ElementType> = { waypoint: WaypointId; as?: T } & Omit<ComponentPropsWithoutRef<T>, "as">;

export function Waypoint<T extends ElementType = "section">({ waypoint, as, className, children, ...rest }: Props<T>) {
  const Tag: ElementType = as ?? "section";
  const cfg = JOURNEY.find((s) => s.id === waypoint)!;
  return (
    <Tag data-waypoint={waypoint} className={`l-wp${className ? ` ${className}` : ""}`} {...rest}>
      {children}
      {cfg.leg > 0 && (
        <div className="l-leg" data-leg aria-hidden="true" style={{ "--leg": cfg.leg, "--leg-phone": cfg.legPhone } as CSSProperties} />
      )}
    </Tag>
  );
}
