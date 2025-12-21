# Guide de Déploiement - bbyatchv2 sur VPS

## 📋 Vue d'ensemble

Ce guide vous explique comment déployer votre projet bbyatchv2 sur votre VPS Ubuntu.

## 🚀 Méthode Rapide (Script Automatique)

### Étape 1 : Transférer le projet sur le serveur

Depuis votre machine Windows (PowerShell), dans le dossier du projet :

```bash
# Transférer tout le projet (en excluant node_modules et .next pour aller plus vite)
scp -r . ubuntu@51.83.134.141:~/bbyatchv2-master --exclude node_modules --exclude .next

# OU si vous avez git sur le serveur, clonez directement :
ssh ubuntu@51.83.134.141
git clone <VOTRE_REPO_GIT> ~/bbyatchv2-master
```

### Étape 2 : Transférer le script de déploiement

```bash
scp deploy/deploy.sh ubuntu@51.83.134.141:~/
```

### Étape 3 : Exécuter le script de déploiement

Sur le serveur :

```bash
ssh ubuntu@51.83.134.141
chmod +x deploy.sh
bash deploy.sh
```

Le script va automatiquement :
- ✅ Vérifier les prérequis (Node.js, Docker, PM2, Nginx)
- ✅ Installer les dépendances npm
- ✅ Créer/configurer le fichier .env
- ✅ Démarrer PostgreSQL avec Docker
- ✅ Appliquer les migrations Prisma
- ✅ Builder l'application Next.js
- ✅ Configurer Nginx
- ✅ Démarrer l'application avec PM2

---

## 🔧 Méthode Manuelle (Étape par Étape)

### Prérequis

Assurez-vous d'avoir installé sur le serveur :
- Node.js 20 LTS
- Docker et Docker Compose
- PM2
- Nginx

### Étape 1 : Transférer le projet

```bash
# Depuis Windows (PowerShell)
scp -r . ubuntu@51.83.134.141:~/bbyatchv2-master
```

### Étape 2 : Se connecter au serveur

```bash
ssh ubuntu@51.83.134.141
cd ~/bbyatchv2-master
```

### Étape 3 : Installer les dépendances

```bash
npm ci
```

### Étape 4 : Configurer le fichier .env

Créez un fichier `.env` à la racine du projet :

```bash
nano .env
```

Contenu minimal :

```env
# Base de données PostgreSQL
DATABASE_URL="postgresql://bbyatch:change_me_strong@localhost:5433/bbyatch_preprod?schema=public"

# NextAuth
NEXTAUTH_URL="https://preprod.bbservicescharter.com"
NEXTAUTH_SECRET="GÉNÉREZ_UNE_CLÉ_SECRÈTE_LONGUE_ET_ALÉATOIRE"

# Stripe (si vous utilisez Stripe)
STRIPE_TEST_SK="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Port de l'application
PORT=3010
```

Pour générer un NEXTAUTH_SECRET :

```bash
openssl rand -base64 32
```

### Étape 5 : Démarrer PostgreSQL

```bash
docker compose -f docker-compose.preprod.yml up -d
```

Vérifier que PostgreSQL est prêt :

```bash
docker ps
docker logs bbyatchv2-preprod-db
```

### Étape 6 : Générer le client Prisma

```bash
npx prisma generate
```

### Étape 7 : Appliquer les migrations

```bash
npx prisma migrate deploy
```

### Étape 8 : Builder l'application

```bash
npm run build
```

### Étape 9 : Configurer Nginx

```bash
# Copier la configuration
sudo cp deploy/nginx-preprod.conf /etc/nginx/sites-available/bbyatchv2-preprod

# Créer le lien symbolique
sudo ln -s /etc/nginx/sites-available/bbyatchv2-preprod /etc/nginx/sites-enabled/

# Tester la configuration
sudo nginx -t

# Recharger Nginx
sudo systemctl reload nginx
```

### Étape 10 : Démarrer l'application avec PM2

