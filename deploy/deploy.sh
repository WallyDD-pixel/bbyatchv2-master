#!/bin/bash

# Script de déploiement complet pour bbyatchv2
# Usage: bash deploy.sh

set -e

echo "🚀 Démarrage du déploiement de bbyatchv2..."

# Couleurs
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Variables
APP_DIR="$HOME/bbyatchv2-master"
DB_CONTAINER="bbyatchv2-preprod-db"
APP_NAME="bbyatchv2-preprod"
PORT=3010

# 1. Vérifier les prérequis
echo -e "${YELLOW}[1/10] Vérification des prérequis...${NC}"

# Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}✗ Node.js n'est pas installé${NC}"
    echo "Installez Node.js 20 LTS: curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt-get install -y nodejs"
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

# Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}✗ Docker n'est pas installé${NC}"
    echo "Installez Docker: curl -fsSL https://get.docker.com -o get-docker.sh && sudo sh get-docker.sh"
    exit 1
fi
echo -e "${GREEN}✓ Docker installé${NC}"

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
echo -e "${YELLOW}[2/10] Vérification du projet...${NC}"
if [ ! -d "$APP_DIR" ]; then
    echo -e "${RED}✗ Le dossier $APP_DIR n'existe pas${NC}"
    echo "Assurez-vous d'avoir transféré le projet sur le serveur"
    exit 1
fi
cd "$APP_DIR"
echo -e "${GREEN}✓ Projet trouvé dans $APP_DIR${NC}"

# 3. Installer les dépendances
echo -e "${YELLOW}[3/10] Installation des dépendances npm...${NC}"
npm ci
echo -e "${GREEN}✓ Dépendances installées${NC}"

# 4. Vérifier/Créer le fichier .env
echo -e "${YELLOW}[4/10] Configuration du fichier .env...${NC}"
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠ Le fichier .env n'existe pas${NC}"
    echo "Création du fichier .env..."
    cat > .env << EOF
# Base de données PostgreSQL (Docker)
DATABASE_URL="postgresql://bbyatch:change_me_strong@localhost:5433/bbyatch_preprod?schema=public"

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
    echo "Appuyez sur Entrée pour continuer..."
    read
else
    echo -e "${GREEN}✓ Fichier .env existant trouvé${NC}"
fi

# 5. Démarrer PostgreSQL avec Docker
echo -e "${YELLOW}[5/10] Démarrage de PostgreSQL...${NC}"
cd "$APP_DIR"
if docker ps -a --format '{{.Names}}' | grep -q "^${DB_CONTAINER}$"; then
    echo -e "${YELLOW}⚠ Container Docker existant trouvé, démarrage...${NC}"
    docker start "$DB_CONTAINER" 2>/dev/null || true
else
    echo "Création et démarrage du container PostgreSQL..."
    docker compose -f docker-compose.preprod.yml up -d
fi

# Attendre que PostgreSQL soit prêt
echo "Attente que PostgreSQL soit prêt..."
sleep 5
MAX_RETRIES=30
RETRY=0
while ! docker exec "$DB_CONTAINER" pg_isready -U bbyatch > /dev/null 2>&1; do
    RETRY=$((RETRY + 1))
    if [ $RETRY -ge $MAX_RETRIES ]; then
        echo -e "${RED}✗ PostgreSQL n'est pas prêt après $MAX_RETRIES tentatives${NC}"
        exit 1
    fi
    sleep 2
done
echo -e "${GREEN}✓ PostgreSQL est prêt${NC}"

# 6. Générer le client Prisma
echo -e "${YELLOW}[6/10] Génération du client Prisma...${NC}"
npx prisma generate
echo -e "${GREEN}✓ Client Prisma généré${NC}"

# 7. Appliquer les migrations
echo -e "${YELLOW}[7/10] Application des migrations de base de données...${NC}"
npx prisma migrate deploy
echo -e "${GREEN}✓ Migrations appliquées${NC}"

# 8. Build de l'application
echo -e "${YELLOW}[8/10] Build de l'application Next.js...${NC}"
npm run build
echo -e "${GREEN}✓ Build terminé${NC}"

