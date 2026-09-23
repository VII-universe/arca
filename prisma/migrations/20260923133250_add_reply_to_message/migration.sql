-- AlterTable
ALTER TABLE "MessagePack" ADD COLUMN     "replyToMessageId" TEXT;

-- CreateIndex
CREATE INDEX "MessagePack_replyToMessageId_idx" ON "MessagePack"("replyToMessageId");

-- AddForeignKey
ALTER TABLE "MessagePack" ADD CONSTRAINT "MessagePack_replyToMessageId_fkey" FOREIGN KEY ("replyToMessageId") REFERENCES "MessagePack"("id") ON DELETE SET NULL ON UPDATE CASCADE;
