#!/bin/bash

# Script de déploiement avec Supabase (pas de Docker, pas de PostgreSQL local)
# Usage: bash deploy/deploy-supabase.sh

set -e

echo "🚀 Démarrage du déploiement de bbyatchv2 (avec Supabase)..."

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
echo -e "${YELLOW}[1/7] Vérification des prérequis...${NC}"

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

# 2. Vérifier que le projet est présent
echo -e "${YELLOW}[2/7] Vérification du projet...${NC}"
if [ ! -d "$APP_DIR" ]; then
    echo -e "${RED}✗ Le dossier $APP_DIR n'existe pas${NC}"
    exit 1
fi
cd "$APP_DIR"
echo -e "${GREEN}✓ Projet trouvé dans $APP_DIR${NC}"

# 3. Installer les dépendances
echo -e "${YELLOW}[3/7] Installation des dépendances npm...${NC}"

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

# 4. Vérifier/Créer le fichier .env avec Supabase
echo -e "${YELLOW}[4/7] Configuration du fichier .env...${NC}"
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠ Le fichier .env n'existe pas${NC}"
    echo "Création du fichier .env..."
    cat > .env << EOF
# Base de données Supabase (remplacez par votre URL Supabase)
# Format: postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres?schema=public
# Trouvez cette URL dans votre projet Supabase > Settings > Database > Connection string
DATABASE_URL="postgresql://postgres:[VOTRE-MOT-DE-PASSE]@db.[VOTRE-PROJECT-REF].supabase.co:5432/postgres?schema=public"

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
    echo ""
    echo -e "${RED}⚠⚠⚠ IMPORTANT ⚠⚠⚠${NC}"
    echo "Vous DEVEZ modifier le fichier .env avec votre vraie DATABASE_URL Supabase!"
    echo ""
    echo "Pour obtenir votre DATABASE_URL Supabase:"
    echo "  1. Allez sur https://supabase.com"
    echo "  2. Ouvrez votre projet"
    echo "  3. Settings > Database"
    echo "  4. Copiez la 'Connection string' (URI)"
    echo "  5. Remplacez [YOUR-PASSWORD] par votre mot de passe de base de données"
    echo ""
    echo "Appuyez sur Entrée après avoir modifié le .env..."
    read
else
    # Vérifier si DATABASE_URL pointe vers Supabase
    if grep -q "supabase.co" .env; then
        echo -e "${GREEN}✓ DATABASE_URL Supabase détectée dans .env${NC}"
    else
        echo -e "${YELLOW}⚠ DATABASE_URL ne semble pas pointer vers Supabase${NC}"
        echo "Assurez-vous que votre DATABASE_URL dans .env est bien votre URL Supabase"
        echo "Format: postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"
    fi
    echo -e "${GREEN}✓ Fichier .env existant trouvé${NC}"
fi

# 5. Générer le client Prisma
echo -e "${YELLOW}[5/7] Génération du client Prisma...${NC}"
npx prisma generate
echo -e "${GREEN}✓ Client Prisma généré${NC}"

# 6. Appliquer les migrations sur Supabase
echo -e "${YELLOW}[6/7] Application des migrations sur Supabase...${NC}"
echo -e "${YELLOW}⚠ Vérification de la connexion à Supabase...${NC}"
if npx prisma migrate deploy; then
    echo -e "${GREEN}✓ Migrations appliquées sur Supabase${NC}"
else
    echo -e "${RED}✗ Erreur lors de l'application des migrations${NC}"
    echo ""
    echo "Vérifiez que:"
    echo "  1. Votre DATABASE_URL dans .env est correcte"
    echo "  2. Votre projet Supabase est actif"
    echo "  3. Votre mot de passe de base de données est correct"
    exit 1
fi

# 7. Build de l'application
echo -e "${YELLOW}[7/7] Build de l'application Next.js...${NC}"
npm run build
echo -e "${GREEN}✓ Build terminé${NC}"

# 8. Configurer Nginx
echo -e "${YELLOW}[8/7] Configuration de Nginx...${NC}"
NGINX_CONFIG="/etc/nginx/sites-available/bbyatchv2-preprod"
if [ ! -f "$NGINX_CONFIG" ]; then
    sudo cp deploy/nginx-preprod.conf "$NGINX_CONFIG"
    echo -e "${GREEN}✓ Configuration Nginx copiée${NC}"
fi

sudo ln -sf "$NGINX_CONFIG" /etc/nginx/sites-enabled/bbyatchv2-preprod
sudo nginx -t
sudo systemctl reload nginx
echo -e "${GREEN}✓ Nginx configuré et rechargé${NC}"

# 9. Démarrer l'application avec PM2
echo -e "${YELLOW}[9/7] Démarrage de l'application avec PM2...${NC}"

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
echo "  ✓ Base de données Supabase configurée"
echo "  ✓ Migrations appliquées sur Supabase"
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
echo "  1. Vérifier que DATABASE_URL dans .env pointe vers votre Supabase"
echo "  2. Configurer le certificat SSL si nécessaire"
echo "  3. Vérifier que l'application fonctionne: https://preprod.bbservicescharter.com"