# 9. Configurer Nginx
echo -e "${YELLOW}[9/10] Configuration de Nginx...${NC}"
NGINX_CONFIG="/etc/nginx/sites-available/bbyatchv2-preprod"
if [ ! -f "$NGINX_CONFIG" ]; then
    sudo cp deploy/nginx-preprod.conf "$NGINX_CONFIG"
    echo -e "${GREEN}✓ Configuration Nginx copiée${NC}"
else
    echo -e "${YELLOW}⚠ Configuration Nginx existante trouvée${NC}"
    read -p "Remplacer la configuration existante? (oui/non): " -n 3 -r
    echo
    if [[ $REPLY =~ ^[Oo][Uu][Ii]$ ]]; then
        sudo cp deploy/nginx-preprod.conf "$NGINX_CONFIG"
        echo -e "${GREEN}✓ Configuration Nginx remplacée${NC}"
    fi
fi

# Créer le lien symbolique
sudo ln -sf "$NGINX_CONFIG" /etc/nginx/sites-enabled/bbyatchv2-preprod

# Tester et recharger Nginx
sudo nginx -t
sudo systemctl reload nginx
echo -e "${GREEN}✓ Nginx configuré et rechargé${NC}"

# 10. Démarrer l'application avec PM2
echo -e "${YELLOW}[10/10] Démarrage de l'application avec PM2...${NC}"

# Créer le dossier logs si nécessaire
mkdir -p logs

# Arrêter l'application si elle tourne déjà
pm2 stop "$APP_NAME" 2>/dev/null || true
pm2 delete "$APP_NAME" 2>/dev/null || true

# Charger les variables d'environnement depuis .env
if [ -f .env ]; then
    echo -e "${YELLOW}⚠ Chargement des variables d'environnement depuis .env...${NC}"
    # Charger les variables d'environnement en évitant les commentaires et lignes vides
    set -a
    source .env
    set +a
fi

# S'assurer que PORT est défini
export PORT=${PORT:-3010}
echo -e "${GREEN}✓ PORT configuré: $PORT${NC}"

# Démarrer avec PM2
pm2 start ecosystem.config.cjs
pm2 save

# Configurer PM2 pour démarrer au boot (si pas déjà fait)
if ! pm2 startup | grep -q "already setup"; then
    echo -e "${YELLOW}⚠ Configuration de PM2 pour démarrer au boot...${NC}"
    pm2 startup | grep "sudo" | bash || true
fi

echo -e "${GREEN}✓ Application démarrée avec PM2${NC}"

# Attendre que l'application démarre
echo "Attente du démarrage de l'application..."
sleep 5

# Vérifier que l'application fonctionne
MAX_RETRIES=10
RETRY=0
while [ $RETRY -lt $MAX_RETRIES ]; do
    if curl -f -s http://localhost:$PORT > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Application répond sur le port $PORT${NC}"
        break
    fi
    RETRY=$((RETRY + 1))
    if [ $RETRY -ge $MAX_RETRIES ]; then
        echo -e "${RED}⚠ L'application ne répond pas après $MAX_RETRIES tentatives${NC}"
        echo "Vérifiez les logs avec: pm2 logs $APP_NAME"
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
echo "  ✓ Base de données PostgreSQL démarrée"
echo "  ✓ Migrations appliquées"
echo "  ✓ Application buildée"
echo "  ✓ Nginx configuré"
echo "  ✓ Application démarrée avec PM2 sur le port $PORT"
echo ""
echo "Commandes utiles:"
echo "  - Voir les logs: pm2 logs $APP_NAME"
echo "  - Voir le statut: pm2 status"
echo "  - Redémarrer: pm2 restart $APP_NAME"
echo "  - Arrêter: pm2 stop $APP_NAME"
echo ""
echo "⚠ N'oubliez pas de:"
echo "  1. Vérifier/configurer le fichier .env avec vos vraies valeurs"
echo "  2. Configurer le certificat SSL si nécessaire: sudo certbot --nginx -d preprod.bbservicescharter.com"
echo "  3. Vérifier que l'application fonctionne: https://preprod.bbservicescharter.com"
echo ""
echo "🔍 Vérification du statut:"
pm2 status "$APP_NAME"
echo ""
echo "📋 Pour voir les logs en temps réel:"
echo "   pm2 logs $APP_NAME --lines 50"

