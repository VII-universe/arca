-- CreateTable
CREATE TABLE "Contribution" (
    "id" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "messagePackId" TEXT NOT NULL,

    CONSTRAINT "Contribution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContributionInvite" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "usedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "messagePackId" TEXT NOT NULL,

    CONSTRAINT "ContributionInvite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Contribution_messagePackId_idx" ON "Contribution"("messagePackId");

-- CreateIndex
CREATE UNIQUE INDEX "ContributionInvite_token_key" ON "ContributionInvite"("token");

-- CreateIndex
CREATE INDEX "ContributionInvite_token_idx" ON "ContributionInvite"("token");

-- CreateIndex
CREATE INDEX "ContributionInvite_messagePackId_idx" ON "ContributionInvite"("messagePackId");

-- AddForeignKey
ALTER TABLE "Contribution" ADD CONSTRAINT "Contribution_messagePackId_fkey" FOREIGN KEY ("messagePackId") REFERENCES "MessagePack"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContributionInvite" ADD CONSTRAINT "ContributionInvite_messagePackId_fkey" FOREIGN KEY ("messagePackId") REFERENCES "MessagePack"("id") ON DELETE CASCADE ON UPDATE CASCADE;
