-- AlterTable
ALTER TABLE "Settings" ADD COLUMN "stripeLivePk" TEXT;
ALTER TABLE "Settings" ADD COLUMN "stripeLiveSk" TEXT;
ALTER TABLE "Settings" ADD COLUMN "stripeMode" TEXT DEFAULT 'test';
ALTER TABLE "Settings" ADD COLUMN "stripeTestPk" TEXT;
ALTER TABLE "Settings" ADD COLUMN "stripeTestSk" TEXT;
ALTER TABLE "Settings" ADD COLUMN "updatedAt" DATETIME;
