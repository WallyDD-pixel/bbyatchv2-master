-- CreateTable
CREATE TABLE "BoatOption" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "boatId" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "price" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BoatOption_boatId_fkey" FOREIGN KEY ("boatId") REFERENCES "Boat" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "BoatOption_boatId_idx" ON "BoatOption"("boatId");
