-- CreateTable
CREATE TABLE "ExperienceAvailabilitySlot" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "experienceId" INTEGER NOT NULL,
    "date" DATETIME NOT NULL,
    "part" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'available',
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ExperienceAvailabilitySlot_experienceId_fkey" FOREIGN KEY ("experienceId") REFERENCES "Experience" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ExperienceAvailabilitySlot_date_idx" ON "ExperienceAvailabilitySlot"("date");

-- CreateIndex
CREATE UNIQUE INDEX "ExperienceAvailabilitySlot_experienceId_date_part_key" ON "ExperienceAvailabilitySlot"("experienceId", "date", "part");
