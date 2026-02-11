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

## 📊 MONITORING AVEC CLOUDSHELL

### Accéder à la console PM2 depuis AWS CloudShell

**⚠️ IMPORTANT :** PM2 n'est PAS installé sur CloudShell. Il est installé sur votre instance EC2. Vous devez d'abord vous connecter à l'instance EC2 via SSH.

#### 1. Trouver l'IP de votre instance EC2

Depuis CloudShell, exécutez ces commandes pour trouver votre instance :

```bash
# Lister toutes vos instances EC2 avec leur IP
aws ec2 describe-instances \
  --region eu-north-1 \
  --query 'Reservations[*].Instances[*].[InstanceId,State.Name,PublicIpAddress,Tags[?Key==`Name`].Value|[0]]' \
  --output table

# Ou si vous connaissez le nom de votre instance (ex: preprod)
aws ec2 describe-instances \
  --region eu-north-1 \
  --filters "Name=tag:Name,Values=*preprod*" \
  --query 'Reservations[*].Instances[*].[InstanceId,State.Name,PublicIpAddress]' \
  --output table
```

Notez l'**IP publique** (PublicIpAddress) de votre instance.

#### 2. Télécharger/Uploader la clé SSH dans CloudShell

**Option A : Si la clé est dans S3**
```bash
aws s3 cp s3://votre-bucket/bbyatchv6.pem ~/bbyatchv6.pem
chmod 400 ~/bbyatchv6.pem
```

**Option B : Uploader la clé depuis votre machine**
- Dans CloudShell, cliquez sur l'icône **Actions** (menu hamburger) → **Upload file**
- Sélectionnez votre fichier `bbyatchv6.pem`
- Ensuite : `chmod 400 ~/bbyatchv6.pem`

**Option C : Si vous n'avez pas la clé, utilisez AWS Systems Manager Session Manager**
```bash
# Trouver l'Instance ID
INSTANCE_ID=$(aws ec2 describe-instances \
  --region eu-north-1 \
  --filters "Name=tag:Name,Values=*preprod*" \
  --query 'Reservations[0].Instances[0].InstanceId' \
  --output text)

# Se connecter via Session Manager (sans clé SSH)
aws ssm start-session --target $INSTANCE_ID --region eu-north-1
```

#### 3. Se connecter à l'instance EC2

```bash
# Remplacer 13.53.121.224 par l'IP de VOTRE instance (trouvée à l'étape 1)
ssh -i ~/bbyatchv6.pem ec2-user@13.53.121.224

# Si vous utilisez ubuntu au lieu de ec2-user :
# ssh -i ~/bbyatchv6.pem ubuntu@13.53.121.224
```

#### 4. Une fois connecté à l'instance, naviguer vers le projet

```bash
# Aller dans le dossier du projet
cd ~/bbyatchv2-master

# OU si le projet est dans /home/ubuntu
cd /home/ubuntu/bbyatchv2-master
```

#### 5. Utiliser PM2 pour monitorer

```bash
# Voir l'état des processus PM2
pm2 list

# Monitorer en temps réel (CPU, mémoire, logs) - Interface graphique
pm2 monit

# Voir les logs en temps réel
pm2 logs bbyatch

# Voir les logs des 50 dernières lignes
pm2 logs bbyatch --lines 50

# Voir les statistiques détaillées
pm2 show bbyatch

# Voir les métriques (JSON)
pm2 jlist
```

#### 6. Commandes PM2 utiles pour le monitoring

```bash
# Statut rapide
pm2 status

# Informations détaillées sur un processus
pm2 describe bbyatch

# Voir l'utilisation des ressources (interface graphique)
pm2 monit

# Logs avec filtrage
pm2 logs bbyatch --err   # Seulement les erreurs
pm2 logs bbyatch --out   # Seulement la sortie standard

# Redémarrer et voir les logs
pm2 restart bbyatch && pm2 logs bbyatch --lines 20

# Voir l'historique des redémarrages
pm2 info bbyatch
```

#### 7. Quitter le monitoring

- Pour quitter `pm2 monit` : appuyez sur `Ctrl+C`
- Pour quitter la session SSH : tapez `exit`
- Pour revenir à CloudShell : tapez `exit` une fois de plus

#### 8. Script rapide pour trouver et se connecter

Copiez-collez ce script dans CloudShell pour automatiser :

