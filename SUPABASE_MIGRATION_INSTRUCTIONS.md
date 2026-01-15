# Instructions pour appliquer la migration Supabase

## Sur le VPS (après avoir fait `git pull`) :

```bash
cd ~/bbyatchv2-master

# 1. S'assurer que le schéma Prisma est à jour
npx prisma generate

# 2. Appliquer la migration
npx prisma migrate deploy

# OU si vous préférez appliquer directement via SQL dans Supabase :
# Connectez-vous à votre dashboard Supabase > SQL Editor et exécutez :
# ALTER TABLE "Settings" ADD COLUMN IF NOT EXISTS "aboutHistoryImageUrl" TEXT;
# ALTER TABLE "Settings" ADD COLUMN IF NOT EXISTS "aboutTeamImageUrl" TEXT;
```

## Alternative : Via le dashboard Supabase

1. Allez dans votre projet Supabase
2. Ouvrez "SQL Editor"
3. Exécutez :
```sql
ALTER TABLE "Settings" ADD COLUMN IF NOT EXISTS "aboutHistoryImageUrl" TEXT;
ALTER TABLE "Settings" ADD COLUMN IF NOT EXISTS "aboutTeamImageUrl" TEXT;
```

## Après la migration

```bash
# Régénérer le client Prisma
npx prisma generate

# Redémarrer l'application
pm2 restart bbyatchv2-preprod
```
