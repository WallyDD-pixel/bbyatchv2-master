# Configuration d'une nouvelle instance EC2

## 1. Installer les dépendances système

```bash
# Mettre à jour le système
sudo dnf update -y

# Installer git
sudo dnf install -y git

# Installer Node.js via nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20
nvm alias default 20

# Installer PM2 globalement
sudo npm install -g pm2

# Installer Nginx
sudo dnf install -y nginx

# Installer iptables (si nécessaire)
sudo dnf install -y iptables
```

## 2. Cloner le projet

```bash
cd ~
git clone https://github.com/WallyDD-pixel/bbyatchv2-master.git
cd bbyatchv2-master
```

## 3. Configurer l'environnement

```bash
# Créer le fichier .env
nano .env
```

Collez votre configuration (DATABASE_URL, NEXTAUTH_URL, etc.)

## 4. Installer les dépendances et build

```bash
# Installer les dépendances
npm install --legacy-peer-deps

# ⚠️ CRITIQUE : Vérifier immédiatement qu'il n'y a pas de malware
chmod +x verifier-apres-npm-install.sh
bash verifier-apres-npm-install.sh

# Si le script détecte des problèmes, NE PAS continuer !
# Identifier le package compromis et le supprimer avant de continuer

# Générer le client Prisma
npx prisma generate

# Build l'application
npm run build
```

## 5. Configurer PM2

```bash
# Créer le dossier logs
mkdir -p logs

# Démarrer avec PM2
pm2 start ecosystem.config.cjs

# Sauvegarder la configuration PM2
pm2 save

# Configurer PM2 pour démarrer au boot
pm2 startup
# Exécutez la commande affichée
```

## 6. Configurer Nginx

```bash
# Créer la configuration
sudo nano /etc/nginx/conf.d/bbyatchv2.conf
```

Collez cette configuration :

```nginx
server {
    listen 80;
    server_name preprod.bbservicescharter.com;

    client_max_body_size 50M;

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
}
```

```bash
# Tester la configuration
sudo nginx -t

# Démarrer Nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

## 7. Configurer SSL (Let's Encrypt)

```bash
# Installer Certbot
sudo dnf install -y certbot python3-certbot-nginx

# Obtenir le certificat
sudo certbot --nginx -d preprod.bbservicescharter.com --agree-tos -m votre-email@example.com --redirect
```

## 8. Sécuriser le serveur

```bash
# Configurer iptables
sudo iptables -F
sudo iptables -X
sudo iptables -P INPUT DROP
sudo iptables -P FORWARD DROP
sudo iptables -P OUTPUT ACCEPT
sudo iptables -A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
sudo iptables -A INPUT -i lo -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 22 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 80 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 443 -j ACCEPT

# Installer Fail2Ban
sudo dnf install -y fail2ban
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local
sudo systemctl start fail2ban
sudo systemctl enable fail2ban
```

## 9. Vérifier que tout fonctionne

```bash
# Vérifier PM2
pm2 status
pm2 logs bbyatch --lines 20

# Vérifier Nginx
sudo systemctl status nginx

# Tester localement
curl http://localhost:3003

# Vérifier depuis l'extérieur
curl http://preprod.bbservicescharter.com
```
