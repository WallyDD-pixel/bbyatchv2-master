-- AlterTable
ALTER TABLE "Experience" ADD COLUMN "additionalTextFr" TEXT;
ALTER TABLE "Experience" ADD COLUMN "additionalTextEn" TEXT;
ALTER TABLE "Experience" ADD COLUMN "fixedDepartureTime" TEXT;
ALTER TABLE "Experience" ADD COLUMN "fixedReturnTime" TEXT;
ALTER TABLE "Experience" ADD COLUMN "hasFixedTimes" BOOLEAN DEFAULT false;

