# 🚀 Guide de Déploiement Propre sur VPS Réinitialisé

## 🔄 Réinitialisation du VPS

### Option 1: Via votre hébergeur (Recommandé)

La plupart des hébergeurs (OVH, Scaleway, DigitalOcean, etc.) permettent de réinstaller le système d'exploitation :

1. Connectez-vous à votre panel d'hébergement
2. Trouvez votre VPS dans la liste
3. Cherchez "Réinstaller" ou "Reinstall OS" ou "Reset"
4. Choisissez **Ubuntu 22.04 LTS** (ou 24.04)
5. Confirmez la réinstallation

⚠️ **ATTENTION** : Cela supprime TOUTES les données sur le serveur !

### Option 2: Réinstallation manuelle

Si vous avez un accès root complet, vous pouvez réinstaller Ubuntu, mais c'est plus complexe.

## ✅ Déploiement Propre Après Réinitialisation

Une fois le VPS réinitialisé, suivez ces étapes :

### 1. Connexion initiale

```bash
ssh ubuntu@VOTRE_IP_VPS
```

### 2. Mise à jour du système

```bash
sudo apt update
sudo apt upgrade -y
```

### 3. Installation des prérequis

```bash
# Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Nginx
sudo apt install -y nginx

# PM2
sudo npm install -g pm2

# Git (si pas installé)
sudo apt install -y git

# Vérifications
node -v  # Doit afficher v20.x.x
npm -v
pm2 -v
nginx -v
```

### 4. Cloner le projet

```bash
cd ~
git clone https://github.com/WallyDD-pixel/bbyatchv2-master.git
cd bbyatchv2-master
```

### 5. Configurer le fichier .env

```bash
nano .env
```

Contenu minimal :

```env
# Base de données Supabase
DATABASE_URL="postgresql://postgres:Escalop08%26%26@db.nbovypcv.supabase.co:5432/postgres?schema=public"

# NextAuth
NEXTAUTH_URL="https://preprod.bbservicescharter.com"
NEXTAUTH_SECRET="$(openssl rand -base64 32)"

# Port
PORT=3010

# Stripe (si utilisé)
STRIPE_TEST_SK=""
STRIPE_WEBHOOK_SECRET=""
```

Générer NEXTAUTH_SECRET :
```bash
openssl rand -base64 32
```

### 6. Vérifier schema.prisma

```bash
# S'assurer que c'est PostgreSQL
grep "provider" prisma/schema.prisma
# Doit afficher: provider = "postgresql"
```

Si ce n'est pas le cas :
```bash
sed -i 's/provider = "sqlite"/provider = "postgresql"/' prisma/schema.prisma
```

### 7. Appliquer les migrations dans Supabase

**IMPORTANT** : Avant de déployer, appliquez les migrations SQL dans Supabase :

1. Allez sur https://supabase.com
2. Votre projet > SQL Editor
3. Copiez le contenu de `deploy/supabase-schema-postgres.sql`
4. Collez et exécutez dans SQL Editor

### 8. Déployer l'application

```bash
cd ~/bbyatchv2-master

# Utiliser le script de déploiement sans migrations
bash deploy/deploy-sans-migrations.sh
```

Si le script n'existe pas encore, utilisez le script principal :

```bash
bash deploy/deploy-supabase.sh
```

### 9. Vérifier que tout fonctionne

```bash
# Vérifier PM2
pm2 status

# Voir les logs
pm2 logs bbyatchv2-preprod --lines 30

# Tester localement
curl http://localhost:3010

# Vérifier depuis l'extérieur
curl https://preprod.bbservicescharter.com
```

## 📋 Checklist Complète

- [ ] VPS réinitialisé avec Ubuntu 22.04+
- [ ] Node.js 20 LTS installé
- [ ] Nginx installé
- [ ] PM2 installé
- [ ] Git installé
- [ ] Projet cloné depuis GitHub
- [ ] Fichier .env configuré avec DATABASE_URL Supabase
- [ ] schema.prisma utilise `postgresql`
- [ ] Migrations SQL appliquées dans Supabase Dashboard
- [ ] Application déployée avec PM2
- [ ] Nginx configuré
- [ ] Application accessible sur https://preprod.bbservicescharter.com

## 🔒 Sécurité (Optionnel mais Recommandé)

```bash
# Configurer le firewall
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable

# Vérifier les permissions du .env
chmod 600 .env
```

## 🎯 Avantages de la Réinitialisation

- ✅ Serveur propre, sans conflits
- ✅ Pas de processus zombies
- ✅ Pas de ports bloqués
- ✅ Configuration propre depuis le début
- ✅ Meilleures performances

## ⚠️ Avant de Réinitialiser

Assurez-vous d'avoir :
- ✅ Sauvegardé votre fichier `.env` (avec les secrets)
- ✅ Les migrations SQL prêtes (`deploy/supabase-schema-postgres.sql`)
- ✅ Accès à votre compte Supabase
- ✅ Les identifiants de connexion SSH

Une fois réinitialisé, le déploiement devrait être beaucoup plus simple et sans problèmes !







