-- Add new columns
ALTER TABLE "User" ADD COLUMN "firstName" TEXT;
ALTER TABLE "User" ADD COLUMN "lastName" TEXT;
ALTER TABLE "User" ADD COLUMN "username" TEXT;

-- Preserve existing display names: copy name → firstName
UPDATE "User" SET "firstName" = "name" WHERE "name" IS NOT NULL;

-- Drop old column
ALTER TABLE "User" DROP COLUMN "name";

-- Add unique constraint on username
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
