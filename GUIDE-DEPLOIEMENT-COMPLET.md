# 🚀 GUIDE DE DÉPLOIEMENT COMPLET - NOUVELLE INSTANCE

## 📋 ÉTAPE 1 : CONNEXION SSH

### 1.1. Se connecter à l'instance

```bash
ssh -i "bbyatchv6.pem" ec2-user@VOTRE_IP_PUBLIQUE
```

### 1.2. Mettre à jour le système

```bash
sudo yum update -y
```

---

## 📋 ÉTAPE 2 : INSTALLER LES DÉPENDANCES

### 2.1. Installer Node.js 20

```bash
# Installer nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc

# Installer Node.js 20
nvm install 20
nvm use 20
nvm alias default 20

# Vérifier
node --version
npm --version
```

### 2.2. Installer PM2

```bash
npm install -g pm2
```

### 2.3. Installer nginx

```bash
sudo yum install nginx -y
sudo systemctl enable nginx
sudo systemctl start nginx
```

---

## 📋 ÉTAPE 3 : CONFIGURER LE SECURITY GROUP

### 3.1. Depuis CloudShell ou la console AWS

Ouvrir les ports suivants dans le Security Group de votre instance :

- **Port 22 (SSH)** : `0.0.0.0/0` ou votre IP uniquement
- **Port 80 (HTTP)** : `0.0.0.0/0`
- **Port 443 (HTTPS)** : `0.0.0.0/0`

### 3.2. Commandes AWS CLI (depuis CloudShell)

```bash
# Récupérer le Security Group ID
INSTANCE_ID="i-VOTRE-INSTANCE-ID"
SG_ID=$(aws ec2 describe-instances \
  --instance-ids $INSTANCE_ID \
  --region eu-north-1 \
  --query 'Reservations[0].Instances[0].SecurityGroups[0].GroupId' \
  --output text)

# Ouvrir les ports
aws ec2 authorize-security-group-ingress \
  --group-id $SG_ID \
  --protocol tcp \
  --port 22 \
  --cidr 0.0.0.0/0 \
  --region eu-north-1

aws ec2 authorize-security-group-ingress \
  --group-id $SG_ID \
  --protocol tcp \
  --port 80 \
  --cidr 0.0.0.0/0 \
  --region eu-north-1

aws ec2 authorize-security-group-ingress \
  --group-id $SG_ID \
  --protocol tcp \
  --port 443 \
  --cidr 0.0.0.0/0 \
  --region eu-north-1
```

---

## 📋 ÉTAPE 4 : CLONER LE PROJET

### 4.1. Installer Git

```bash
sudo yum install git -y
```

### 4.2. Cloner le repository

```bash
cd ~
git clone VOTRE_REPO_URL bbyatchv2-master
cd bbyatchv2-master
```

---

## 📋 ÉTAPE 5 : CONFIGURER L'ENVIRONNEMENT

### 5.1. Créer le fichier .env

```bash
nano .env
```

### 5.2. Ajouter les variables d'environnement

```env
DATABASE_URL="postgresql://user:password@host:5432/database"
NEXTAUTH_URL="https://preprod.bbservicescharter.com"
NEXTAUTH_SECRET="votre-secret-tres-long-et-aleatoire"
NEXT_PUBLIC_SUPABASE_URL="https://nbovypcvctbtwxflbkmh.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="votre-cle-anon"
SUPABASE_SERVICE_ROLE_KEY="votre-cle-service-role"
STRIPE_TEST_SK="sk_test_xxx"
STRIPE_WEBHOOK_SECRET="whsec_xxx"
NODE_ENV="production"
PORT=3003
```

### 5.3. Sauvegarder (Ctrl+X, puis Y, puis Enter)

---

## 📋 ÉTAPE 6 : INSTALLER LES DÉPENDANCES ET BUILD

### 6.1. Installer les dépendances

```bash
npm install --legacy-peer-deps
```

### 6.2. Configurer Prisma

```bash
npx prisma generate
npx prisma migrate deploy
```

### 6.3. Build l'application

```bash
npm run build
```

---

## 📋 ÉTAPE 7 : CONFIGURER PM2

### 7.1. Créer le dossier logs

```bash
mkdir -p logs
```

### 7.2. Démarrer avec PM2

