-- CreateEnum
CREATE TYPE "TriggerBasis" AS ENUM ('EXACT_DATE', 'AGE_MILESTONE', 'RELATIVE_OFFSET');

-- AlterTable
ALTER TABLE "TriggerCondition" ADD COLUMN     "ageBasisRecipientId" TEXT,
ADD COLUMN     "basis" "TriggerBasis" NOT NULL DEFAULT 'EXACT_DATE',
ADD COLUMN     "relativeMonths" INTEGER,
ADD COLUMN     "relativeYears" INTEGER,
ADD COLUMN     "targetAge" INTEGER;

-- CreateIndex
CREATE INDEX "TriggerCondition_ageBasisRecipientId_idx" ON "TriggerCondition"("ageBasisRecipientId");

-- AddForeignKey
ALTER TABLE "TriggerCondition" ADD CONSTRAINT "TriggerCondition_ageBasisRecipientId_fkey" FOREIGN KEY ("ageBasisRecipientId") REFERENCES "Recipient"("id") ON DELETE SET NULL ON UPDATE CASCADE;
