#!/bin/bash

# Script pour redémarrer proprement l'application en tuant le port occupé si nécessaire

set -e

APP_NAME="bbyatchv2-preprod"
PORT=3010

echo "🔄 Redémarrage de l'application..."

# Couleurs
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# 1. Arrêter PM2
echo -e "${YELLOW}[1/5] Arrêt de PM2...${NC}"
pm2 stop "$APP_NAME" 2>/dev/null || true
pm2 delete "$APP_NAME" 2>/dev/null || true

# 2. Tuer tous les processus qui utilisent le port 3010
echo -e "${YELLOW}[2/5] Libération du port $PORT...${NC}"
if sudo lsof -ti:$PORT > /dev/null 2>&1; then
    echo -e "${YELLOW}Port $PORT occupé, libération...${NC}"
    sudo lsof -ti:$PORT | xargs sudo kill -9 2>/dev/null || true
    sleep 2
    echo -e "${GREEN}✓ Port libéré${NC}"
else
    echo -e "${GREEN}✓ Port déjà libre${NC}"
fi

# 3. Tuer tous les processus next-server au cas où
echo -e "${YELLOW}[3/5] Nettoyage des processus Node.js...${NC}"
sudo pkill -9 -f "next-server" 2>/dev/null || true
sleep 1

# 4. Vérifier que le port est vraiment libre
echo -e "${YELLOW}[4/5] Vérification finale du port...${NC}"
if sudo lsof -ti:$PORT > /dev/null 2>&1; then
    echo -e "${RED}✗ Le port $PORT est toujours occupé !${NC}"
    sudo lsof -i:$PORT
    exit 1
else
    echo -e "${GREEN}✓ Port $PORT confirmé libre${NC}"
fi

# 5. Redémarrer l'application
echo -e "${YELLOW}[5/5] Démarrage de l'application...${NC}"
cd ~/bbyatchv2-master
pm2 start ecosystem.config.cjs
pm2 save

echo ""
echo -e "${GREEN}✅ Application redémarrée avec succès!${NC}"
echo ""
echo "Statut:"
pm2 status
echo ""
echo "Pour voir les logs: pm2 logs $APP_NAME"