```bash
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

### 7.3. Vérifier que ça fonctionne

```bash
pm2 list
pm2 logs bbyatch --lines 20
curl -I http://localhost:3003
```

---

## 📋 ÉTAPE 8 : CONFIGURER NGINX

### 8.1. Créer la configuration nginx

```bash
sudo nano /etc/nginx/conf.d/bbyatchv2.conf
```

### 8.2. Ajouter cette configuration

```nginx
# Redirection HTTP vers HTTPS
server {
    listen 80;
    server_name preprod.bbservicescharter.com;
    
    # Rediriger tout le trafic HTTP vers HTTPS
    return 301 https://$server_name$request_uri;
}

# Configuration HTTPS
server {
    server_name preprod.bbservicescharter.com;
    client_max_body_size 50M;

    # Servir les fichiers statiques directement depuis Next.js
    location /_next/static {
        proxy_pass http://localhost:3003;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

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
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/preprod.bbservicescharter.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/preprod.bbservicescharter.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
}
```

### 8.3. Tester la configuration

```bash
sudo nginx -t
```

### 8.4. Recharger nginx

```bash
sudo systemctl reload nginx
```

---

## 📋 ÉTAPE 9 : CONFIGURER SSL (CERTBOT)

### 9.1. Installer Certbot

```bash
sudo yum install certbot python3-certbot-nginx -y
```

### 9.2. Obtenir le certificat SSL

```bash
sudo certbot --nginx -d preprod.bbservicescharter.com
```

Suivez les instructions :
- Entrez votre email
- Acceptez les conditions
- Choisissez de rediriger HTTP vers HTTPS (option 2)

### 9.3. Vérifier le renouvellement automatique

```bash
sudo certbot renew --dry-run
```

---

## 📋 ÉTAPE 10 : VÉRIFICATIONS FINALES

### 10.1. Vérifier que tout fonctionne

```bash
# PM2
pm2 list
pm2 logs bbyatch --lines 10

# Application
curl -I http://localhost:3003

# Nginx
sudo systemctl status nginx
curl -I http://localhost

# HTTPS
curl -k -I https://localhost
```

### 10.2. Tester depuis l'extérieur

Depuis votre machine Windows :
- Ouvrez `https://preprod.bbservicescharter.com` dans votre navigateur
- Ou testez avec : `curl https://preprod.bbservicescharter.com`

---

## 📋 ÉTAPE 11 : CONFIGURER LE DNS

### 11.1. Mettre à jour le DNS

Dans votre gestionnaire DNS (Route 53, Cloudflare, etc.), créez ou mettez à jour l'enregistrement A :

```
Type: A
Name: preprod.bbservicescharter.com
Value: VOTRE_IP_PUBLIQUE_EC2
TTL: 300
```

### 11.2. Attendre la propagation DNS (5-10 minutes)

Vérifier avec :
```bash
nslookup preprod.bbservicescharter.com
```

---

## 🔧 COMMANDES UTILES

### Redémarrer l'application

```bash
pm2 restart bbyatch
```

### Voir les logs

```bash
pm2 logs bbyatch
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Redémarrer nginx

```bash
sudo systemctl restart nginx
```

### Vérifier l'état

```bash
pm2 status
sudo systemctl status nginx
```

---

## ✅ CHECKLIST FINALE

- [ ] Node.js 20 installé
- [ ] PM2 installé et configuré
- [ ] Nginx installé et configuré
- [ ] Ports 22, 80, 443 ouverts dans Security Group
- [ ] Fichier .env créé avec toutes les variables
- [ ] Dépendances installées (`npm install --legacy-peer-deps`)
- [ ] Prisma configuré (`prisma generate`, `prisma migrate deploy`)
- [ ] Build réussi (`npm run build`)
- [ ] PM2 démarre l'application (`pm2 start ecosystem.config.cjs`)
- [ ] Application répond sur localhost:3003
- [ ] Nginx redirige vers l'application
- [ ] Certificat SSL installé (Certbot)
- [ ] DNS configuré et propagé
- [ ] Site accessible depuis l'extérieur en HTTPS

---

## 🆘 EN CAS DE PROBLÈME

### L'application ne démarre pas

```bash
pm2 logs bbyatch --lines 50
pm2 restart bbyatch
```

### Nginx ne fonctionne pas

```bash
sudo nginx -t
sudo systemctl status nginx
sudo tail -50 /var/log/nginx/error.log
```

### Le site n'est pas accessible

1. Vérifier les ports dans Security Group
2. Vérifier le DNS : `nslookup preprod.bbservicescharter.com`
3. Vérifier les logs nginx : `sudo tail -f /var/log/nginx/access.log`