```bash
# Trouver l'instance et se connecter automatiquement
REGION="eu-north-1"
INSTANCE_IP=$(aws ec2 describe-instances \
  --region $REGION \
  --filters "Name=tag:Name,Values=*preprod*" "Name=instance-state-name,Values=running" \
  --query 'Reservations[0].Instances[0].PublicIpAddress' \
  --output text)

if [ -z "$INSTANCE_IP" ] || [ "$INSTANCE_IP" == "None" ]; then
  echo "❌ Aucune instance trouvée ou instance arrêtée"
  echo "Vérifiez que votre instance est démarrée dans la console AWS"
else
  echo "✅ Instance trouvée : $INSTANCE_IP"
  echo "Connexion en cours..."
  ssh -i ~/bbyatchv6.pem ec2-user@$INSTANCE_IP
fi
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

### 🚨 URGENCE : MALWARE XMRIG DÉTECTÉ (Out of Memory)

**Symptômes :** Votre serveur manque de mémoire et un processus `xmrig` (mineur de cryptomonnaie) consomme toute la RAM.

**Actions IMMÉDIATES à exécuter dans CloudShell puis sur l'instance :**

#### Étape 1 : Se connecter à l'instance

```bash
# Depuis CloudShell, trouver l'IP
INSTANCE_IP=$(aws ec2 describe-instances \
  --region eu-north-1 \
  --filters "Name=tag:Name,Values=*preprod*" "Name=instance-state-name,Values=running" \
  --query 'Reservations[0].Instances[0].PublicIpAddress' \
  --output text)

# Se connecter
ssh -i ~/bbyatchv7.pem ec2-user@$INSTANCE_IP
```

#### Étape 2 : Arrêter immédiatement le malware

```bash
# Tuer le processus xmrig
sudo pkill -9 xmrig

# Arrêter le service malveillant
sudo systemctl stop moneroocean_miner.service 2>/dev/null || true
sudo systemctl disable moneroocean_miner.service 2>/dev/null || true

# Vérifier qu'il est arrêté
ps aux | grep -E "(xmrig|moneroocean)" | grep -v grep
```

#### Étape 3 : Nettoyer complètement le malware

```bash
# Aller dans le projet
cd ~/bbyatchv2-master

# Exécuter le script de nettoyage
bash cleanup-malware-complete.sh

# OU nettoyer manuellement :
# Supprimer le service
sudo rm -f /etc/systemd/system/moneroocean_miner.service
sudo rm -f /usr/lib/systemd/system/moneroocean_miner.service
sudo systemctl daemon-reload

# Supprimer les fichiers
sudo rm -rf /tmp/xmrig* /tmp/moneroocean* /var/tmp/xmrig* /var/tmp/moneroocean*
sudo rm -rf ~/xmrig* ~/moneroocean* ~/miner*

# Vérifier les crontabs
crontab -l | grep -E "(xmrig|moneroocean|miner)" && echo "⚠️ CRONTAB SUSPECT TROUVÉ !"
sudo crontab -l | grep -E "(xmrig|moneroocean|miner)" && echo "⚠️ CRONTAB ROOT SUSPECT TROUVÉ !"
```

#### Étape 4 : Limiter la mémoire de Next.js pour éviter OOM

Modifier `ecosystem.config.cjs` pour limiter la mémoire :

```bash
cd ~/bbyatchv2-master
nano ecosystem.config.cjs
```

Ajouter dans la configuration PM2 :
```javascript
max_memory_restart: '2G',  // Limiter à 2GB
node_args: '--max-old-space-size=2048',  // Limiter Node.js à 2GB
```

#### Étape 5 : Redémarrer l'application proprement

```bash
# Arrêter PM2
pm2 stop all
pm2 delete all

# Redémarrer
pm2 start ecosystem.config.cjs
pm2 save

# Vérifier
pm2 list
pm2 monit
```

#### Étape 6 : Vérifier la mémoire disponible

```bash
# Voir l'utilisation de la mémoire
free -h

# Surveiller en temps réel
watch -n 2 free -h
```

#### Étape 7 : Sécuriser le serveur (après nettoyage)

```bash
# Changer tous les mots de passe
passwd

# Vérifier les clés SSH autorisées
cat ~/.ssh/authorized_keys

# Vérifier les connexions récentes
sudo lastlog

# Installer fail2ban pour protéger SSH
sudo yum install fail2ban -y
sudo systemctl enable fail2ban
sudo systemctl start fail2ban

