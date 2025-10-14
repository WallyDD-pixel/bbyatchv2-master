-- CreateTable
CREATE TABLE "UsedBoat" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "slug" TEXT NOT NULL,
    "titleFr" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "summaryFr" TEXT,
    "summaryEn" TEXT,
    "descriptionFr" TEXT,
    "descriptionEn" TEXT,
    "year" INTEGER NOT NULL,
    "lengthM" REAL NOT NULL,
    "engineHours" INTEGER,
    "engines" TEXT,
    "fuelType" TEXT,
    "priceEur" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'listed',
    "mainImage" TEXT,
    "photoUrls" TEXT,
    "videoUrls" TEXT,
    "sort" INTEGER DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "UsedBoat_slug_key" ON "UsedBoat"("slug");

-- CreateIndex
CREATE INDEX "UsedBoat_status_idx" ON "UsedBoat"("status");

-- CreateIndex
CREATE INDEX "UsedBoat_sort_idx" ON "UsedBoat"("sort");
