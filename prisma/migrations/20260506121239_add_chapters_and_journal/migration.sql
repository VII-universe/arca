-- CreateTable
CREATE TABLE "Chapter" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL DEFAULT '',
    "order" INTEGER NOT NULL DEFAULT 0,
    "unlockDate" TIMESTAMP(3),
    "unlockDelayDays" INTEGER,
    "messagePackId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Chapter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecipientJournal" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "messagePackId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecipientJournal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Chapter_messagePackId_order_idx" ON "Chapter"("messagePackId", "order");

-- CreateIndex
CREATE INDEX "RecipientJournal_messagePackId_idx" ON "RecipientJournal"("messagePackId");

-- AddForeignKey
ALTER TABLE "Chapter" ADD CONSTRAINT "Chapter_messagePackId_fkey" FOREIGN KEY ("messagePackId") REFERENCES "MessagePack"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipientJournal" ADD CONSTRAINT "RecipientJournal_messagePackId_fkey" FOREIGN KEY ("messagePackId") REFERENCES "MessagePack"("id") ON DELETE CASCADE ON UPDATE CASCADE;
