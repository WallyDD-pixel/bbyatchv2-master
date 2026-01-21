-- AlterTable
-- Ajouter la colonne boatId optionnelle à ExperienceAvailabilitySlot
ALTER TABLE "ExperienceAvailabilitySlot" ADD COLUMN IF NOT EXISTS "boatId" INTEGER;

-- Ajouter la contrainte de clé étrangère
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ExperienceAvailabilitySlot_boatId_fkey'
  ) THEN
    ALTER TABLE "ExperienceAvailabilitySlot" 
    ADD CONSTRAINT "ExperienceAvailabilitySlot_boatId_fkey" 
    FOREIGN KEY ("boatId") REFERENCES "Boat"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- Supprimer l'ancienne contrainte unique si elle existe
DROP INDEX IF EXISTS "ExperienceAvailabilitySlot_experienceId_date_part_key";

-- Créer la nouvelle contrainte unique qui inclut boatId
-- Pour PostgreSQL, on utilise une expression unique avec COALESCE pour gérer NULL
CREATE UNIQUE INDEX IF NOT EXISTS "ExperienceAvailabilitySlot_experienceId_boatId_date_part_key" 
ON "ExperienceAvailabilitySlot"("experienceId", COALESCE("boatId", -1), "date", "part");

-- Ajouter un index sur boatId pour améliorer les performances
CREATE INDEX IF NOT EXISTS "ExperienceAvailabilitySlot_boatId_idx" ON "ExperienceAvailabilitySlot"("boatId");
