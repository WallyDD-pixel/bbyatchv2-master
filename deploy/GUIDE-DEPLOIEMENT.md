# Guide de Déploiement - BB YACHTS v2

## 📋 Prérequis

- Serveur EC2 Amazon Linux 2023 configuré
- Accès SSH au serveur
- Base de données configurée (PostgreSQL/Supabase)
- Variables d'environnement prêtes

---

## 🚀 Étape 1 : Préparer le serveur

### 1.1 Installer Node.js et les dépendances

```bash
# Installer Node.js 20.x (LTS)
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo dnf install -y nodejs

# Vérifier l'installation
node --version
npm --version

# Installer PM2 pour gérer le processus
sudo npm install -g pm2

# Installer Git si pas déjà installé
sudo dnf install -y git
```

### 1.2 Installer PostgreSQL Client (si nécessaire)

```bash
# Si vous utilisez PostgreSQL local
sudo dnf install -y postgresql15
```

---

## 📦 Étape 2 : Transférer le projet

### Option A : Depuis Git (recommandé)

```bash
# Se placer dans le répertoire home
cd ~

# Cloner le projet (remplacez par votre URL Git)
git clone https://github.com/VOTRE_USERNAME/bbyatchv2-master.git
# OU si vous avez déjà le projet en local, utilisez Option B

cd bbyatchv2-master
```

### Option B : Depuis votre machine locale (via SCP)

Depuis votre machine Windows (PowerShell) :

```powershell
# Se placer dans le dossier du projet
cd C:\Users\lespcdewarren\Documents\dev\bbyatchv2-master

# Transférer le projet (remplacez par votre IP)
scp -i "bbyatch2.pem" -r . ec2-user@VOTRE_IP_PUBLIQUE:~/bbyatchv2-master
```

Puis sur le serveur :

```bash
cd ~/bbyatchv2-master
```

---

## ⚙️ Étape 3 : Configuration de l'environnement

### 3.1 Créer le fichier .env

```bash
# Créer le fichier .env
nano .env
```

Collez vos variables d'environnement (exemple) :

```env
# Database
DATABASE_URL="postgresql://user:password@host:5432/database"

# NextAuth
NEXTAUTH_URL="https://votre-domaine.com"
NEXTAUTH_SECRET="votre-secret-tres-long-et-aleatoire"

# Stripe
STRIPE_SECRET_KEY="sk_live_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_live_..."

# SMTP (pour les emails)
SMTP_HOST="smtp.example.com"
SMTP_PORT=587
SMTP_USER="noreply@example.com"
SMTP_PASSWORD="votre-mot-de-passe"

# Autres variables nécessaires
```

### 3.2 Sécuriser le fichier .env

```bash
# Restreindre les permissions
chmod 600 .env
```

---

## 🗄️ Étape 4 : Configuration de la base de données

### 4.1 Installer Prisma et pousser le schéma

```bash
# Installer les dépendances
npm install

# Générer le client Prisma
npx prisma generate

# Pousser le schéma vers la base de données
npm run db:push

# (Optionnel) Exécuter les seeds
npm run db:seed
```

---

## 🏗️ Étape 5 : Build et démarrage

### 5.1 Build de l'application

```bash
# Build de production
npm run build
```

### 5.2 Démarrer avec PM2

```bash
# Créer un fichier de configuration PM2
nano ecosystem.config.js
```

Contenu :

```javascript
module.exports = {
  apps: [{
    name: 'bbyatchv2',
    script: 'npm',
    args: 'start',
    cwd: '/home/ec2-user/bbyatchv2-master',
    env: {
      NODE_ENV: 'production',
      PORT: 3003
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    max_memory_restart: '1G',
    instances: 1,
    exec_mode: 'fork'
  }]
};
```

```bash
# Créer le dossier de logs
mkdir -p logs

# Démarrer avec PM2
pm2 start ecosystem.config.js

# Sauvegarder la configuration PM2
pm2 save

# Configurer PM2 pour démarrer au boot
pm2 startup
# Exécutez la commande affichée (commence par sudo)

# Vérifier le statut
pm2 status
pm2 logs bbyatchv2
```

