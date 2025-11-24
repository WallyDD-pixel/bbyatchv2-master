-- AlterTable
ALTER TABLE "Boat" ADD COLUMN "lengthM" REAL;
ALTER TABLE "Boat" ADD COLUMN "avantagesFr" TEXT;
ALTER TABLE "Boat" ADD COLUMN "avantagesEn" TEXT;
ALTER TABLE "Boat" ADD COLUMN "optionsInclusesFr" TEXT;
ALTER TABLE "Boat" ADD COLUMN "optionsInclusesEn" TEXT;
ALTER TABLE "Boat" ADD COLUMN "skipperRequired" BOOLEAN DEFAULT false;
ALTER TABLE "Boat" ADD COLUMN "skipperPrice" INTEGER;

