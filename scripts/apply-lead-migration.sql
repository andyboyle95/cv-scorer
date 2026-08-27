-- Applies the Lead table migration (20260827000000_add_leads) by hand.
--
-- Use this only when you cannot run `npm run db:migrate` — e.g. applying the
-- migration through a GUI client such as TablePlus, Postico or pgAdmin.
-- `npm run db:migrate` remains the normal route.
--
-- Safe to run more than once. As well as creating the table it registers the
-- migration in Prisma's `_prisma_migrations` table, so a later
-- `prisma migrate deploy` reports "No pending migrations" instead of failing
-- with "relation already exists". The checksum below is the SHA-256 of
-- prisma/migrations/20260827000000_add_leads/migration.sql — if that file ever
-- changes, this script is stale and must be regenerated.

CREATE TABLE IF NOT EXISTS "Lead" (
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

CREATE INDEX IF NOT EXISTS "Lead_createdAt_idx" ON "Lead"("createdAt" DESC);
CREATE INDEX IF NOT EXISTS "Lead_email_idx"     ON "Lead"("email");

-- Tell Prisma this migration is already applied, so a future
-- `prisma migrate deploy` skips it instead of failing on "table exists".
INSERT INTO "_prisma_migrations" (
    "id", "checksum", "finished_at", "migration_name",
    "logs", "rolled_back_at", "started_at", "applied_steps_count"
) VALUES (
    'f47b3c10-8a21-4d6e-9b55-2c0e7a91d334',
    '3466da4780414f96812ca466f73d25cec23e53da3aa24a2d0c31aab01c6764be',
    NOW(),
    '20260827000000_add_leads',
    NULL, NULL, NOW(), 1
)
ON CONFLICT ("id") DO NOTHING;
