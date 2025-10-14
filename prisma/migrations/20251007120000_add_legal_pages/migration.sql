-- CreateTable
CREATE TABLE "LegalPage" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "slug" TEXT NOT NULL,
  "titleFr" TEXT NOT NULL,
  "titleEn" TEXT NOT NULL,
  "introFr" TEXT,
  "introEn" TEXT,
  "contentFr" TEXT,
  "contentEn" TEXT,
  "cancellationFr" TEXT,
  "cancellationEn" TEXT,
  "paymentFr" TEXT,
  "paymentEn" TEXT,
  "fuelDepositFr" TEXT,
  "fuelDepositEn" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "LegalPage_slug_key" ON "LegalPage"("slug");
