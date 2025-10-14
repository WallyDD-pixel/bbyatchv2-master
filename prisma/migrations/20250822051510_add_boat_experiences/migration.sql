-- CreateTable
CREATE TABLE "BoatExperience" (
    "boatId" INTEGER NOT NULL,
    "experienceId" INTEGER NOT NULL,
    "price" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,

    PRIMARY KEY ("boatId", "experienceId"),
    CONSTRAINT "BoatExperience_boatId_fkey" FOREIGN KEY ("boatId") REFERENCES "Boat" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BoatExperience_experienceId_fkey" FOREIGN KEY ("experienceId") REFERENCES "Experience" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "BoatExperience_experienceId_idx" ON "BoatExperience"("experienceId");
