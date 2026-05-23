"use client";

import { type ReactNode } from "react";
import { Dialog } from "radix-ui";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Optional title shown in the header. Omit when the sheet manages its own header. */
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
  /** "left" slides in from the left edge; "right" (default) from the right edge. */
  side?: "left" | "right";
  /**
   * "arca" — uses ARCA CSS design-system tokens (var(--bg), var(--hairline), etc.)
   *           and enables the slide + fade entrance/exit animations.
   * "default" — original shadcn/ui bg-background styling (no ARCA tokens).
   */
  variant?: "default" | "arca";
}

// ── Sheet ─────────────────────────────────────────────────────────────────────

export function Sheet({
  open, onOpenChange,
  title, description,
  children,
  className,
  side = "right",
  variant = "default",
}: SheetProps) {
  const isLeft  = side === "left";
  const isArca  = variant === "arca";

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>

        {/* ── Backdrop ─────────────────────────────────────────── */}
        <Dialog.Overlay
          className={cn(
            "fixed inset-0 z-40",
            isArca
              ? "arca-sheet-overlay"
              : "bg-black/30 backdrop-blur-sm",
          )}
        />

        {/* ── Panel ────────────────────────────────────────────── */}
        <Dialog.Content
          className={cn(
            // Base
            "fixed top-0 z-50 h-full w-full max-w-[300px]",
            "flex flex-col overflow-hidden focus:outline-none",
            // Side
            isLeft ? "left-0" : "right-0",
            // Border
            isArca
              ? isLeft ? "arca-sheet-drawer-left"  : "arca-sheet-drawer-right"
              : isLeft ? "border-r border-border/40 bg-background shadow-2xl"
                       : "border-l border-border/40 bg-background shadow-2xl",
            className,
          )}
          // ARCA themed content lives outside the .arca-app DOM tree (Radix Portal),
          // so we re-attach the theme attribute here.
          {...(isArca ? { "data-arca-theme": "" } : {})}
        >

          {/* ── Optional header ──────────────────────────────── */}
          {title ? (
            <div className="shrink-0 flex items-start justify-between px-6 pt-6 pb-5 border-b border-border/30">
              <div className="space-y-0.5">
                <Dialog.Title className="text-base font-semibold text-foreground">
                  {title}
                </Dialog.Title>
                {description && (
                  <Dialog.Description className="text-xs text-muted-foreground leading-snug">
                    {description}
                  </Dialog.Description>
                )}
              </div>
              <Dialog.Close className="ml-4 shrink-0 rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors mt-0.5">
                <X className="size-4" />
                <span className="sr-only">Close</span>
              </Dialog.Close>
            </div>
          ) : (
            // Accessibility: visually-hidden title required by Radix Dialog when
            // no visible title is rendered.
            <Dialog.Title style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0,0,0,0)", whiteSpace: "nowrap" }}>
              Menu
            </Dialog.Title>
          )}

          {/* ── Scrollable body ──────────────────────────────── */}
          <div className={cn("flex-1 overflow-y-auto", title && "px-6 py-6")}>
            {children}
          </div>

        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
