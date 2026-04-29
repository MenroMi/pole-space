-- AlterTable: rename poleType (single nullable enum) to poleTypes (array), backfill existing data
ALTER TABLE "Move" ADD COLUMN     "poleTypes" "PoleType"[] NOT NULL DEFAULT '{}';
UPDATE "Move" SET "poleTypes" = ARRAY["poleType"::"PoleType"] WHERE "poleType" IS NOT NULL;
ALTER TABLE "Move" DROP COLUMN "poleType";
