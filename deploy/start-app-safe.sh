#!/bin/bash

# Script pour démarrer l'application en toute sécurité (tue le port s'il est occupé)

set -e

APP_NAME="bbyatchv2-preprod"
PORT=3010

echo "🚀 Démarrage sécurisé de l'application..."

# Couleurs
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 1. Vérifier et libérer le port
echo -e "${YELLOW}Vérification du port $PORT...${NC}"
if sudo lsof -ti:$PORT > /dev/null 2>&1; then
    echo -e "${YELLOW}Port $PORT occupé, libération...${NC}"
    sudo lsof -ti:$PORT | xargs sudo kill -9 2>/dev/null || true
    sleep 2
fi

# 2. Arrêter PM2 si l'app tourne déjà
pm2 stop "$APP_NAME" 2>/dev/null || true
pm2 delete "$APP_NAME" 2>/dev/null || true

# 3. Démarrer l'application
cd ~/bbyatchv2-master
pm2 start ecosystem.config.cjs
pm2 save

echo -e "${GREEN}✅ Application démarrée!${NC}"
pm2 status

