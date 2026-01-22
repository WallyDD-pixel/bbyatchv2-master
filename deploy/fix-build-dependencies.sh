#!/bin/bash

# Script pour corriger les dépendances manquantes et rebuild
# Usage: bash deploy/fix-build-dependencies.sh

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}🔧 Correction des dépendances et rebuild...${NC}"

cd ~/bbyatchv2-master || exit 1

# 1. Arrêter PM2
echo -e "${YELLOW}[1/6] Arrêt de PM2...${NC}"
pm2 stop bbyatchv2-preprod 2>/dev/null || true
pm2 delete bbyatchv2-preprod 2>/dev/null || true
echo -e "${GREEN}✓ PM2 arrêté${NC}"

# 2. Vérifier que package.json est valide
echo -e "${YELLOW}[2/6] Vérification de package.json...${NC}"
if node -e "JSON.parse(require('fs').readFileSync('package.json', 'utf8'))" 2>/dev/null; then
    echo -e "${GREEN}✓ package.json est valide${NC}"
else
    echo -e "${RED}✗ Erreur: package.json n'est pas valide${NC}"
    exit 1
fi

# 3. Réinstaller les dépendances (force reinstall)
echo -e "${YELLOW}[3/6] Réinstallation complète des dépendances...${NC}"
rm -rf node_modules/.cache 2>/dev/null || true
npm install --force
echo -e "${GREEN}✓ Dépendances réinstallées${NC}"

# 4. Vérifier que les packages @fullcalendar sont installés
echo -e "${YELLOW}[4/6] Vérification des packages @fullcalendar...${NC}"
if [ -d "node_modules/@fullcalendar" ]; then
    echo -e "${GREEN}✓ Packages @fullcalendar installés${NC}"
    ls -la node_modules/@fullcalendar/
else
    echo -e "${RED}✗ Erreur: Packages @fullcalendar non trouvés${NC}"
    echo "Installation manuelle des packages @fullcalendar..."
    npm install @fullcalendar/core@^6.1.20 @fullcalendar/daygrid@^6.1.20 @fullcalendar/interaction@^6.1.20 @fullcalendar/react@^6.1.20 @fullcalendar/timegrid@^6.1.20
fi

# 5. Nettoyer le build précédent
echo -e "${YELLOW}[5/6] Nettoyage du build précédent...${NC}"
rm -rf .next
echo -e "${GREEN}✓ Build précédent supprimé${NC}"

# 6. Build l'application
echo -e "${YELLOW}[6/6] Build de l'application...${NC}"
npm run build
echo -e "${GREEN}✓ Build terminé${NC}"

echo ""
echo -e "${GREEN}✅ Correction terminée !${NC}"
echo ""
echo "Prochaines étapes:"
echo "  1. pm2 start npm --name bbyatchv2-preprod -- run start"
echo "  2. pm2 save"
echo "  3. pm2 logs bbyatchv2-preprod  # Vérifier les logs"
