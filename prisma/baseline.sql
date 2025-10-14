PRAGMA foreign_keys=OFF;
BEGIN TRANSACTION;

-- Table: Settings
CREATE TABLE "Settings" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "experiencesHeadlineFr" TEXT,
  "experiencesHeadlineEn" TEXT,
  "experiencesTitleFr" TEXT,
  "experiencesTitleEn" TEXT
);
INSERT INTO "Settings" (id) VALUES (1) ON CONFLICT DO NOTHING;

-- Table: Experience
CREATE TABLE "Experience" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "slug" TEXT NOT NULL,
  "titleFr" TEXT NOT NULL,
  "titleEn" TEXT NOT NULL,
  "descFr" TEXT NOT NULL,
  "descEn" TEXT NOT NULL,
  "timeFr" TEXT,
  "timeEn" TEXT,
  "imageUrl" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);
CREATE UNIQUE INDEX "Experience_slug_key" ON "Experience"("slug");

-- Table: Boat
CREATE TABLE "Boat" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "city" TEXT,
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
  "available" BOOLEAN NOT NULL DEFAULT 1,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);
CREATE UNIQUE INDEX "Boat_slug_key" ON "Boat"("slug");

-- Table: GalleryImage
CREATE TABLE "GalleryImage" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "imageUrl" TEXT NOT NULL,
  "titleFr" TEXT,
  "titleEn" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Table: InfoCard
CREATE TABLE "InfoCard" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "imageUrl" TEXT NOT NULL,
  "titleFr" TEXT NOT NULL,
  "titleEn" TEXT NOT NULL,
  "descFr" TEXT,
  "descEn" TEXT,
  "sort" INTEGER DEFAULT 0,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Table: User
CREATE TABLE "User" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT,
  "firstName" TEXT,
  "lastName" TEXT,
  "email" TEXT NOT NULL,
  "emailVerified" DATETIME,
  "image" TEXT,
  "password" TEXT,
  "role" TEXT NOT NULL DEFAULT 'user',
  "phone" TEXT,
  "address" TEXT,
  "city" TEXT,
  "zip" TEXT,
  "country" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- Table: Account
CREATE TABLE "Account" (
  "id" TEXT NOT NULL PRIMARY KEY,
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
  CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- Table: Session
CREATE TABLE "Session" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "sessionToken" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "expires" DATETIME NOT NULL,
  CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- Table: VerificationToken
CREATE TABLE "VerificationToken" (
  "identifier" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "expires" DATETIME NOT NULL
);
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- Table: Reservation
CREATE TABLE "Reservation" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "boatId" INTEGER,
  "startDate" DATETIME NOT NULL,
  "endDate" DATETIME NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "totalPrice" INTEGER,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "Reservation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Reservation_boatId_fkey" FOREIGN KEY ("boatId") REFERENCES "Boat"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- Table: AvailabilitySlot
CREATE TABLE "AvailabilitySlot" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "boatId" INTEGER NOT NULL,
  "date" DATETIME NOT NULL,
  "part" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'available',
  "note" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "AvailabilitySlot_boatId_fkey" FOREIGN KEY ("boatId") REFERENCES "Boat"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "AvailabilitySlot_boatId_date_part_key" ON "AvailabilitySlot"("boatId", "date", "part");
CREATE INDEX "AvailabilitySlot_date_idx" ON "AvailabilitySlot"("date");

COMMIT;
PRAGMA foreign_keys=ON;
