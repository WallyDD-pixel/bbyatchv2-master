-- ============================================
-- Schéma PostgreSQL pour Supabase
-- ============================================
-- Exécutez ce fichier dans Supabase > SQL Editor
-- ============================================

-- Table Settings (doit être créée en premier car référencée)
CREATE TABLE IF NOT EXISTS "Settings" (
    "id" SERIAL PRIMARY KEY DEFAULT 1,
    "experiencesHeadlineFr" TEXT,
    "experiencesHeadlineEn" TEXT,
    "experiencesTitleFr" TEXT,
    "experiencesTitleEn" TEXT,
    "stripeMode" TEXT DEFAULT 'test',
    "stripeLivePk" TEXT,
    "stripeLiveSk" TEXT,
    "stripeTestPk" TEXT,
    "stripeTestSk" TEXT,
    "mainSliderTitle" TEXT,
    "mainSliderSubtitle" TEXT,
    "mainSliderText" TEXT,
    "mainSliderImageUrl" TEXT,
    "mainSliderImageUrls" TEXT,
    "aboutUsText" TEXT,
    "aboutUsTitle" TEXT,
    "aboutUsSubtitle" TEXT,
    "bbServiceText" TEXT,
    "whyChooseTitle" TEXT,
    "whyChooseList" TEXT,
    "whyChooseExpertise" TEXT,
    "whyChooseService" TEXT,
    "whyChooseImageUrl" TEXT,
    "platformCommissionPct" INTEGER DEFAULT 0,
    "currency" TEXT DEFAULT 'eur',
    "depositPercent" INTEGER DEFAULT 20,
    "footerFacebook" TEXT,
    "footerInstagram" TEXT,
    "footerLinkedIn" TEXT,
    "footerYouTube" TEXT,
    "footerTikTok" TEXT,
    "footerX" TEXT,
    "legalBaseSlug" TEXT,
    "legalTermsSlug" TEXT,
    "legalPrivacySlug" TEXT,
    "waterToysUrl" TEXT,
    "aboutHistoryEn" TEXT,
    "aboutHistoryFr" TEXT,
    "aboutImageUrls" TEXT,
    "aboutMissionEn" TEXT,
    "aboutMissionFr" TEXT,
    "aboutTeamEn" TEXT,
    "aboutTeamFr" TEXT,
    "aboutValuesAuthEn" TEXT,
    "aboutValuesAuthFr" TEXT,
    "aboutValuesComfortEn" TEXT,
    "aboutValuesComfortFr" TEXT,
    "aboutValuesPleasureEn" TEXT,
    "aboutValuesPleasureFr" TEXT,
    "aboutValuesSafetyEn" TEXT,
    "aboutValuesSafetyFr" TEXT,
    "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- Insérer une ligne par défaut dans Settings
INSERT INTO "Settings" ("id") VALUES (1) ON CONFLICT ("id") DO NOTHING;

-- Table Experience
CREATE TABLE IF NOT EXISTS "Experience" (
    "id" SERIAL PRIMARY KEY,
    "slug" TEXT NOT NULL UNIQUE,
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
    "hasFixedTimes" BOOLEAN DEFAULT FALSE,
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Table City
CREATE TABLE IF NOT EXISTS "City" (
    "id" SERIAL PRIMARY KEY,
    "name" TEXT NOT NULL UNIQUE
);

-- Table Boat
CREATE TABLE IF NOT EXISTS "Boat" (
    "id" SERIAL PRIMARY KEY,
    "slug" TEXT NOT NULL UNIQUE,
    "name" TEXT NOT NULL,
    "cityId" INTEGER REFERENCES "City"("id") ON DELETE SET NULL ON UPDATE CASCADE,
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
    "available" BOOLEAN NOT NULL DEFAULT TRUE,
    "lengthM" REAL,
    "avantagesFr" TEXT,
    "avantagesEn" TEXT,
    "optionsInclusesFr" TEXT,
    "optionsInclusesEn" TEXT,
    "skipperRequired" BOOLEAN DEFAULT FALSE,
    "skipperPrice" INTEGER,
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "Boat_cityId_idx" ON "Boat"("cityId");

-- Table User
CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT NOT NULL UNIQUE,
    "emailVerified" TIMESTAMP,
    "image" TEXT,
    "password" TEXT,
    "role" TEXT NOT NULL DEFAULT 'user',
    "phone" TEXT,
    "address" TEXT,
    "city" TEXT,
    "zip" TEXT,
    "country" TEXT,
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Table Account (NextAuth)
CREATE TABLE IF NOT EXISTS "Account" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
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
    UNIQUE("provider", "providerAccountId")
);

CREATE INDEX IF NOT EXISTS "Account_userId_idx" ON "Account"("userId");

-- Table Session (NextAuth)
CREATE TABLE IF NOT EXISTS "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionToken" TEXT NOT NULL UNIQUE,
    "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "expires" TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS "Session_userId_idx" ON "Session"("userId");

-- Table VerificationToken (NextAuth)
CREATE TABLE IF NOT EXISTS "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL UNIQUE,
    "expires" TIMESTAMP NOT NULL,
    UNIQUE("identifier", "token")
);

-- Table Reservation
CREATE TABLE IF NOT EXISTS "Reservation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "boatId" INTEGER REFERENCES "Boat"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    "startDate" TIMESTAMP NOT NULL,
    "endDate" TIMESTAMP NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "totalPrice" INTEGER,
    "reference" TEXT UNIQUE,
    "canceledAt" TIMESTAMP,
    "cancellationReason" TEXT,
    "commissionAmount" INTEGER,
    "commissionRate" INTEGER,
    "completedAt" TIMESTAMP,
    "currency" TEXT DEFAULT 'eur',
    "depositAmount" INTEGER,
    "depositPaidAt" TIMESTAMP,
    "depositPercent" INTEGER,
    "locale" TEXT,
    "lockedPrice" BOOLEAN DEFAULT TRUE,
    "metadata" TEXT,
    "notesInternal" TEXT,
    "part" TEXT,
    "passengers" INTEGER,
    "refundAmount" INTEGER,
    "remainingAmount" INTEGER,
    "stripeCustomerId" TEXT,
    "stripeInvoiceId" TEXT,
    "stripePaymentIntentId" TEXT,
    "stripeRefundId" TEXT,
    "stripeSessionId" TEXT,
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "Reservation_userId_idx" ON "Reservation"("userId");
CREATE INDEX IF NOT EXISTS "Reservation_boatId_idx" ON "Reservation"("boatId");
CREATE INDEX IF NOT EXISTS "Reservation_startDate_idx" ON "Reservation"("startDate");
CREATE INDEX IF NOT EXISTS "Reservation_status_idx" ON "Reservation"("status");

-- Table AvailabilitySlot
CREATE TABLE IF NOT EXISTS "AvailabilitySlot" (
    "id" SERIAL PRIMARY KEY,
    "boatId" INTEGER NOT NULL REFERENCES "Boat"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "date" TIMESTAMP NOT NULL,
    "part" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'available',
    "note" TEXT,
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE("boatId", "date", "part")
);

CREATE INDEX IF NOT EXISTS "AvailabilitySlot_boatId_idx" ON "AvailabilitySlot"("boatId");
CREATE INDEX IF NOT EXISTS "AvailabilitySlot_date_idx" ON "AvailabilitySlot"("date");

-- Table AgencyRequest
CREATE TABLE IF NOT EXISTS "AgencyRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "boatId" INTEGER REFERENCES "Boat"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    "reservationId" TEXT REFERENCES "Reservation"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    "startDate" TIMESTAMP NOT NULL,
    "endDate" TIMESTAMP NOT NULL,
    "part" TEXT,
    "passengers" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "totalPrice" INTEGER,
    "currency" TEXT DEFAULT 'eur',
    "locale" TEXT,
    "notesInternal" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "AgencyRequest_userId_idx" ON "AgencyRequest"("userId");
CREATE INDEX IF NOT EXISTS "AgencyRequest_boatId_idx" ON "AgencyRequest"("boatId");
CREATE INDEX IF NOT EXISTS "AgencyRequest_startDate_idx" ON "AgencyRequest"("startDate");
CREATE INDEX IF NOT EXISTS "AgencyRequest_status_idx" ON "AgencyRequest"("status");

-- Table UsedBoat
CREATE TABLE IF NOT EXISTS "UsedBoat" (
    "id" SERIAL PRIMARY KEY,
    "slug" TEXT NOT NULL UNIQUE,
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
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "UsedBoat_status_idx" ON "UsedBoat"("status");
CREATE INDEX IF NOT EXISTS "UsedBoat_sort_idx" ON "UsedBoat"("sort");

-- Table ContactMessage
CREATE TABLE IF NOT EXISTS "ContactMessage" (
    "id" SERIAL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "message" TEXT NOT NULL,
    "usedBoatId" INTEGER REFERENCES "UsedBoat"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    "locale" TEXT,
    "sourcePage" TEXT,
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "readAt" TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "ContactMessage_usedBoatId_idx" ON "ContactMessage"("usedBoatId");
CREATE INDEX IF NOT EXISTS "ContactMessage_createdAt_idx" ON "ContactMessage"("createdAt");

-- Table BoatOption
CREATE TABLE IF NOT EXISTS "BoatOption" (
    "id" SERIAL PRIMARY KEY,
    "boatId" INTEGER NOT NULL REFERENCES "Boat"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "label" TEXT NOT NULL,
    "price" INTEGER,
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "BoatOption_boatId_idx" ON "BoatOption"("boatId");

-- Table BoatExperience
CREATE TABLE IF NOT EXISTS "BoatExperience" (
    "boatId" INTEGER NOT NULL REFERENCES "Boat"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "experienceId" INTEGER NOT NULL REFERENCES "Experience"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "price" INTEGER,
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    PRIMARY KEY ("boatId", "experienceId")
);

CREATE INDEX IF NOT EXISTS "BoatExperience_experienceId_idx" ON "BoatExperience"("experienceId");

-- Table ExperienceAvailabilitySlot
CREATE TABLE IF NOT EXISTS "ExperienceAvailabilitySlot" (
    "id" SERIAL PRIMARY KEY,
    "experienceId" INTEGER NOT NULL REFERENCES "Experience"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "date" TIMESTAMP NOT NULL,
    "part" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'available',
    "note" TEXT,
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE("experienceId", "date", "part")
);

CREATE INDEX IF NOT EXISTS "ExperienceAvailabilitySlot_experienceId_idx" ON "ExperienceAvailabilitySlot"("experienceId");
CREATE INDEX IF NOT EXISTS "ExperienceAvailabilitySlot_date_idx" ON "ExperienceAvailabilitySlot"("date");

-- Table LegalPage
CREATE TABLE IF NOT EXISTS "LegalPage" (
    "id" SERIAL PRIMARY KEY,
    "slug" TEXT NOT NULL UNIQUE,
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
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Table GalleryImage
CREATE TABLE IF NOT EXISTS "GalleryImage" (
    "id" SERIAL PRIMARY KEY,
    "imageUrl" TEXT NOT NULL,
    "titleFr" TEXT,
    "titleEn" TEXT,
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Table InfoCard
CREATE TABLE IF NOT EXISTS "InfoCard" (
    "id" SERIAL PRIMARY KEY,
    "imageUrl" TEXT NOT NULL,
    "titleFr" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "descFr" TEXT,
    "descEn" TEXT,
    "sort" INTEGER DEFAULT 0,
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================
-- Fin du schéma
-- ============================================



