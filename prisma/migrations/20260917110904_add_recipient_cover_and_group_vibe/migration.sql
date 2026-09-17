-- AlterTable
ALTER TABLE "ContactGroup" ADD COLUMN "vibeImageUrl" TEXT;

-- AlterTable
ALTER TABLE "Recipient" ADD COLUMN "coverUrl" TEXT,
ADD COLUMN "coverPositionY" INTEGER DEFAULT 50;
