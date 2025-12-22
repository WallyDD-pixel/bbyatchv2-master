# 🔄 Appliquer les Migrations Prisma depuis votre Machine Locale

## 🎯 Pourquoi ?

Pour éviter les problèmes de mémoire sur le serveur VPS, appliquez les migrations Prisma depuis votre machine Windows qui a plus de ressources.

## ✅ Étapes

### 1. Sur votre machine Windows

```bash
cd C:\Users\lespcdewarren\Documents\dev\bbyatchv2-master
```

### 2. Vérifier votre .env local

Assurez-vous que votre `.env` local pointe vers Supabase :

```env
DATABASE_URL="postgresql://postgres:Escalop08%26%26@db.nbovypcv.supabase.co:5432/postgres?schema=public"
```

### 3. Vérifier schema.prisma

Assurez-vous que `prisma/schema.prisma` utilise PostgreSQL :

```prisma
datasource db {
  provider = "postgresql"  // Pas "sqlite" !
  url      = env("DATABASE_URL")
}
```

### 4. Appliquer les migrations

```bash
# Générer le client Prisma
npx prisma generate

# Appliquer les migrations sur Supabase
npx prisma migrate deploy
```

Les migrations seront appliquées directement sur votre base Supabase !

## 🚀 Déploiement sur le Serveur (Sans Migrations)

Sur votre serveur VPS, utilisez le script qui skip les migrations :

```bash
cd ~/bbyatchv2-master
bash deploy/deploy-sans-migrations.sh
```

Ce script va :
- ✅ Installer les dépendances
- ✅ Générer le client Prisma
- ✅ Builder l'application
- ✅ Configurer Nginx
- ✅ Démarrer avec PM2
- ⏭️ **Sauter les migrations** (déjà faites depuis votre machine)

## 📝 Avantages

- ✅ Pas de problème de mémoire sur le serveur
- ✅ Migrations appliquées rapidement depuis votre machine
- ✅ Plus de contrôle sur les migrations
- ✅ Possibilité de voir les erreurs en détail

## 🔍 Vérification

Après avoir appliqué les migrations, vérifiez sur Supabase :

1. Allez sur https://supabase.com
2. Votre projet > Table Editor
3. Vous devriez voir toutes vos tables créées

## 🐛 En Cas d'Erreur

Si les migrations échouent :

1. Vérifiez que votre DATABASE_URL est correcte
2. Vérifiez que votre projet Supabase est actif
3. Vérifiez que le mot de passe est correct
4. Vérifiez que `schema.prisma` utilise `postgresql`

Vous pouvez aussi utiliser Supabase Dashboard > SQL Editor pour exécuter les migrations SQL manuellement.



