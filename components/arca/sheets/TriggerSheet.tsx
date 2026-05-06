"use client";

import { Sheet } from "@/components/ui/sheet";
import TriggerSettings, { type TriggerData } from "@/components/arca/TriggerSettings";

interface Props {
  packId: string;
  packType: "EMOTIONAL" | "PRACTICAL";
  initialTrigger: TriggerData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function TriggerSheet({
  packId,
  packType,
  initialTrigger,
  open,
  onOpenChange,
}: Props) {
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="Delivery Trigger"
      description="Choose when this Arca is released to its recipients."
    >
      <TriggerSettings
        packId={packId}
        packType={packType}
        initialTrigger={initialTrigger}
      />
    </Sheet>
  );
}
