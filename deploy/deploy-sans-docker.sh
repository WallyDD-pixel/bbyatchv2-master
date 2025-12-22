#!/bin/bash

# Script de déploiement SANS Docker - PostgreSQL installé directement
# Usage: bash deploy/deploy-sans-docker.sh

set -e

echo "🚀 Démarrage du déploiement de bbyatchv2 (sans Docker)..."

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
echo -e "${YELLOW}[1/9] Vérification des prérequis...${NC}"

# Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}✗ Node.js n'est pas installé${NC}"
    exit 1
fi
NODE_VERSION=$(node -v)
echo -e "${GREEN}✓ Node.js $NODE_VERSION${NC}"

# NPM
if ! command -v npm &> /dev/null; then
    echo -e "${RED}✗ NPM n'est pas installé${NC}"
    exit 1
fi
echo -e "${GREEN}✓ NPM installé${NC}"

# PM2
if ! command -v pm2 &> /dev/null; then
    echo -e "${YELLOW}⚠ PM2 n'est pas installé, installation...${NC}"
    sudo npm install -g pm2
fi
echo -e "${GREEN}✓ PM2 installé${NC}"

# Nginx
if ! command -v nginx &> /dev/null; then
    echo -e "${RED}✗ Nginx n'est pas installé${NC}"
    echo "Installez Nginx: sudo apt update && sudo apt install -y nginx"
    exit 1
fi
echo -e "${GREEN}✓ Nginx installé${NC}"

# PostgreSQL
if ! command -v psql &> /dev/null; then
    echo -e "${YELLOW}⚠ PostgreSQL n'est pas installé, installation...${NC}"
    sudo apt update
    sudo apt install -y postgresql postgresql-contrib
    sudo systemctl start postgresql
    sudo systemctl enable postgresql
fi
echo -e "${GREEN}✓ PostgreSQL installé${NC}"

# 2. Vérifier que le projet est présent
echo -e "${YELLOW}[2/9] Vérification du projet...${NC}"
if [ ! -d "$APP_DIR" ]; then
    echo -e "${RED}✗ Le dossier $APP_DIR n'existe pas${NC}"
    exit 1
fi
cd "$APP_DIR"
echo -e "${GREEN}✓ Projet trouvé dans $APP_DIR${NC}"

# 3. Installer les dépendances
echo -e "${YELLOW}[3/9] Installation des dépendances npm...${NC}"

# Vérifier la mémoire disponible
AVAIL_MEM=$(free -m | awk '/^Mem:/{print $7}')
echo "Mémoire disponible: ${AVAIL_MEM}MB"

export NODE_OPTIONS="--max-old-space-size=512"

# Installer esbuild d'abord avec binaire précompilé
echo "Installation d'esbuild avec binaire précompilé..."
npm install esbuild@latest --save-dev --legacy-peer-deps --no-audit --prefer-offline 2>&1 | grep -v "npm warn" || true

# Installer le reste
echo "Installation des autres dépendances..."
if [ -f "package-lock.json" ]; then
    npm ci --prefer-offline --no-audit --legacy-peer-deps --ignore-scripts 2>&1 | grep -v "npm warn" || \
    npm install --prefer-offline --no-audit --legacy-peer-deps --ignore-scripts 2>&1 | grep -v "npm warn" || true
else
    npm install --prefer-offline --no-audit --legacy-peer-deps --ignore-scripts 2>&1 | grep -v "npm warn" || true
fi

npm rebuild 2>&1 | grep -v "npm warn" || true
echo -e "${GREEN}✓ Dépendances installées${NC}"

# 4. Configurer PostgreSQL
echo -e "${YELLOW}[4/9] Configuration de PostgreSQL...${NC}"

# Vérifier si la base existe
if sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw bbyatch_preprod; then
    echo -e "${GREEN}✓ Base de données existe déjà${NC}"
else
    echo "Création de la base de données..."
    sudo -u postgres psql << EOF
CREATE USER bbyatch WITH PASSWORD 'change_me_strong';
CREATE DATABASE bbyatch_preprod OWNER bbyatch;
GRANT ALL PRIVILEGES ON DATABASE bbyatch_preprod TO bbyatch;
\q
EOF
    echo -e "${GREEN}✓ Base de données créée${NC}"
fi

# Vérifier/Créer le fichier .env
echo -e "${YELLOW}[5/9] Configuration du fichier .env...${NC}"
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠ Le fichier .env n'existe pas${NC}"
    echo "Création du fichier .env..."
    cat > .env << EOF
