-- AlterTable
ALTER TABLE "Settings" ADD COLUMN "footerLinkedIn" TEXT;
ALTER TABLE "Settings" ADD COLUMN "footerYouTube" TEXT;
ALTER TABLE "Settings" ADD COLUMN "footerTikTok" TEXT;

-- DropColumn (on garde les données existantes dans footerX pour référence, mais on ne l'utilise plus)
-- ALTER TABLE "Settings" DROP COLUMN "footerX";

