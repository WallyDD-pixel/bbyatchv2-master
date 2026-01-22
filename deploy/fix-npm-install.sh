#!/bin/bash

# Script pour réparer une installation npm corrompue
# Usage: bash deploy/fix-npm-install.sh

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}🔧 Réparation de l'installation npm...${NC}"

cd ~/bbyatchv2-master || exit 1

# 1. Arrêter PM2 si l'application tourne
echo -e "${YELLOW}[1/6] Arrêt de PM2...${NC}"
pm2 stop bbyatchv2-preprod 2>/dev/null || true
pm2 delete bbyatchv2-preprod 2>/dev/null || true
echo -e "${GREEN}✓ PM2 arrêté${NC}"

# 2. Supprimer node_modules et package-lock.json
echo -e "${YELLOW}[2/6] Suppression de node_modules et package-lock.json...${NC}"
rm -rf node_modules
rm -f package-lock.json
echo -e "${GREEN}✓ Fichiers supprimés${NC}"

# 3. Nettoyer le cache npm
echo -e "${YELLOW}[3/6] Nettoyage du cache npm...${NC}"
npm cache clean --force
echo -e "${GREEN}✓ Cache nettoyé${NC}"

# 4. Vérifier que package.json est valide
echo -e "${YELLOW}[4/6] Vérification de package.json...${NC}"
if node -e "JSON.parse(require('fs').readFileSync('package.json', 'utf8'))" 2>/dev/null; then
    echo -e "${GREEN}✓ package.json est valide${NC}"
else
    echo -e "${RED}✗ Erreur: package.json n'est pas valide${NC}"
    exit 1
fi

# 5. Réinstaller les dépendances
echo -e "${YELLOW}[5/6] Réinstallation des dépendances (cela peut prendre plusieurs minutes)...${NC}"
npm ci
echo -e "${GREEN}✓ Dépendances installées${NC}"

# 6. Build l'application
echo -e "${YELLOW}[6/6] Build de l'application...${NC}"
npm run build
echo -e "${GREEN}✓ Build terminé${NC}"

echo ""
echo -e "${GREEN}✅ Réparation terminée !${NC}"
echo ""
echo "Prochaines étapes:"
echo "  1. pm2 start npm --name bbyatchv2-preprod -- run start"
echo "  2. pm2 save"
echo "  3. pm2 logs bbyatchv2-preprod  # Vérifier les logs"
