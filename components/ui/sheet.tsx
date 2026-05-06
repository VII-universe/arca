"use client";

import { type ReactNode } from "react";
import { Dialog } from "radix-ui";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
}: SheetProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        {/* Backdrop */}
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" />

        {/* Panel slides in from the right */}
        <Dialog.Content
          className={cn(
            "fixed right-0 top-0 z-50 h-full w-full max-w-[420px]",
            "flex flex-col bg-background border-l border-border/40 shadow-2xl",
            "focus:outline-none overflow-hidden",
            className
          )}
        >
          {/* Header */}
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

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto px-6 py-6">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
