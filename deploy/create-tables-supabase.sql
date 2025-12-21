-- Script SQL pour créer toutes les tables dans Supabase
-- À exécuter dans l'éditeur SQL de Supabase

-- 1. Table Settings (doit être créée en premier car référencée)
CREATE TABLE IF NOT EXISTS "Settings" (
    "id" INTEGER PRIMARY KEY DEFAULT 1,
    "stripeTestPk" TEXT,
    "stripeTestSk" TEXT,
    "stripeLivePk" TEXT,
    "stripeLiveSk" TEXT,
    "experiencesHeadlineFr" TEXT,
    "experiencesHeadlineEn" TEXT,
    "experiencesTitleFr" TEXT,
    "experiencesTitleEn" TEXT,
    "stripeMode" TEXT,
    "mainSliderTitle" TEXT,
    "mainSliderSubtitle" TEXT,
    "mainSliderText" TEXT,
    "mainSliderImageUrl" TEXT,
    "mainSliderImageUrls" TEXT,
    "aboutUsText" TEXT,
    "bbServiceText" TEXT,
    "whyChooseTitle" TEXT,
    "whyChooseList" TEXT,
    "platformCommissionPct" INTEGER DEFAULT 0,
    "currency" TEXT DEFAULT 'eur',
    "updatedAt" TIMESTAMP,
    "whyChooseExpertise" TEXT,
    "whyChooseService" TEXT,
    "aboutUsTitle" TEXT,
    "aboutUsSubtitle" TEXT,
    "whyChooseImageUrl" TEXT,
    "footerInstagram" TEXT,
    "footerFacebook" TEXT,
    "footerLinkedIn" TEXT,
    "footerYouTube" TEXT,
    "footerTikTok" TEXT,
    "waterToysUrl" TEXT,
    "legalBaseSlug" TEXT,
    "legalTermsSlug" TEXT,
    "legalPrivacySlug" TEXT,
    "aboutHistoryFr" TEXT,
    "aboutHistoryEn" TEXT,
    "aboutMissionFr" TEXT,
    "aboutMissionEn" TEXT,
    "aboutValuesFr" TEXT,
    "aboutValuesEn" TEXT,
    "aboutTeamFr" TEXT,
    "aboutTeamEn" TEXT,
    "aboutGalleryImageUrls" TEXT,
    "logoUrl" TEXT,
    "aboutValuesSafetyFr" TEXT,
    "aboutValuesSafetyEn" TEXT,
    "aboutValuesComfortFr" TEXT,
    "aboutValuesComfortEn" TEXT,
    "aboutValuesAuthFr" TEXT,
    "aboutValuesAuthEn" TEXT,
    "aboutValuesPleasureFr" TEXT,
    "aboutValuesPleasureEn" TEXT,
    "aboutImageUrls" TEXT,
    "usedSaleTitleFr" TEXT,
    "usedSaleTitleEn" TEXT,
    "usedSaleTextFr" TEXT,
    "usedSaleTextEn" TEXT,
    "defaultSkipperPrice" INTEGER DEFAULT 350
);

-- Insérer l'enregistrement Settings par défaut
INSERT INTO "Settings" ("id") VALUES (1) ON CONFLICT ("id") DO NOTHING;

-- 2. Table City
CREATE TABLE IF NOT EXISTS "City" (
    "id" SERIAL PRIMARY KEY,
    "name" TEXT UNIQUE NOT NULL
);

-- 3. Table User (pour NextAuth)
CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "name" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT UNIQUE NOT NULL,
    "emailVerified" TIMESTAMP,
    "image" TEXT,
    "password" TEXT,
    "role" TEXT NOT NULL DEFAULT 'user',
    "phone" TEXT,
    "address" TEXT,
    "city" TEXT,
    "zip" TEXT,
    "country" TEXT,
    "createdAt" TIMESTAMP DEFAULT now(),
    "updatedAt" TIMESTAMP DEFAULT now()
);

