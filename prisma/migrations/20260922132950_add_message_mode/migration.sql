-- CreateEnum
CREATE TYPE "MessageMode" AS ENUM ('SELF', 'LEGACY');

-- AlterTable
ALTER TABLE "MessagePack" ADD COLUMN     "messageMode" "MessageMode" NOT NULL DEFAULT 'LEGACY';
