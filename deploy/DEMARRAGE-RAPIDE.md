# 🚀 Démarrage Rapide - Déploiement avec Supabase

## ✅ Checklist Avant de Commencer

- [ ] Votre projet Supabase est créé
- [ ] Vous avez votre DATABASE_URL Supabase
- [ ] Le fichier `prisma/schema.prisma` utilise `provider = "postgresql"` (pas "sqlite")
- [ ] Vous êtes connecté à votre serveur VPS

## 📋 Étapes de Déploiement

### 1. Sur votre serveur VPS

```bash
# Se connecter au serveur
ssh ubuntu@51.83.134.141

# Aller dans le dossier du projet
cd ~/bbyatchv2-master

# Récupérer les dernières modifications (si vous avez fait des changements)
git pull

# Si vous avez des changements locaux qui bloquent:
git stash push -m "mes-changements"
git pull
```

### 2. Vérifier/Créer le fichier .env

```bash
# Éditer le fichier .env
nano .env
```

Assurez-vous que votre `.env` contient :

```env
# Votre URL Supabase (remplacez [YOUR-PASSWORD] par votre vrai mot de passe)
DATABASE_URL="postgresql://postgres:votre-mot-de-passe@db.xxxxx.supabase.co:5432/postgres?schema=public"

# NextAuth
NEXTAUTH_URL="https://preprod.bbservicescharter.com"
NEXTAUTH_SECRET="générez-avec: openssl rand -base64 32"

# Stripe (si vous utilisez Stripe)
STRIPE_TEST_SK="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Port
PORT=3010
```

**Pour obtenir votre DATABASE_URL Supabase :**
1. Allez sur https://supabase.com
2. Ouvrez votre projet
3. **Settings** > **Database**
4. Copiez la "Connection string" (URI)
5. Remplacez `[YOUR-PASSWORD]` par votre mot de passe de base de données

### 3. Vérifier que schema.prisma utilise PostgreSQL

```bash
# Vérifier le provider
grep "provider" prisma/schema.prisma
```

Il doit afficher : `provider = "postgresql"`

Si c'est `provider = "sqlite"`, modifiez-le :

```bash
nano prisma/schema.prisma
# Changez "sqlite" en "postgresql"
```

### 4. Lancer le déploiement

```bash
# Utiliser le script de déploiement avec Supabase
bash deploy/deploy-supabase.sh
```

Le script va automatiquement :
- ✅ Installer les dépendances npm
- ✅ Générer le client Prisma
- ✅ Appliquer les migrations sur Supabase
- ✅ Builder l'application Next.js
- ✅ Configurer Nginx
- ✅ Démarrer l'application avec PM2

### 5. Vérifier que tout fonctionne

```bash
# Vérifier le statut PM2
pm2 status

# Voir les logs
pm2 logs bbyatchv2-preprod --lines 50

# Tester l'application
curl http://localhost:3010
```

## 🔍 En Cas de Problème

### Erreur de connexion à Supabase

```bash
# Vérifier que DATABASE_URL est correcte
cat .env | grep DATABASE_URL

# Tester la connexion manuellement
npx prisma db pull
```

### Erreur "schema does not exist"

1. Allez sur Supabase > SQL Editor
2. Exécutez : `CREATE SCHEMA IF NOT EXISTS public;`
3. Relancez : `npx prisma migrate deploy`

### L'application ne démarre pas

```bash
# Voir les logs détaillés
pm2 logs bbyatchv2-preprod --err --lines 100

# Redémarrer
pm2 restart bbyatchv2-preprod
```

### Démarrer l'application manuellement avec PM2

Si PM2 est configuré mais l'application n'est pas démarrée :

```bash
# Vérifier que l'application est buildée
npm run build

# Démarrer avec PM2
pm2 start ecosystem.config.cjs

# Sauvegarder la configuration
pm2 save

# Vérifier le statut
pm2 status

# Voir les logs
pm2 logs bbyatchv2-preprod
```

Ou utilisez le script automatique :

```bash
chmod +x deploy/start-pm2.sh
./deploy/start-pm2.sh
```

## 📝 Commandes Utiles Après Déploiement

```bash
# Voir les logs en temps réel
pm2 logs bbyatchv2-preprod

# Redémarrer l'application
pm2 restart bbyatchv2-preprod

# Voir le statut
pm2 status

# Monitoring
pm2 monit

# Vérifier Nginx
sudo nginx -t
sudo systemctl status nginx

# Voir les logs Nginx
sudo tail -f /var/log/nginx/error.log
```

## 🎯 Résumé

1. ✅ Vérifier `.env` avec votre DATABASE_URL Supabase
2. ✅ Vérifier `schema.prisma` utilise `postgresql`
3. ✅ Lancer `bash deploy/deploy-supabase.sh`
4. ✅ Vérifier que ça fonctionne avec `pm2 logs`

C'est tout ! Pas besoin de Docker, pas besoin de PostgreSQL local. Supabase s'occupe de tout. 🎉




