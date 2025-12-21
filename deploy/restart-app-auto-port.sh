#!/bin/bash

# Script pour redémarrer l'application en trouvant automatiquement un port libre

set -e

APP_NAME="bbyatchv2-preprod"
BASE_PORT=3010
MAX_PORT_ATTEMPTS=5

echo "🔄 Redémarrage de l'application avec détection automatique de port..."

# Couleurs
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Fonction pour vérifier si un port est libre
is_port_free() {
    local port=$1
    ! sudo lsof -ti:$port > /dev/null 2>&1
}

# Fonction pour libérer un port
free_port() {
    local port=$1
    if ! is_port_free $port; then
        echo -e "${YELLOW}Libération du port $port...${NC}"
        sudo lsof -ti:$port | xargs sudo kill -9 2>/dev/null || true
        sleep 2
    fi
}

# Fonction pour trouver un port libre
find_free_port() {
    local start_port=$1
    local current_port=$start_port
    local attempts=0
    
    while [ $attempts -lt $MAX_PORT_ATTEMPTS ]; do
        if is_port_free $current_port; then
            echo $current_port
            return 0
        fi
        echo -e "${YELLOW}Port $current_port occupé, essai suivant...${NC}"
        current_port=$((current_port + 1))
        attempts=$((attempts + 1))
    done
    
    echo -e "${RED}Impossible de trouver un port libre après $MAX_PORT_ATTEMPTS tentatives${NC}"
    return 1
}

# 1. Arrêter PM2
echo -e "${YELLOW}[1/6] Arrêt de PM2...${NC}"
pm2 stop "$APP_NAME" 2>/dev/null || true
pm2 delete "$APP_NAME" 2>/dev/null || true

# 2. Libérer le port de base
echo -e "${YELLOW}[2/6] Libération du port $BASE_PORT...${NC}"
free_port $BASE_PORT

# 3. Tuer tous les processus next-server
echo -e "${YELLOW}[3/6] Nettoyage des processus Node.js...${NC}"
sudo pkill -9 -f "next-server" 2>/dev/null || true
sudo pkill -9 -f "next start" 2>/dev/null || true
sleep 2

# 4. Trouver un port libre
echo -e "${YELLOW}[4/6] Recherche d'un port libre...${NC}"
FREE_PORT=$(find_free_port $BASE_PORT)

if [ $? -ne 0 ]; then
    echo -e "${RED}✗ Impossible de trouver un port libre${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Port $FREE_PORT disponible${NC}"

# 5. Aller dans le répertoire du projet
echo -e "${YELLOW}[5/6] Configuration du port $FREE_PORT...${NC}"
cd ~/bbyatchv2-master

# 6. Démarrer l'application avec le port libre via variable d'environnement
echo -e "${YELLOW}[6/6] Démarrage de l'application sur le port $FREE_PORT...${NC}"
PORT=$FREE_PORT pm2 start ecosystem.config.cjs --update-env
pm2 save

# Sauvegarder le port utilisé dans un fichier pour référence
echo $FREE_PORT > ~/.bbyatchv2-port

echo ""
echo -e "${GREEN}✅ Application démarrée avec succès sur le port $FREE_PORT!${NC}"
echo ""
echo "Statut:"
pm2 status
echo ""
echo -e "${YELLOW}⚠️  IMPORTANT: Le port utilisé est $FREE_PORT${NC}"
if [ $FREE_PORT -ne $BASE_PORT ]; then
    echo -e "${YELLOW}⚠️  Le port a changé de $BASE_PORT à $FREE_PORT${NC}"
    echo -e "${YELLOW}⚠️  Vous devrez peut-être mettre à jour Nginx pour pointer vers le port $FREE_PORT${NC}"
fi
echo ""
echo "Pour voir les logs: pm2 logs $APP_NAME"