-- 4. Table Account (NextAuth)
CREATE TABLE IF NOT EXISTS "Account" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- 5. Table Session (NextAuth)
CREATE TABLE IF NOT EXISTS "Session" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "sessionToken" TEXT UNIQUE NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP NOT NULL,
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);

-- 6. Table VerificationToken (NextAuth)
CREATE TABLE IF NOT EXISTS "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT UNIQUE NOT NULL,
    "expires" TIMESTAMP NOT NULL,
    PRIMARY KEY ("identifier", "token")
);

-- 7. Table Experience
CREATE TABLE IF NOT EXISTS "Experience" (
    "id" SERIAL PRIMARY KEY,
    "slug" TEXT UNIQUE NOT NULL,
    "titleFr" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "descFr" TEXT NOT NULL,
    "descEn" TEXT NOT NULL,
    "timeFr" TEXT,
    "timeEn" TEXT,
    "imageUrl" TEXT,
    "photoUrls" TEXT,
    "fixedDepartureTime" TEXT,
    "fixedReturnTime" TEXT,
    "hasFixedTimes" BOOLEAN DEFAULT false,
    "createdAt" TIMESTAMP DEFAULT now(),
    "updatedAt" TIMESTAMP DEFAULT now()
);

-- 8. Table Boat
CREATE TABLE IF NOT EXISTS "Boat" (
    "id" SERIAL PRIMARY KEY,
    "slug" TEXT UNIQUE NOT NULL,
    "name" TEXT NOT NULL,
    "cityId" INTEGER,
    "capacity" INTEGER NOT NULL,
    "speedKn" INTEGER NOT NULL,
    "fuel" INTEGER,
    "enginePower" INTEGER,
    "lengthM" REAL,
    "pricePerDay" INTEGER NOT NULL,
    "priceAm" INTEGER,
    "pricePm" INTEGER,
    "priceSunset" INTEGER,
    "priceAgencyPerDay" INTEGER,
    "priceAgencyAm" INTEGER,
    "priceAgencyPm" INTEGER,
    "priceAgencySunset" INTEGER,
    "imageUrl" TEXT,
    "videoUrls" TEXT,
    "photoUrls" TEXT,
    "available" BOOLEAN DEFAULT true,
    "avantagesFr" TEXT,
    "avantagesEn" TEXT,
    "optionsInclusesFr" TEXT,
    "optionsInclusesEn" TEXT,
    "skipperRequired" BOOLEAN DEFAULT false,
    "skipperPrice" INTEGER,
    "createdAt" TIMESTAMP DEFAULT now(),
    "updatedAt" TIMESTAMP DEFAULT now(),
    FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE SET NULL
);

-- 9. Table Reservation
CREATE TABLE IF NOT EXISTS "Reservation" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "reference" TEXT UNIQUE,
    "userId" TEXT NOT NULL,
    "boatId" INTEGER,
    "startDate" TIMESTAMP NOT NULL,
    "endDate" TIMESTAMP NOT NULL,
    "part" TEXT,
    "passengers" INTEGER,
    "status" TEXT DEFAULT 'pending',
    "totalPrice" INTEGER,
    "lockedPrice" BOOLEAN DEFAULT true,
    "depositPercent" INTEGER,
    "depositAmount" INTEGER,
    "remainingAmount" INTEGER,
    "commissionAmount" INTEGER,
    "commissionRate" INTEGER,
    "refundAmount" INTEGER,
    "finalFuelAmount" INTEGER,
    "currency" TEXT DEFAULT 'eur',
    "stripeSessionId" TEXT,
    "stripePaymentIntentId" TEXT,
    "stripeCustomerId" TEXT,
    "stripeInvoiceId" TEXT,
    "stripeRefundId" TEXT,
    "depositPaidAt" TIMESTAMP,
    "completedAt" TIMESTAMP,
    "canceledAt" TIMESTAMP,
    "cancellationReason" TEXT,
    "notesInternal" TEXT,
    "metadata" TEXT,
    "locale" TEXT,
    "createdAt" TIMESTAMP DEFAULT now(),
    "updatedAt" TIMESTAMP DEFAULT now(),
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE,
    FOREIGN KEY ("boatId") REFERENCES "Boat"("id") ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "Reservation_boatId_idx" ON "Reservation"("boatId");
