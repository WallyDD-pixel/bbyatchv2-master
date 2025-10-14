/*
  Warnings:

  - A unique constraint covering the columns `[reference]` on the table `Reservation` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Reservation" ADD COLUMN "canceledAt" DATETIME;
ALTER TABLE "Reservation" ADD COLUMN "cancellationReason" TEXT;
ALTER TABLE "Reservation" ADD COLUMN "commissionAmount" INTEGER;
ALTER TABLE "Reservation" ADD COLUMN "commissionRate" INTEGER;
ALTER TABLE "Reservation" ADD COLUMN "completedAt" DATETIME;
ALTER TABLE "Reservation" ADD COLUMN "currency" TEXT DEFAULT 'eur';
ALTER TABLE "Reservation" ADD COLUMN "depositAmount" INTEGER;
ALTER TABLE "Reservation" ADD COLUMN "depositPaidAt" DATETIME;
ALTER TABLE "Reservation" ADD COLUMN "depositPercent" INTEGER;
ALTER TABLE "Reservation" ADD COLUMN "locale" TEXT;
ALTER TABLE "Reservation" ADD COLUMN "lockedPrice" BOOLEAN DEFAULT true;
ALTER TABLE "Reservation" ADD COLUMN "metadata" TEXT;
ALTER TABLE "Reservation" ADD COLUMN "notesInternal" TEXT;
ALTER TABLE "Reservation" ADD COLUMN "part" TEXT;
ALTER TABLE "Reservation" ADD COLUMN "passengers" INTEGER;
ALTER TABLE "Reservation" ADD COLUMN "reference" TEXT;
ALTER TABLE "Reservation" ADD COLUMN "refundAmount" INTEGER;
ALTER TABLE "Reservation" ADD COLUMN "remainingAmount" INTEGER;
ALTER TABLE "Reservation" ADD COLUMN "stripeCustomerId" TEXT;
ALTER TABLE "Reservation" ADD COLUMN "stripeInvoiceId" TEXT;
ALTER TABLE "Reservation" ADD COLUMN "stripePaymentIntentId" TEXT;
ALTER TABLE "Reservation" ADD COLUMN "stripeRefundId" TEXT;
ALTER TABLE "Reservation" ADD COLUMN "stripeSessionId" TEXT;

-- AlterTable
ALTER TABLE "Settings" ADD COLUMN "currency" TEXT DEFAULT 'eur';
ALTER TABLE "Settings" ADD COLUMN "depositPercent" INTEGER DEFAULT 20;
ALTER TABLE "Settings" ADD COLUMN "platformCommissionPct" INTEGER DEFAULT 0;

-- CreateIndex
CREATE UNIQUE INDEX "Reservation_reference_key" ON "Reservation"("reference");

-- CreateIndex
CREATE INDEX "Reservation_boatId_idx" ON "Reservation"("boatId");

-- CreateIndex
CREATE INDEX "Reservation_startDate_idx" ON "Reservation"("startDate");

-- CreateIndex
CREATE INDEX "Reservation_status_idx" ON "Reservation"("status");
