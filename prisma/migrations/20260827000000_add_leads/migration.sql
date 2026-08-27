-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'job-spec-creator',
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "companyUrl" TEXT,
    "jobTitle" TEXT,
    "industry" TEXT,
    "jobFunction" TEXT,
    "seniority" TEXT,
    "answers" JSONB NOT NULL,
    "spec" JSONB,
    "notifyStatus" TEXT NOT NULL DEFAULT 'pending',
    "notifyError" TEXT,
    "copyStatus" TEXT NOT NULL DEFAULT 'pending',
    "copyError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Lead_createdAt_idx" ON "Lead"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "Lead_email_idx" ON "Lead"("email");