CREATE INDEX IF NOT EXISTS "Reservation_startDate_idx" ON "Reservation"("startDate");
CREATE INDEX IF NOT EXISTS "Reservation_status_idx" ON "Reservation"("status");

-- 10. Table AvailabilitySlot
CREATE TABLE IF NOT EXISTS "AvailabilitySlot" (
    "id" SERIAL PRIMARY KEY,
    "boatId" INTEGER NOT NULL,
    "date" TIMESTAMP NOT NULL,
    "part" TEXT NOT NULL,
    "status" TEXT DEFAULT 'available',
    "note" TEXT,
    "createdAt" TIMESTAMP DEFAULT now(),
    "updatedAt" TIMESTAMP DEFAULT now(),
    FOREIGN KEY ("boatId") REFERENCES "Boat"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "AvailabilitySlot_boatId_date_part_key" ON "AvailabilitySlot"("boatId", "date", "part");
CREATE INDEX IF NOT EXISTS "AvailabilitySlot_date_idx" ON "AvailabilitySlot"("date");

-- 11. Table AgencyRequest
CREATE TABLE IF NOT EXISTS "AgencyRequest" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "userId" TEXT NOT NULL,
    "boatId" INTEGER,
    "reservationId" TEXT,
    "startDate" TIMESTAMP NOT NULL,
    "endDate" TIMESTAMP NOT NULL,
    "part" TEXT,
    "passengers" INTEGER,
    "status" TEXT DEFAULT 'pending',
    "totalPrice" INTEGER,
    "currency" TEXT DEFAULT 'eur',
    "locale" TEXT,
    "notesInternal" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP DEFAULT now(),
    "updatedAt" TIMESTAMP DEFAULT now(),
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE,
    FOREIGN KEY ("boatId") REFERENCES "Boat"("id") ON DELETE SET NULL,
    FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "AgencyRequest_boatId_idx" ON "AgencyRequest"("boatId");
CREATE INDEX IF NOT EXISTS "AgencyRequest_startDate_idx" ON "AgencyRequest"("startDate");
CREATE INDEX IF NOT EXISTS "AgencyRequest_status_idx" ON "AgencyRequest"("status");

-- 12. Table GalleryImage
CREATE TABLE IF NOT EXISTS "GalleryImage" (
    "id" SERIAL PRIMARY KEY,
    "imageUrl" TEXT NOT NULL,
    "titleFr" TEXT,
    "titleEn" TEXT,
    "createdAt" TIMESTAMP DEFAULT now()
);

-- 13. Table InfoCard
CREATE TABLE IF NOT EXISTS "InfoCard" (
    "id" SERIAL PRIMARY KEY,
    "imageUrl" TEXT NOT NULL,
    "titleFr" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "descFr" TEXT,
    "descEn" TEXT,
    "sort" INTEGER DEFAULT 0,
    "createdAt" TIMESTAMP DEFAULT now()
);

-- 14. Table LegalPage
CREATE TABLE IF NOT EXISTS "LegalPage" (
    "id" SERIAL PRIMARY KEY,
    "slug" TEXT UNIQUE NOT NULL,
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
    "createdAt" TIMESTAMP DEFAULT now(),
    "updatedAt" TIMESTAMP DEFAULT now()
);

-- 15. Table NavbarItem
CREATE TABLE IF NOT EXISTS "NavbarItem" (
    "id" SERIAL PRIMARY KEY,
    "labelFr" TEXT NOT NULL,
    "labelEn" TEXT NOT NULL,
    "href" TEXT NOT NULL,
    "icon" TEXT,
    "order" INTEGER DEFAULT 0,
    "visible" BOOLEAN DEFAULT true,
    "target" TEXT DEFAULT '_self',
    "createdAt" TIMESTAMP DEFAULT now(),
    "updatedAt" TIMESTAMP DEFAULT now()
);

-- 16. Table UsedBoat
CREATE TABLE IF NOT EXISTS "UsedBoat" (
    "id" SERIAL PRIMARY KEY,
    "slug" TEXT UNIQUE NOT NULL,
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
    "status" TEXT DEFAULT 'listed',
    "mainImage" TEXT,
    "photoUrls" TEXT,
    "videoUrls" TEXT,
    "sort" INTEGER DEFAULT 0,
    "createdAt" TIMESTAMP DEFAULT now(),
    "updatedAt" TIMESTAMP DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "UsedBoat_status_idx" ON "UsedBoat"("status");
CREATE INDEX IF NOT EXISTS "UsedBoat_sort_idx" ON "UsedBoat"("sort");

-- 17. Table ContactMessage
CREATE TABLE IF NOT EXISTS "ContactMessage" (
    "id" SERIAL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "message" TEXT NOT NULL,
    "usedBoatId" INTEGER,
    "locale" TEXT,
    "sourcePage" TEXT,
    "createdAt" TIMESTAMP DEFAULT now(),
    "readAt" TIMESTAMP,
    FOREIGN KEY ("usedBoatId") REFERENCES "UsedBoat"("id") ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "ContactMessage_createdAt_idx" ON "ContactMessage"("createdAt");
CREATE INDEX IF NOT EXISTS "ContactMessage_usedBoatId_idx" ON "ContactMessage"("usedBoatId");

-- 18. Table BoatOption
CREATE TABLE IF NOT EXISTS "BoatOption" (
    "id" SERIAL PRIMARY KEY,
    "boatId" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "price" INTEGER,
    "createdAt" TIMESTAMP DEFAULT now(),
    FOREIGN KEY ("boatId") REFERENCES "Boat"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "BoatOption_boatId_idx" ON "BoatOption"("boatId");

-- 19. Table BoatExperience
CREATE TABLE IF NOT EXISTS "BoatExperience" (
    "boatId" INTEGER NOT NULL,
    "experienceId" INTEGER NOT NULL,
    "price" INTEGER,
    "createdAt" TIMESTAMP DEFAULT now(),
    "updatedAt" TIMESTAMP DEFAULT now(),
    PRIMARY KEY ("boatId", "experienceId"),
    FOREIGN KEY ("boatId") REFERENCES "Boat"("id") ON DELETE CASCADE,
    FOREIGN KEY ("experienceId") REFERENCES "Experience"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "BoatExperience_experienceId_idx" ON "BoatExperience"("experienceId");

-- 20. Table ExperienceAvailabilitySlot
CREATE TABLE IF NOT EXISTS "ExperienceAvailabilitySlot" (
    "id" SERIAL PRIMARY KEY,
    "experienceId" INTEGER NOT NULL,
    "date" TIMESTAMP NOT NULL,
    "part" TEXT NOT NULL,
    "status" TEXT DEFAULT 'available',
    "note" TEXT,
    "fixedDepartureTime" TEXT,
    "fixedReturnTime" TEXT,
    "createdAt" TIMESTAMP DEFAULT now(),
    "updatedAt" TIMESTAMP DEFAULT now(),
    FOREIGN KEY ("experienceId") REFERENCES "Experience"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "ExperienceAvailabilitySlot_experienceId_date_part_key" ON "ExperienceAvailabilitySlot"("experienceId", "date", "part");
CREATE INDEX IF NOT EXISTS "ExperienceAvailabilitySlot_date_idx" ON "ExperienceAvailabilitySlot"("date");