# Base de données PostgreSQL (installée directement, pas Docker)
DATABASE_URL="postgresql://bbyatch:change_me_strong@localhost:5432/bbyatch_preprod?schema=public"

# NextAuth
NEXTAUTH_URL="https://preprod.bbservicescharter.com"
NEXTAUTH_SECRET="$(openssl rand -base64 32)"

# Stripe (à remplir)
STRIPE_TEST_SK=""
STRIPE_WEBHOOK_SECRET=""

# Port de l'application
PORT=$PORT
EOF
    echo -e "${GREEN}✓ Fichier .env créé${NC}"
    echo -e "${YELLOW}⚠ IMPORTANT: Modifiez le fichier .env avec vos vraies valeurs!${NC}"
else
    # Vérifier que DATABASE_URL pointe vers PostgreSQL local (port 5432)
    if grep -q "localhost:5433" .env; then
        echo -e "${YELLOW}⚠ DATABASE_URL pointe vers Docker (port 5433), mise à jour vers PostgreSQL local...${NC}"
        sed -i 's/localhost:5433/localhost:5432/g' .env
        echo -e "${GREEN}✓ DATABASE_URL mis à jour${NC}"
    fi
    echo -e "${GREEN}✓ Fichier .env existant trouvé${NC}"
fi

# 6. Générer le client Prisma
echo -e "${YELLOW}[6/9] Génération du client Prisma...${NC}"
npx prisma generate
echo -e "${GREEN}✓ Client Prisma généré${NC}"

# 7. Appliquer les migrations
echo -e "${YELLOW}[7/9] Application des migrations de base de données...${NC}"
npx prisma migrate deploy
echo -e "${GREEN}✓ Migrations appliquées${NC}"

# 8. Build de l'application
echo -e "${YELLOW}[8/9] Build de l'application Next.js...${NC}"
npm run build
echo -e "${GREEN}✓ Build terminé${NC}"

# 9. Configurer Nginx
echo -e "${YELLOW}[9/9] Configuration de Nginx...${NC}"
NGINX_CONFIG="/etc/nginx/sites-available/bbyatchv2-preprod"
if [ ! -f "$NGINX_CONFIG" ]; then
    sudo cp deploy/nginx-preprod.conf "$NGINX_CONFIG"
    echo -e "${GREEN}✓ Configuration Nginx copiée${NC}"
fi

sudo ln -sf "$NGINX_CONFIG" /etc/nginx/sites-enabled/bbyatchv2-preprod
sudo nginx -t
sudo systemctl reload nginx
echo -e "${GREEN}✓ Nginx configuré et rechargé${NC}"

# 10. Démarrer l'application avec PM2
echo -e "${YELLOW}[10/9] Démarrage de l'application avec PM2...${NC}"

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

echo -e "${GREEN}✓ Application démarrée avec PM2${NC}"

# Vérifier que l'application fonctionne
echo "Attente du démarrage de l'application..."
sleep 5

MAX_RETRIES=10
RETRY=0
while [ $RETRY -lt $MAX_RETRIES ]; do
    if curl -f -s http://localhost:$PORT > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Application répond sur le port $PORT${NC}"
        break
    fi
    RETRY=$((RETRY + 1))
    if [ $RETRY -ge $MAX_RETRIES ]; then
        echo -e "${YELLOW}⚠ L'application ne répond pas après $MAX_RETRIES tentatives${NC}"
        echo "Vérifiez les logs: pm2 logs $APP_NAME"
    else
        sleep 2
    fi
done

# Résumé
echo ""
echo -e "${GREEN}✅ Déploiement terminé avec succès!${NC}"
echo ""
echo "Résumé:"
echo "  ✓ Dépendances installées"
echo "  ✓ Base de données PostgreSQL configurée (sans Docker)"
echo "  ✓ Migrations appliquées"
echo "  ✓ Application buildée"
echo "  ✓ Nginx configuré"
echo "  ✓ Application démarrée avec PM2 sur le port $PORT"
echo ""
echo "Commandes utiles:"
echo "  - Voir les logs: pm2 logs $APP_NAME"
echo "  - Voir le statut: pm2 status"
echo "  - Redémarrer: pm2 restart $APP_NAME"
echo ""
echo "⚠ N'oubliez pas de:"
echo "  1. Vérifier/configurer le fichier .env avec vos vraies valeurs"
echo "  2. Configurer le certificat SSL si nécessaire"
echo "  3. Vérifier que l'application fonctionne: https://preprod.bbservicescharter.com"

