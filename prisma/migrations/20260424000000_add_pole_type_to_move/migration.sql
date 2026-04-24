-- CreateEnum
CREATE TYPE "PoleType" AS ENUM ('STATIC', 'SPIN');

-- AlterTable
ALTER TABLE "Move" ADD COLUMN     "poleType" "PoleType";
