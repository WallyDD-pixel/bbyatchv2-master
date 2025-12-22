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

# 5. Vérifier/Créer un swap si nécessaire
echo -e "${YELLOW}[5/7] Vérification du swap...${NC}"
SWAP_TOTAL=$(free -m | awk '/^Swap:/{print $2}')
if [ "$SWAP_TOTAL" -eq 0 ] && [ "$AVAIL_MEM" -lt 1024 ]; then
    echo -e "${YELLOW}⚠ Pas de swap détecté. Création d'un swap de 1GB...${NC}"
    if [ ! -f /swapfile ]; then
        sudo fallocate -l 1G /swapfile 2>/dev/null || sudo dd if=/dev/zero of=/swapfile bs=1M count=1024 2>/dev/null
        sudo chmod 600 /swapfile
        sudo mkswap /swapfile
        sudo swapon /swapfile
        if ! grep -q "/swapfile" /etc/fstab; then
            echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
        fi
        echo -e "${GREEN}✓ Swap créé et activé${NC}"
        sleep 2
    fi
else
    echo -e "${GREEN}✓ Swap disponible: ${SWAP_TOTAL}MB${NC}"
fi

# 6. Réinstaller avec npm install (plus tolérant que npm ci)
echo -e "${YELLOW}[6/7] Réinstallation des dépendances...${NC}"
export NODE_OPTIONS="--max-old-space-size=1024"

# Installer avec npm install au lieu de npm ci pour éviter les problèmes
echo "Installation en cours (cela peut prendre plusieurs minutes avec peu de mémoire)..."
if npm install --legacy-peer-deps --no-audit 2>&1 | tee /tmp/npm-install.log; then
    echo -e "${GREEN}✓ Dépendances installées${NC}"
else
    echo -e "${RED}✗ Échec de l'installation${NC}"
    echo ""
    echo "Le problème persiste. Solutions:"
    echo ""
    echo "1. Créer un swap plus grand:"
    echo "   bash deploy/create-swap.sh 2"
    echo ""
    echo "2. Vérifier la mémoire:"
    echo "   free -h"
    echo ""
    echo "3. Vérifier les logs:"
    echo "   tail -50 /tmp/npm-install.log"
    echo ""
    echo "4. Essayer d'installer esbuild séparément:"
    echo "   bash deploy/install-esbuild-separately.sh"
    exit 1
fi

# 7. Vérifier l'installation
echo -e "${YELLOW}[7/7] Vérification de l'installation...${NC}"
if [ -d "node_modules" ] && [ -d "node_modules/.bin" ]; then
    echo -e "${GREEN}✓ Installation vérifiée${NC}"
    echo ""
    echo "Vous pouvez maintenant relancer le déploiement:"
    echo "  bash deploy/deploy.sh"
else
    echo -e "${RED}✗ L'installation semble incomplète${NC}"
    exit 1
fi