---

## 🌐 Étape 6 : Configuration Nginx (reverse proxy)

### 6.1 Installer Nginx

```bash
sudo dnf install -y nginx
```

### 6.2 Configurer Nginx

```bash
# Créer la configuration
sudo nano /etc/nginx/conf.d/bbyatchv2.conf
```

Contenu :

```nginx
server {
    listen 80;
    server_name votre-domaine.com www.votre-domaine.com;

    # Redirection HTTPS (si vous avez un certificat SSL)
    # return 301 https://$server_name$request_uri;

    location / {
        proxy_pass http://localhost:3003;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 6.3 Démarrer Nginx

```bash
# Tester la configuration
sudo nginx -t

# Démarrer et activer Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Vérifier le statut
sudo systemctl status nginx
```

### 6.4 Mettre à jour les règles iptables (si nécessaire)

```bash
# Les ports 80 et 443 devraient déjà être ouverts
sudo iptables -L -n -v | grep -E "80|443"
```

---

## 🔒 Étape 7 : Configuration SSL (Let's Encrypt)

### 7.1 Installer Certbot

```bash
sudo dnf install -y certbot python3-certbot-nginx
```

### 7.2 Obtenir le certificat SSL

```bash
# Remplacer par votre domaine
sudo certbot --nginx -d votre-domaine.com -d www.votre-domaine.com

# Suivre les instructions
# Certbot configurera automatiquement Nginx
```

### 7.3 Renouvellement automatique

```bash
# Vérifier le renouvellement automatique
sudo systemctl status certbot-renew.timer

# Tester le renouvellement
sudo certbot renew --dry-run
```

---

## 🔄 Étape 8 : Mises à jour et maintenance

### 8.1 Mettre à jour le projet

```bash
cd ~/bbyatchv2-master

# Récupérer les dernières modifications
git pull

# Installer les nouvelles dépendances
npm install

# Régénérer Prisma si nécessaire
npx prisma generate

# Rebuild
npm run build

# Redémarrer PM2
pm2 restart bbyatchv2
```

### 8.2 Commandes PM2 utiles

```bash
# Voir les logs
pm2 logs bbyatchv2

# Redémarrer
pm2 restart bbyatchv2

# Arrêter
pm2 stop bbyatchv2

# Voir les statistiques
pm2 monit

# Voir tous les processus
pm2 list
```

---

## 🐛 Dépannage

### Vérifier les logs

```bash
# Logs PM2
pm2 logs bbyatchv2

# Logs Nginx
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log

# Logs système
sudo journalctl -u nginx -f
```

### Vérifier que l'application écoute

```bash
# Vérifier le port 3003
sudo netstat -tlnp | grep 3003
# OU
sudo ss -tlnp | grep 3003
```

### Redémarrer les services

```bash
# Redémarrer PM2
pm2 restart all

# Redémarrer Nginx
sudo systemctl restart nginx

# Redémarrer l'application
cd ~/bbyatchv2-master
pm2 restart bbyatchv2
```

---

## ✅ Checklist de déploiement

- [ ] Node.js 20.x installé
- [ ] PM2 installé et configuré
- [ ] Projet transféré sur le serveur
- [ ] Fichier .env configuré avec toutes les variables
- [ ] Base de données connectée et schéma poussé
- [ ] Application buildée (`npm run build`)
- [ ] PM2 démarre l'application
- [ ] Nginx configuré et fonctionnel
- [ ] Ports 80 et 443 ouverts dans iptables
- [ ] SSL configuré (Let's Encrypt)
- [ ] Application accessible via le domaine
- [ ] Monitoring en place (PM2 + logs)

---

## 📞 Support

En cas de problème :
1. Vérifier les logs PM2 : `pm2 logs bbyatchv2`
2. Vérifier les logs Nginx : `sudo tail -f /var/log/nginx/error.log`
3. Vérifier que l'application écoute : `sudo ss -tlnp | grep 3003`
4. Vérifier les règles iptables : `sudo iptables -L -n -v`

---

**Dernière mise à jour : 30 janvier 2026**