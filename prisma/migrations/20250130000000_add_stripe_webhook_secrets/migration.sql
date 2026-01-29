-- AlterTable
ALTER TABLE "Settings" ADD COLUMN IF NOT EXISTS "stripeTestWebhookSecret" TEXT;
ALTER TABLE "Settings" ADD COLUMN IF NOT EXISTS "stripeLiveWebhookSecret" TEXT;