```bash
# Démarrer avec PM2
PORT=3010 pm2 start ecosystem.config.cjs

# Sauvegarder la configuration PM2
pm2 save

# Optionnel: Configurer PM2 pour démarrer au boot
pm2 startup
```

### Étape 11 : Vérifier que tout fonctionne

```bash
# Voir les logs
pm2 logs bbyatchv2-preprod

# Voir le statut
pm2 status

# Tester l'application
curl http://localhost:3010
```

---

## 🔒 Configuration SSL (Optionnel mais Recommandé)

Si vous avez un domaine configuré :

```bash
sudo certbot --nginx -d preprod.bbservicescharter.com --agree-tos -m votre@email.com --redirect
```

---

## 📝 Commandes Utiles

### PM2

```bash
# Voir les logs
pm2 logs bbyatchv2-preprod

# Redémarrer l'application
pm2 restart bbyatchv2-preprod

# Arrêter l'application
pm2 stop bbyatchv2-preprod

# Voir le statut
pm2 status

# Monitoring en temps réel
pm2 monit
```

### Docker

```bash
# Voir les containers
docker ps

# Voir les logs de la base de données
docker logs bbyatchv2-preprod-db

# Arrêter la base de données
docker stop bbyatchv2-preprod-db

# Démarrer la base de données
docker start bbyatchv2-preprod-db

# Accéder à PostgreSQL
docker exec -it bbyatchv2-preprod-db psql -U bbyatch -d bbyatch_preprod
```

### Nginx

```bash
# Tester la configuration
sudo nginx -t

# Recharger Nginx
sudo systemctl reload nginx

# Redémarrer Nginx
sudo systemctl restart nginx

# Voir les logs
sudo tail -f /var/log/nginx/error.log
```

---

## 🔄 Mise à Jour de l'Application

Quand vous voulez mettre à jour l'application :

```bash
cd ~/bbyatchv2-master

# Mettre à jour le code (si vous utilisez git)
git pull

# Installer les nouvelles dépendances
npm ci

# Appliquer les nouvelles migrations
npx prisma migrate deploy
npx prisma generate

# Rebuilder l'application
npm run build

# Redémarrer avec PM2
pm2 restart bbyatchv2-preprod
```

---

## 🐛 Dépannage

### L'application ne démarre pas

1. Vérifier les logs : `pm2 logs bbyatchv2-preprod`
2. Vérifier que le port 3010 est libre : `sudo lsof -i :3010`
3. Vérifier le fichier .env
4. Vérifier que PostgreSQL tourne : `docker ps`

### Erreurs de base de données

1. Vérifier que PostgreSQL tourne : `docker ps`
2. Vérifier les logs : `docker logs bbyatchv2-preprod-db`
3. Vérifier la connexion : `docker exec -it bbyatchv2-preprod-db psql -U bbyatch -d bbyatch_preprod`
4. Vérifier DATABASE_URL dans .env

### Erreurs Nginx

1. Tester la configuration : `sudo nginx -t`
2. Voir les logs : `sudo tail -f /var/log/nginx/error.log`
3. Vérifier que l'application tourne : `pm2 status`

### Port déjà utilisé

```bash
# Trouver le processus utilisant le port
sudo lsof -i :3010

# Tuer le processus
sudo kill -9 <PID>
```

---

## ✅ Checklist de Déploiement

- [ ] Node.js 20 LTS installé
- [ ] Docker installé et fonctionnel
- [ ] PM2 installé
- [ ] Nginx installé
- [ ] Projet transféré sur le serveur
- [ ] Fichier .env configuré avec les bonnes valeurs
- [ ] PostgreSQL démarré (Docker)
- [ ] Migrations Prisma appliquées
- [ ] Application buildée
- [ ] Nginx configuré
- [ ] Application démarrée avec PM2
- [ ] SSL configuré (optionnel)
- [ ] Application accessible via le navigateur

---

## 📞 Support

En cas de problème, vérifiez les logs :
- Application : `pm2 logs bbyatchv2-preprod`
- Nginx : `sudo tail -f /var/log/nginx/error.log`
- PostgreSQL : `docker logs bbyatchv2-preprod-db`

