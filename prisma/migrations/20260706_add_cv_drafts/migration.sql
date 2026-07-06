-- CreateTable
CREATE TABLE "CvDraft" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "candidateName" TEXT,
    "roleAppliedFor" TEXT,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CvDraft_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CvDraft_userId_updatedAt_idx" ON "CvDraft"("userId", "updatedAt" DESC);

-- AddForeignKey
ALTER TABLE "CvDraft" ADD CONSTRAINT "CvDraft_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
