-- AlterTable: drop steps column and add stepsData JSONB column
ALTER TABLE "Move" DROP COLUMN "steps";
ALTER TABLE "Move" ADD COLUMN "stepsData" JSONB NOT NULL DEFAULT '[]';
