#!/bin/bash

# Script pour corriger les problèmes d'installation npm
# Usage: bash deploy/fix-npm-install.sh

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

APP_DIR="$HOME/bbyatchv2-master"

echo -e "${YELLOW}🔧 Correction des problèmes d'installation npm...${NC}"

cd "$APP_DIR" || exit 1

# 1. Arrêter PM2 si l'app tourne
echo -e "${YELLOW}[1/6] Arrêt de l'application PM2...${NC}"
pm2 stop bbyatchv2-preprod 2>/dev/null || true
pm2 delete bbyatchv2-preprod 2>/dev/null || true
echo -e "${GREEN}✓ Application arrêtée${NC}"

# 2. Vérifier la mémoire
echo -e "${YELLOW}[2/6] Vérification de la mémoire...${NC}"
TOTAL_MEM=$(free -m | awk '/^Mem:/{print $2}')
AVAIL_MEM=$(free -m | awk '/^Mem:/{print $7}')
echo "Mémoire totale: ${TOTAL_MEM}MB"
echo "Mémoire disponible: ${AVAIL_MEM}MB"

if [ "$AVAIL_MEM" -lt 512 ]; then
    echo -e "${RED}⚠ Mémoire très faible! Libération de la mémoire...${NC}"
    sync
    echo 3 | sudo tee /proc/sys/vm/drop_caches > /dev/null 2>&1 || true
    sleep 2
    AVAIL_MEM=$(free -m | awk '/^Mem:/{print $7}')
    echo "Mémoire disponible après nettoyage: ${AVAIL_MEM}MB"
fi

# 3. Nettoyer le cache npm
echo -e "${YELLOW}[3/6] Nettoyage du cache npm...${NC}"
npm cache clean --force
echo -e "${GREEN}✓ Cache npm nettoyé${NC}"

# 4. Supprimer node_modules et package-lock.json
echo -e "${YELLOW}[4/6] Suppression de node_modules et package-lock.json...${NC}"
if [ -d "node_modules" ]; then
    echo "Suppression de node_modules (cela peut prendre du temps)..."
    rm -rf node_modules
    echo -e "${GREEN}✓ node_modules supprimé${NC}"
fi

if [ -f "package-lock.json" ]; then
    rm -f package-lock.json
    echo -e "${GREEN}✓ package-lock.json supprimé${NC}"
fi

# 5. Réinstaller avec npm install (plus tolérant que npm ci)
echo -e "${YELLOW}[5/6] Réinstallation des dépendances...${NC}"
export NODE_OPTIONS="--max-old-space-size=1024"

# Installer avec npm install au lieu de npm ci pour éviter les problèmes
if npm install --legacy-peer-deps --no-audit; then
    echo -e "${GREEN}✓ Dépendances installées${NC}"
else
    echo -e "${RED}✗ Échec de l'installation${NC}"
    echo ""
    echo "Vérifiez:"
    echo "  - Mémoire disponible: free -h"
    echo "  - Espace disque: df -h"
    echo "  - Logs npm: cat ~/.npm/_logs/$(ls -t ~/.npm/_logs/ | head -1)"
    exit 1
fi

# 6. Vérifier l'installation
echo -e "${YELLOW}[6/6] Vérification de l'installation...${NC}"
if [ -d "node_modules" ] && [ -d "node_modules/.bin" ]; then
    echo -e "${GREEN}✓ Installation vérifiée${NC}"
    echo ""
    echo "Vous pouvez maintenant relancer le déploiement:"
    echo "  bash deploy/deploy.sh"
else
    echo -e "${RED}✗ L'installation semble incomplète${NC}"
    exit 1
fi

