-- AlterTable
ALTER TABLE "ExperienceAvailabilitySlot" ADD COLUMN IF NOT EXISTS "showInUpcoming" BOOLEAN NOT NULL DEFAULT true;
