/*
  Warnings:

  - You are about to drop the column `depositPercent` on the `Settings` table. All the data in the column will be lost.
  - You are about to drop the column `stripeLivePk` on the `Settings` table. All the data in the column will be lost.
  - You are about to drop the column `stripeLiveSk` on the `Settings` table. All the data in the column will be lost.
  - You are about to drop the column `stripeTestPk` on the `Settings` table. All the data in the column will be lost.
  - You are about to drop the column `stripeTestSk` on the `Settings` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Settings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "experiencesHeadlineFr" TEXT,
    "experiencesHeadlineEn" TEXT,
    "experiencesTitleFr" TEXT,
    "experiencesTitleEn" TEXT,
    "stripeMode" TEXT,
    "mainSliderTitle" TEXT,
    "mainSliderSubtitle" TEXT,
    "mainSliderText" TEXT,
    "aboutUsText" TEXT,
    "bbServiceText" TEXT,
    "whyChooseTitle" TEXT,
    "whyChooseList" TEXT,
    "platformCommissionPct" INTEGER DEFAULT 0,
    "currency" TEXT DEFAULT 'eur',
    "updatedAt" DATETIME,
    "whyChooseExpertise" TEXT,
    "whyChooseService" TEXT,
    "aboutUsTitle" TEXT
);
INSERT INTO "new_Settings" ("aboutUsText", "aboutUsTitle", "bbServiceText", "currency", "experiencesHeadlineEn", "experiencesHeadlineFr", "experiencesTitleEn", "experiencesTitleFr", "id", "mainSliderSubtitle", "mainSliderTitle", "platformCommissionPct", "stripeMode", "updatedAt", "whyChooseExpertise", "whyChooseList", "whyChooseService", "whyChooseTitle") SELECT "aboutUsText", "aboutUsTitle", "bbServiceText", "currency", "experiencesHeadlineEn", "experiencesHeadlineFr", "experiencesTitleEn", "experiencesTitleFr", "id", "mainSliderSubtitle", "mainSliderTitle", "platformCommissionPct", "stripeMode", "updatedAt", "whyChooseExpertise", "whyChooseList", "whyChooseService", "whyChooseTitle" FROM "Settings";
DROP TABLE "Settings";
ALTER TABLE "new_Settings" RENAME TO "Settings";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
