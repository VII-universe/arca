-- CreateEnum
CREATE TYPE "PackType" AS ENUM ('EMOTIONAL', 'PRACTICAL');

-- CreateEnum
CREATE TYPE "PackStatus" AS ENUM ('DRAFT', 'ACTIVE', 'GRACE_PERIOD', 'TRIGGERED', 'DELIVERED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ContentType" AS ENUM ('TEXT', 'VIDEO', 'AUDIO', 'FILE');

-- CreateEnum
CREATE TYPE "TriggerType" AS ENUM ('SPECIFIC_DATE', 'INACTIVITY', 'MANUAL_EMERGENCY');

-- CreateEnum
CREATE TYPE "TriggerStatus" AS ENUM ('PENDING', 'IN_GRACE_PERIOD', 'EXECUTED');

-- CreateEnum
CREATE TYPE "ExecutorStatus" AS ENUM ('PENDING_INVITE', 'ACCEPTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ActivitySource" AS ENUM ('APP_LOGIN', 'MANUAL_CHECK_IN', 'PASSIVE_API_SYNC');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessagePack" (
    "id" TEXT NOT NULL,
    "livingLinkHash" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "PackType" NOT NULL,
    "status" "PackStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ownerId" TEXT NOT NULL,

    CONSTRAINT "MessagePack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessageContent" (
    "id" TEXT NOT NULL,
    "type" "ContentType" NOT NULL,
    "textBody" TEXT,
    "s3FileKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "messagePackId" TEXT NOT NULL,

    CONSTRAINT "MessageContent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Recipient" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "challengeQuestion" TEXT,
    "challengeAnswerHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "messagePackId" TEXT NOT NULL,

    CONSTRAINT "Recipient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TriggerCondition" (
    "id" TEXT NOT NULL,
    "type" "TriggerType" NOT NULL,
    "status" "TriggerStatus" NOT NULL DEFAULT 'PENDING',
    "executeAtDate" TIMESTAMP(3),
    "inactivityDaysLimit" INTEGER,
    "gracePeriodDays" INTEGER NOT NULL DEFAULT 14,
    "triggeredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "messagePackId" TEXT NOT NULL,

    CONSTRAINT "TriggerCondition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Executor" (
    "id" TEXT NOT NULL,
    "status" "ExecutorStatus" NOT NULL DEFAULT 'PENDING_INVITE',
    "inviteEmail" TEXT NOT NULL,
    "invitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),
    "ownerId" TEXT NOT NULL,
    "executorId" TEXT,

    CONSTRAINT "Executor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL,
    "source" "ActivitySource" NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,
    "userId" TEXT NOT NULL,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_lastActiveAt_idx" ON "User"("lastActiveAt");

-- CreateIndex
CREATE UNIQUE INDEX "MessagePack_livingLinkHash_key" ON "MessagePack"("livingLinkHash");

-- CreateIndex
CREATE INDEX "MessagePack_ownerId_idx" ON "MessagePack"("ownerId");

-- CreateIndex
CREATE INDEX "MessagePack_status_idx" ON "MessagePack"("status");

-- CreateIndex
CREATE INDEX "MessageContent_messagePackId_idx" ON "MessageContent"("messagePackId");

-- CreateIndex
CREATE INDEX "Recipient_messagePackId_idx" ON "Recipient"("messagePackId");

-- CreateIndex
CREATE UNIQUE INDEX "TriggerCondition_messagePackId_key" ON "TriggerCondition"("messagePackId");

-- CreateIndex
CREATE INDEX "TriggerCondition_status_executeAtDate_idx" ON "TriggerCondition"("status", "executeAtDate");

-- CreateIndex
CREATE INDEX "TriggerCondition_status_idx" ON "TriggerCondition"("status");

-- CreateIndex
CREATE INDEX "Executor_ownerId_idx" ON "Executor"("ownerId");

-- CreateIndex
CREATE INDEX "Executor_executorId_idx" ON "Executor"("executorId");

-- CreateIndex
CREATE INDEX "ActivityLog_userId_timestamp_idx" ON "ActivityLog"("userId", "timestamp");

-- CreateIndex
CREATE INDEX "ActivityLog_timestamp_idx" ON "ActivityLog"("timestamp");

-- AddForeignKey
ALTER TABLE "MessagePack" ADD CONSTRAINT "MessagePack_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageContent" ADD CONSTRAINT "MessageContent_messagePackId_fkey" FOREIGN KEY ("messagePackId") REFERENCES "MessagePack"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recipient" ADD CONSTRAINT "Recipient_messagePackId_fkey" FOREIGN KEY ("messagePackId") REFERENCES "MessagePack"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TriggerCondition" ADD CONSTRAINT "TriggerCondition_messagePackId_fkey" FOREIGN KEY ("messagePackId") REFERENCES "MessagePack"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Executor" ADD CONSTRAINT "Executor_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Executor" ADD CONSTRAINT "Executor_executorId_fkey" FOREIGN KEY ("executorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
