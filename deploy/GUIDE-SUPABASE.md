# Guide de Déploiement avec Supabase

## 🎯 Pourquoi Supabase ?

Avec Supabase, vous n'avez **PAS BESOIN** de :
- ❌ Docker
- ❌ PostgreSQL local
- ❌ Gérer la base de données vous-même

Supabase héberge votre base de données PostgreSQL dans le cloud. C'est beaucoup plus simple !

## 📋 Prérequis

1. Un compte Supabase (gratuit) : https://supabase.com
2. Un projet Supabase créé
3. Votre DATABASE_URL Supabase

## 🚀 Déploiement Rapide

```bash
cd ~/bbyatchv2-master
bash deploy/deploy-supabase.sh
```

## ⚙️ Configuration Supabase

### Étape 1: Obtenir votre DATABASE_URL

1. Allez sur https://supabase.com
2. Ouvrez votre projet
3. **Settings** > **Database**
4. Dans "Connection string", choisissez **URI**
5. Copiez l'URL qui ressemble à :
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres
   ```
6. Remplacez `[YOUR-PASSWORD]` par votre mot de passe de base de données

### Étape 2: Configurer le .env

Dans votre fichier `.env` sur le serveur :

```env
# Votre URL Supabase (remplacez [YOUR-PASSWORD] par votre vrai mot de passe)
DATABASE_URL="postgresql://postgres:votre-mot-de-passe@db.xxxxx.supabase.co:5432/postgres?schema=public"

# NextAuth
NEXTAUTH_URL="https://preprod.bbservicescharter.com"
NEXTAUTH_SECRET="votre-secret-tres-long-et-aleatoire"

# Stripe
STRIPE_TEST_SK="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Port
PORT=3010
```

### Étape 3: Vérifier le schema Prisma

Assurez-vous que `prisma/schema.prisma` utilise PostgreSQL :

```prisma
datasource db {
  provider = "postgresql"  // Pas "sqlite" !
  url      = env("DATABASE_URL")
}
```

Si c'est encore `sqlite`, changez-le en `postgresql`.

## 🔄 Migrations Prisma sur Supabase

Les migrations Prisma fonctionnent exactement pareil avec Supabase :

```bash
# Appliquer les migrations
npx prisma migrate deploy

# Générer le client Prisma
npx prisma generate
```

## ✅ Avantages de Supabase

- ✅ **Pas de Docker** : Plus simple, moins de problèmes
- ✅ **Base de données gérée** : Pas besoin de maintenir PostgreSQL
- ✅ **Backups automatiques** : Supabase fait les backups pour vous
- ✅ **Interface web** : Vous pouvez voir vos données sur supabase.com
- ✅ **Gratuit** : Plan gratuit généreux pour commencer
- ✅ **Scalable** : Facile d'upgrader plus tard

## 🔍 Vérification

Après le déploiement, vérifiez que tout fonctionne :

```bash
# Vérifier les logs PM2
pm2 logs bbyatchv2-preprod

# Vérifier que l'app répond
curl http://localhost:3010

# Vérifier la connexion à Supabase
npx prisma db pull  # Devrait fonctionner sans erreur
```

## 🐛 Dépannage

### Erreur de connexion à Supabase

1. Vérifiez que votre DATABASE_URL est correcte dans `.env`
2. Vérifiez que votre mot de passe est correct (pas `[YOUR-PASSWORD]`)
3. Vérifiez que votre projet Supabase est actif
4. Vérifiez que le provider dans `schema.prisma` est `postgresql`

### Erreur "schema does not exist"

Si vous voyez cette erreur, créez le schema dans Supabase :

1. Allez sur Supabase > SQL Editor
2. Exécutez : `CREATE SCHEMA IF NOT EXISTS public;`
3. Relancez les migrations : `npx prisma migrate deploy`

## 📝 Notes

- Supabase utilise PostgreSQL standard, donc Prisma fonctionne parfaitement
- Vous pouvez utiliser l'interface Supabase pour voir/modifier vos données
- Les migrations Prisma fonctionnent exactement comme avec PostgreSQL local
- Pas besoin de gérer les backups, Supabase s'en charge

