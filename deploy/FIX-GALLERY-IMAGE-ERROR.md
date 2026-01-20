# 🔧 Correction de l'erreur GalleryImage

## Problème identifié

L'application génère des erreurs car :
1. La table `GalleryImage` dans Supabase n'a pas toutes les colonnes nécessaires (`videoUrl`, `contentFr`, `contentEn`, `sort`)
2. Prisma Client n'est pas à jour sur le serveur

## Solution

### Étape 1 : Mettre à jour la table dans Supabase

1. Connectez-vous à [Supabase Dashboard](https://supabase.com)
2. Allez dans votre projet > **SQL Editor**
3. Exécutez le script `deploy/fix-gallery-image-table.sql` :

```sql
-- Ajouter les colonnes manquantes
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'GalleryImage' AND column_name = 'videoUrl'
    ) THEN
        ALTER TABLE "GalleryImage" ADD COLUMN "videoUrl" TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'GalleryImage' AND column_name = 'contentFr'
    ) THEN
        ALTER TABLE "GalleryImage" ADD COLUMN "contentFr" TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'GalleryImage' AND column_name = 'contentEn'
    ) THEN
        ALTER TABLE "GalleryImage" ADD COLUMN "contentEn" TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'GalleryImage' AND column_name = 'sort'
    ) THEN
        ALTER TABLE "GalleryImage" ADD COLUMN "sort" INTEGER DEFAULT 0;
    END IF;
END $$;
```

### Étape 2 : Sur le serveur - Régénérer Prisma Client

```bash
cd ~/bbyatchv2-master
npx prisma generate
```

### Étape 3 : Redémarrer l'application

```bash
pm2 restart bbyatchv2-preprod
```

### Étape 4 : Vérifier les logs

```bash
pm2 logs bbyatchv2-preprod --lines 30 --nostream
```

### Étape 5 : Tester l'application

```bash
curl http://localhost:3010
```

Si tout fonctionne, vous devriez voir la page d'accueil sans erreurs.

## Vérification

Pour vérifier que la table est correcte dans Supabase :

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'GalleryImage'
ORDER BY ordinal_position;
```

Vous devriez voir toutes les colonnes : `id`, `imageUrl`, `videoUrl`, `titleFr`, `titleEn`, `contentFr`, `contentEn`, `sort`, `createdAt`.
