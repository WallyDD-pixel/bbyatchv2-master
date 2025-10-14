/*
  Warnings:

  - You are about to drop the column `city` on the `Boat` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "City" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Boat" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cityId" INTEGER,
    "capacity" INTEGER NOT NULL,
    "speedKn" INTEGER NOT NULL,
    "fuel" INTEGER,
    "enginePower" INTEGER,
    "pricePerDay" INTEGER NOT NULL,
    "priceAm" INTEGER,
    "pricePm" INTEGER,
    "imageUrl" TEXT,
    "videoUrls" TEXT,
    "photoUrls" TEXT,
    "available" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Boat_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Boat" ("available", "capacity", "createdAt", "enginePower", "fuel", "id", "imageUrl", "name", "photoUrls", "priceAm", "pricePerDay", "pricePm", "slug", "speedKn", "updatedAt", "videoUrls") SELECT "available", "capacity", "createdAt", "enginePower", "fuel", "id", "imageUrl", "name", "photoUrls", "priceAm", "pricePerDay", "pricePm", "slug", "speedKn", "updatedAt", "videoUrls" FROM "Boat";
DROP TABLE "Boat";
ALTER TABLE "new_Boat" RENAME TO "Boat";
CREATE UNIQUE INDEX "Boat_slug_key" ON "Boat"("slug");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "City_name_key" ON "City"("name");
