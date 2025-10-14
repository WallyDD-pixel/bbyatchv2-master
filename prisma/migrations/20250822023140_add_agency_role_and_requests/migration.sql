-- CreateTable
CREATE TABLE "AgencyRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "boatId" INTEGER,
    "reservationId" TEXT,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "part" TEXT,
    "passengers" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "totalPrice" INTEGER,
    "currency" TEXT DEFAULT 'eur',
    "locale" TEXT,
    "notesInternal" TEXT,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AgencyRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AgencyRequest_boatId_fkey" FOREIGN KEY ("boatId") REFERENCES "Boat" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AgencyRequest_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "AgencyRequest_boatId_idx" ON "AgencyRequest"("boatId");

-- CreateIndex
CREATE INDEX "AgencyRequest_startDate_idx" ON "AgencyRequest"("startDate");

-- CreateIndex
CREATE INDEX "AgencyRequest_status_idx" ON "AgencyRequest"("status");
