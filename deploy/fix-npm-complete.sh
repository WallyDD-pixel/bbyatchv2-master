#!/bin/bash

# Script complet pour réparer une installation npm corrompue
# Usage: bash deploy/fix-npm-complete.sh

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}🔧 Réparation complète de l'installation npm...${NC}"

cd ~/bbyatchv2-master || exit 1

# 1. Arrêter PM2 et tous les processus Node
echo -e "${YELLOW}[1/7] Arrêt de PM2 et des processus Node...${NC}"
pm2 stop all 2>/dev/null || true
pm2 delete all 2>/dev/null || true
pkill -f "node.*bbyatchv2" 2>/dev/null || true
pkill -f "npm.*start" 2>/dev/null || true
sleep 2
echo -e "${GREEN}✓ Processus arrêtés${NC}"

# 2. Forcer la suppression de node_modules (avec sudo si nécessaire)
echo -e "${YELLOW}[2/7] Suppression forcée de node_modules...${NC}"
if [ -d "node_modules" ]; then
    # Essayer sans sudo d'abord
    rm -rf node_modules 2>/dev/null || {
        echo -e "${YELLOW}⚠ Tentative avec sudo...${NC}"
        sudo rm -rf node_modules
    }
fi
rm -f package-lock.json
echo -e "${GREEN}✓ node_modules supprimé${NC}"

# 3. Nettoyer le cache npm
echo -e "${YELLOW}[3/7] Nettoyage du cache npm...${NC}"
npm cache clean --force
echo -e "${GREEN}✓ Cache nettoyé${NC}"

# 4. Vérifier que package.json est valide
echo -e "${YELLOW}[4/7] Vérification de package.json...${NC}"
if node -e "JSON.parse(require('fs').readFileSync('package.json', 'utf8'))" 2>/dev/null; then
    echo -e "${GREEN}✓ package.json est valide${NC}"
else
    echo -e "${RED}✗ Erreur: package.json n'est pas valide${NC}"
    exit 1
fi

# 5. Installer les dépendances (npm install génère package-lock.json)
echo -e "${YELLOW}[5/7] Installation des dépendances (cela peut prendre plusieurs minutes)...${NC}"
npm install
echo -e "${GREEN}✓ Dépendances installées${NC}"

# 6. Vérifier que next est installé
echo -e "${YELLOW}[6/7] Vérification de l'installation...${NC}"
if [ -f "node_modules/.bin/next" ]; then
    echo -e "${GREEN}✓ Next.js est installé${NC}"
else
    echo -e "${RED}✗ Erreur: Next.js n'est pas installé${NC}"
    exit 1
fi

# 7. Build l'application
echo -e "${YELLOW}[7/7] Build de l'application...${NC}"
npm run build
echo -e "${GREEN}✓ Build terminé${NC}"

echo ""
echo -e "${GREEN}✅ Réparation terminée !${NC}"
echo ""
echo "Prochaines étapes:"
echo "  1. pm2 start npm --name bbyatchv2-preprod -- run start"
echo "  2. pm2 save"
echo "  3. pm2 logs bbyatchv2-preprod  # Vérifier les logs"
