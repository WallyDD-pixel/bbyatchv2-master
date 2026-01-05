#!/bin/bash

# Script de déploiement SANS migrations Prisma (à appliquer depuis la machine locale)
# Usage: bash deploy/deploy-sans-migrations.sh

set -e

echo "🚀 Démarrage du déploiement de bbyatchv2 (sans migrations Prisma)..."

# Couleurs
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Variables
APP_DIR="$HOME/bbyatchv2-master"
APP_NAME="bbyatchv2-preprod"
PORT=3010

# 1. Vérifier les prérequis
echo -e "${YELLOW}[1/6] Vérification des prérequis...${NC}"

if ! command -v node &> /dev/null; then
    echo -e "${RED}✗ Node.js n'est pas installé${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Node.js $(node -v)${NC}"

if ! command -v npm &> /dev/null; then
    echo -e "${RED}✗ NPM n'est pas installé${NC}"
    exit 1
fi
echo -e "${GREEN}✓ NPM installé${NC}"

if ! command -v pm2 &> /dev/null; then
    echo -e "${YELLOW}⚠ PM2 n'est pas installé, installation...${NC}"
    sudo npm install -g pm2
fi
echo -e "${GREEN}✓ PM2 installé${NC}"

if ! command -v nginx &> /dev/null; then
    echo -e "${RED}✗ Nginx n'est pas installé${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Nginx installé${NC}"

# 2. Vérifier le projet
echo -e "${YELLOW}[2/6] Vérification du projet...${NC}"
cd "$APP_DIR" || exit 1
echo -e "${GREEN}✓ Projet trouvé${NC}"

# 3. Installer les dépendances
echo -e "${YELLOW}[3/6] Installation des dépendances npm...${NC}"

export NODE_OPTIONS="--max-old-space-size=512"

# Installer esbuild d'abord
npm install esbuild@latest --save-dev --legacy-peer-deps --no-audit --prefer-offline 2>&1 | grep -v "npm warn" || true

# Installer le reste
if [ -f "package-lock.json" ]; then
    npm ci --prefer-offline --no-audit --legacy-peer-deps --ignore-scripts 2>&1 | grep -v "npm warn" || \
    npm install --prefer-offline --no-audit --legacy-peer-deps --ignore-scripts 2>&1 | grep -v "npm warn" || true
else
    npm install --prefer-offline --no-audit --legacy-peer-deps --ignore-scripts 2>&1 | grep -v "npm warn" || true
fi

npm rebuild 2>&1 | grep -v "npm warn" || true
echo -e "${GREEN}✓ Dépendances installées${NC}"

# 4. Vérifier .env
echo -e "${YELLOW}[4/6] Vérification du fichier .env...${NC}"
if [ ! -f .env ]; then
    echo -e "${RED}✗ Fichier .env introuvable${NC}"
    exit 1
fi

if grep -q "supabase.co" .env; then
    echo -e "${GREEN}✓ DATABASE_URL Supabase détectée${NC}"
else
    echo -e "${YELLOW}⚠ DATABASE_URL ne semble pas pointer vers Supabase${NC}"
fi
echo -e "${GREEN}✓ Fichier .env trouvé${NC}"

# 5. Générer le client Prisma (sans migrations)
echo -e "${YELLOW}[5/6] Génération du client Prisma...${NC}"
echo -e "${YELLOW}⚠ Les migrations doivent être appliquées depuis votre machine locale${NC}"
npx prisma generate
echo -e "${GREEN}✓ Client Prisma généré${NC}"

# 6. Build de l'application
echo -e "${YELLOW}[6/6] Build de l'application Next.js...${NC}"
npm run build
echo -e "${GREEN}✓ Build terminé${NC}"

# 7. Configurer Nginx
echo -e "${YELLOW}[7/6] Configuration de Nginx...${NC}"
NGINX_CONFIG="/etc/nginx/sites-available/bbyatchv2-preprod"
if [ ! -f "$NGINX_CONFIG" ]; then
    sudo cp deploy/nginx-preprod.conf "$NGINX_CONFIG"
fi

sudo ln -sf "$NGINX_CONFIG" /etc/nginx/sites-enabled/bbyatchv2-preprod
sudo nginx -t
sudo systemctl reload nginx
echo -e "${GREEN}✓ Nginx configuré${NC}"

# 8. Démarrer avec PM2
echo -e "${YELLOW}[8/6] Démarrage avec PM2...${NC}"

mkdir -p logs

pm2 stop "$APP_NAME" 2>/dev/null || true
pm2 delete "$APP_NAME" 2>/dev/null || true

if [ -f .env ]; then
    set -a
    source .env
    set +a
fi

export PORT=${PORT:-3010}

pm2 start ecosystem.config.cjs
pm2 save

if ! pm2 startup | grep -q "already setup"; then
    pm2 startup | grep "sudo" | bash || true
fi

echo -e "${GREEN}✓ Application démarrée${NC}"

# Résumé
echo ""
echo -e "${GREEN}✅ Déploiement terminé!${NC}"
echo ""
echo -e "${YELLOW}⚠ IMPORTANT: Appliquez les migrations Prisma depuis votre machine locale:${NC}"
echo ""
echo "Sur votre machine Windows:"
echo "  1. cd C:\\Users\\lespcdewarren\\Documents\\dev\\bbyatchv2-master"
echo "  2. Assurez-vous que votre .env local pointe vers Supabase"
echo "  3. npx prisma migrate deploy"
echo ""
echo "Ou utilisez Supabase Dashboard > SQL Editor pour exécuter les migrations SQL"
echo ""
echo "Commandes utiles:"
echo "  pm2 logs $APP_NAME"
echo "  pm2 status"







