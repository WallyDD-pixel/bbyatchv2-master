#!/bin/bash

# Script de nettoyage complet du serveur (version automatique sans confirmation)
# Usage: bash cleanup-server-auto.sh [CHEMIN_DOSSIER_APP]

set -e

APP_DIR=${1:-""}

echo "🧹 Démarrage du nettoyage automatique du serveur..."

# Couleurs pour les messages
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Arrêter et supprimer les processus PM2
echo -e "${YELLOW}[1/7] Arrêt et suppression des processus PM2...${NC}"
if command -v pm2 &> /dev/null; then
    pm2 stop all 2>/dev/null || true
    pm2 delete all 2>/dev/null || true
    pm2 delete bbyatchv2-preprod 2>/dev/null || true
    pm2 save --force 2>/dev/null || true
    echo -e "${GREEN}✓ PM2 nettoyé${NC}"
fi

# 2. Arrêter et supprimer les containers Docker
echo -e "${YELLOW}[2/7] Arrêt et suppression des containers Docker...${NC}"
if command -v docker &> /dev/null; then
    docker stop bbyatchv2-preprod-db 2>/dev/null || true
    docker rm bbyatchv2-preprod-db 2>/dev/null || true
    docker ps -a --filter "name=bbyatchv2" -q | xargs -r docker stop 2>/dev/null || true
    docker ps -a --filter "name=bbyatchv2" -q | xargs -r docker rm 2>/dev/null || true
    echo -e "${GREEN}✓ Containers Docker arrêtés et supprimés${NC}"
fi

# 3. Supprimer les volumes Docker
echo -e "${YELLOW}[3/7] Suppression des volumes Docker...${NC}"
if command -v docker &> /dev/null; then
    docker volume rm preprod_pg_data 2>/dev/null || true
    docker volume prune -f 2>/dev/null || true
    echo -e "${GREEN}✓ Volumes Docker supprimés${NC}"
fi

# 4. Supprimer les configurations Nginx
echo -e "${YELLOW}[4/7] Suppression des configurations Nginx...${NC}"
sudo rm -f /etc/nginx/sites-enabled/bbyatchv2-preprod 2>/dev/null || true
sudo rm -f /etc/nginx/sites-enabled/bbyatchv2 2>/dev/null || true
sudo rm -f /etc/nginx/sites-available/bbyatchv2-preprod 2>/dev/null || true
sudo rm -f /etc/nginx/sites-available/bbyatchv2 2>/dev/null || true

if command -v nginx &> /dev/null; then
    sudo nginx -t 2>/dev/null && sudo systemctl reload nginx 2>/dev/null || true
fi
echo -e "${GREEN}✓ Configurations Nginx supprimées${NC}"

# 5. Nettoyer les processus Node.js
echo -e "${YELLOW}[5/7] Nettoyage des processus Node.js...${NC}"
pkill -f "node.*bbyatchv2" 2>/dev/null || true
pkill -f "npm.*start" 2>/dev/null || true
echo -e "${GREEN}✓ Processus Node.js arrêtés${NC}"

# 6. Libérer les ports
echo -e "${YELLOW}[6/7] Libération des ports...${NC}"
if command -v lsof &> /dev/null; then
    sudo lsof -ti:3010 | xargs -r sudo kill -9 2>/dev/null || true
    sudo lsof -ti:3000 | xargs -r sudo kill -9 2>/dev/null || true
fi
echo -e "${GREEN}✓ Ports libérés${NC}"

# 7. Supprimer le dossier de l'application si fourni
if [ -n "$APP_DIR" ] && [ -d "$APP_DIR" ]; then
    echo -e "${YELLOW}[7/7] Suppression du dossier de l'application: $APP_DIR...${NC}"
    rm -rf "$APP_DIR"
    echo -e "${GREEN}✓ Dossier supprimé${NC}"
else
    echo -e "${YELLOW}[7/7] Pas de dossier à supprimer (aucun chemin fourni ou dossier inexistant)${NC}"
fi

# 8. Nettoyer le cache npm
npm cache clean --force 2>/dev/null || true

echo ""
echo -e "${GREEN}✅ Nettoyage terminé!${NC}"
echo ""
echo "Résumé:"
echo "  ✓ PM2: processus arrêtés"
echo "  ✓ Docker: containers et volumes supprimés"
echo "  ✓ Nginx: configurations supprimées"
echo "  ✓ Node.js: processus arrêtés"
echo "  ✓ Ports: libérés"
if [ -n "$APP_DIR" ] && [ -d "$APP_DIR" ]; then
    echo "  ✓ Application: dossier supprimé"
fi
echo ""
echo "Le serveur est maintenant propre et prêt pour une nouvelle installation."