# Limiter l'accès SSH (remplacer YOUR_IP par votre IP)
sudo ufw allow from YOUR_IP to any port 22
sudo ufw enable
```

#### Étape 8 : Surveiller régulièrement

```bash
# Vérifier les processus suspects
ps aux | grep -E "(xmrig|moneroocean|miner)" | grep -v grep

# Vérifier la mémoire
free -h

# Vérifier les services systemd suspects
systemctl list-units --type=service | grep -E "(xmrig|miner|moneroocean)"
```

**Si le problème persiste :**
- Augmenter la taille de l'instance (t3.medium → t3.large ou t3.xlarge)
- Ou optimiser l'application Next.js pour consommer moins de mémoire

### ❌ Problème de connexion SSH depuis Windows

Si vous obtenez des erreurs comme `Connection timed out` ou `Permission denied` :

#### Solution 1 : Utiliser CloudShell (RECOMMANDÉ)

Au lieu de vous connecter depuis Windows, utilisez AWS CloudShell :

1. **Ouvrir CloudShell** dans la console AWS
2. **Trouver l'IP de votre instance** :
```bash
aws ec2 describe-instances \
  --region eu-north-1 \
  --query 'Reservations[*].Instances[*].[InstanceId,State.Name,PublicIpAddress,Tags[?Key==`Name`].Value|[0]]' \
  --output table
```

3. **Uploader votre clé SSH** dans CloudShell :
   - Cliquez sur **Actions** (menu ☰) → **Upload file**
   - Sélectionnez `bbyatchv7.pem`
   - Puis : `chmod 400 ~/bbyatchv7.pem`

4. **Se connecter** :
```bash
# Utiliser l'IP publique (pas le hostname)
ssh -i ~/bbyatchv7.pem ec2-user@16.16.233.211
```

#### Solution 2 : Vérifier le Security Group depuis CloudShell

```bash
# Trouver l'Instance ID
INSTANCE_ID=$(aws ec2 describe-instances \
  --region eu-north-1 \
  --filters "Name=ip-address,Values=16.16.233.211" \
  --query 'Reservations[0].Instances[0].InstanceId' \
  --output text)

# Récupérer le Security Group
SG_ID=$(aws ec2 describe-instances \
  --instance-ids $INSTANCE_ID \
  --region eu-north-1 \
  --query 'Reservations[0].Instances[0].SecurityGroups[0].GroupId' \
  --output text)

# Vérifier les règles SSH
aws ec2 describe-security-groups \
  --group-ids $SG_ID \
  --region eu-north-1 \
  --query 'SecurityGroups[0].IpPermissions[?FromPort==`22`]' \
  --output table

# Si pas de règle SSH, l'ajouter
aws ec2 authorize-security-group-ingress \
  --group-id $SG_ID \
  --protocol tcp \
  --port 22 \
  --cidr 0.0.0.0/0 \
  --region eu-north-1
```

#### Solution 3 : Utiliser AWS Systems Manager (sans clé SSH)

Si SSH ne fonctionne toujours pas, utilisez Session Manager :

```bash
# Depuis CloudShell
INSTANCE_ID=$(aws ec2 describe-instances \
  --region eu-north-1 \
  --filters "Name=ip-address,Values=16.16.233.211" \
  --query 'Reservations[0].Instances[0].InstanceId' \
  --output text)

# Se connecter via Session Manager
aws ssm start-session --target $INSTANCE_ID --region eu-north-1
```

**Note :** Pour utiliser Session Manager, l'instance doit avoir le SSM Agent installé (généralement pré-installé sur les AMI Amazon Linux).

#### Solution 4 : Vérifier depuis Windows PowerShell

Si vous voulez quand même utiliser Windows :

1. **Vérifier les permissions de la clé** :
```powershell
# Dans PowerShell (en tant qu'administrateur)
icacls "C:\Users\lespcdewarren\Documents\dev\bbyatchv2-master\bbyatchv7.pem" /inheritance:r
icacls "C:\Users\lespcdewarren\Documents\dev\bbyatchv2-master\bbyatchv7.pem" /grant:r "%USERNAME%:R"
```

2. **Utiliser l'IP au lieu du hostname** :
```powershell
# Utiliser l'IP directement
ssh -i "bbyatchv7.pem" ec2-user@16.16.233.211
```

3. **Vérifier que le port 22 est accessible** :
```powershell
Test-NetConnection -ComputerName 16.16.233.211 -Port 22
```

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
