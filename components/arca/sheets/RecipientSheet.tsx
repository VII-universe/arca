"use client";

import { Sheet } from "@/components/ui/sheet";
import RecipientManager, { type RecipientData } from "@/components/arca/RecipientManager";

interface Props {
  packId: string;
  initialRecipients: RecipientData[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function RecipientSheet({
  packId,
  initialRecipients,
  open,
  onOpenChange,
}: Props) {
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="Recipients"
      description="People who will receive this Arca when it is triggered."
    >
      <RecipientManager packId={packId} initialRecipients={initialRecipients} />
    </Sheet>
  );
}
