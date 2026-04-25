-- AlterTable
ALTER TABLE "Move" ADD COLUMN     "duration" TEXT,
ADD COLUMN     "entry" TEXT,
ADD COLUMN     "gripType" TEXT,
ADD COLUMN     "steps" TEXT[] DEFAULT ARRAY[]::TEXT[];
