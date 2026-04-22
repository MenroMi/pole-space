-- Add id as nullable first
ALTER TABLE "VerificationToken" ADD COLUMN "id" TEXT;

-- Populate existing rows with unique ids
UPDATE "VerificationToken" SET "id" = gen_random_uuid()::text WHERE "id" IS NULL;

-- Make it NOT NULL and add primary key
ALTER TABLE "VerificationToken" ALTER COLUMN "id" SET NOT NULL;
ALTER TABLE "VerificationToken" ADD CONSTRAINT "VerificationToken_pkey" PRIMARY KEY ("id");
