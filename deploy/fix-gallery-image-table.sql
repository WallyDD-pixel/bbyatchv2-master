-- Script pour mettre à jour la table GalleryImage dans Supabase
-- Exécutez ce script dans Supabase > SQL Editor si la table existe déjà

-- Ajouter les colonnes manquantes si elles n'existent pas
DO $$ 
BEGIN
    -- Ajouter videoUrl si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'GalleryImage' AND column_name = 'videoUrl'
    ) THEN
        ALTER TABLE "GalleryImage" ADD COLUMN "videoUrl" TEXT;
    END IF;

    -- Ajouter contentFr si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'GalleryImage' AND column_name = 'contentFr'
    ) THEN
        ALTER TABLE "GalleryImage" ADD COLUMN "contentFr" TEXT;
    END IF;

    -- Ajouter contentEn si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'GalleryImage' AND column_name = 'contentEn'
    ) THEN
        ALTER TABLE "GalleryImage" ADD COLUMN "contentEn" TEXT;
    END IF;

    -- Ajouter sort si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'GalleryImage' AND column_name = 'sort'
    ) THEN
        ALTER TABLE "GalleryImage" ADD COLUMN "sort" INTEGER DEFAULT 0;
    END IF;
END $$;

-- Vérifier que la table existe, sinon la créer
CREATE TABLE IF NOT EXISTS "GalleryImage" (
    "id" SERIAL PRIMARY KEY,
    "imageUrl" TEXT NOT NULL,
    "videoUrl" TEXT,
    "titleFr" TEXT,
    "titleEn" TEXT,
    "contentFr" TEXT,
    "contentEn" TEXT,
    "sort" INTEGER DEFAULT 0,
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);
