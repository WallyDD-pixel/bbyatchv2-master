#!/bin/bash

# Script pour résoudre le conflit de port 3010
# Usage: bash deploy/fix-port-conflict.sh

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

PORT=3010
APP_NAME="bbyatchv2-preprod"

echo -e "${YELLOW}🔧 Résolution du conflit de port $PORT...${NC}"

# 1. Arrêter toutes les instances PM2
echo -e "${YELLOW}[1/4] Arrêt de toutes les instances PM2...${NC}"
pm2 stop all 2>/dev/null || true
pm2 delete all 2>/dev/null || true
sleep 2
echo -e "${GREEN}✓ PM2 arrêté${NC}"

# 2. Trouver et tuer les processus utilisant le port 3010
echo -e "${YELLOW}[2/4] Recherche des processus utilisant le port $PORT...${NC}"
PIDS=$(sudo lsof -ti:$PORT 2>/dev/null || true)

if [ -n "$PIDS" ]; then
    echo "Processus trouvés: $PIDS"
    for PID in $PIDS; do
        echo "Arrêt du processus $PID..."
        sudo kill -9 $PID 2>/dev/null || true
    done
    sleep 2
    echo -e "${GREEN}✓ Processus arrêtés${NC}"
else
    echo -e "${GREEN}✓ Aucun processus trouvé sur le port $PORT${NC}"
fi

# 3. Vérifier que le port est libre
echo -e "${YELLOW}[3/4] Vérification que le port est libre...${NC}"
if sudo lsof -ti:$PORT > /dev/null 2>&1; then
    echo -e "${RED}✗ Le port $PORT est toujours utilisé${NC}"
    echo "Processus restants:"
    sudo lsof -i:$PORT
    exit 1
else
    echo -e "${GREEN}✓ Port $PORT est libre${NC}"
fi

# 4. Redémarrer l'application
echo -e "${YELLOW}[4/4] Redémarrage de l'application...${NC}"
cd ~/bbyatchv2-master

if [ -f .env ]; then
    set -a
    source .env
    set +a
fi

export PORT=${PORT:-3010}

pm2 start ecosystem.config.cjs
pm2 save

sleep 3

# Vérifier que ça fonctionne
if pm2 list | grep -q "$APP_NAME.*online"; then
    echo -e "${GREEN}✓ Application démarrée avec succès${NC}"
    pm2 status
else
    echo -e "${RED}✗ L'application ne démarre pas${NC}"
    echo "Logs:"
    pm2 logs $APP_NAME --lines 20 --nostream
    exit 1
fi

echo ""
echo -e "${GREEN}✅ Problème résolu!${NC}"
echo ""
echo "Vérifiez que l'application fonctionne:"
echo "  curl http://localhost:$PORT"
echo "  pm2 logs $APP_NAME"

