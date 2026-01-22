#!/bin/bash

# Script pour forcer l'installation des packages @fullcalendar
# Usage: bash deploy/fix-fullcalendar-install.sh

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}🔧 Installation forcée des packages @fullcalendar...${NC}"

cd ~/bbyatchv2-master || exit 1

# 1. Arrêter PM2
echo -e "${YELLOW}[1/5] Arrêt de PM2...${NC}"
pm2 stop bbyatchv2-preprod 2>/dev/null || true
pm2 delete bbyatchv2-preprod 2>/dev/null || true
echo -e "${GREEN}✓ PM2 arrêté${NC}"

# 2. Vérifier si @fullcalendar est installé
echo -e "${YELLOW}[2/5] Vérification de l'installation de @fullcalendar...${NC}"
if [ -d "node_modules/@fullcalendar" ]; then
    echo -e "${GREEN}✓ @fullcalendar trouvé dans node_modules${NC}"
    ls -la node_modules/@fullcalendar/
else
    echo -e "${RED}✗ @fullcalendar non trouvé${NC}"
fi

# 3. Installer explicitement les packages @fullcalendar
echo -e "${YELLOW}[3/5] Installation explicite des packages @fullcalendar...${NC}"
npm install @fullcalendar/core@^6.1.20 @fullcalendar/daygrid@^6.1.20 @fullcalendar/interaction@^6.1.20 @fullcalendar/react@^6.1.20 @fullcalendar/timegrid@^6.1.20

# 4. Vérifier l'installation
echo -e "${YELLOW}[4/5] Vérification de l'installation...${NC}"
if [ -d "node_modules/@fullcalendar" ]; then
    echo -e "${GREEN}✓ @fullcalendar installé avec succès${NC}"
    ls -la node_modules/@fullcalendar/
else
    echo -e "${RED}✗ Erreur: @fullcalendar toujours non trouvé${NC}"
    exit 1
fi

# 5. Nettoyer et rebuild
echo -e "${YELLOW}[5/5] Nettoyage et rebuild...${NC}"
rm -rf .next
npm run build
echo -e "${GREEN}✓ Build terminé${NC}"

echo ""
echo -e "${GREEN}✅ Installation terminée !${NC}"
echo ""
echo "Prochaines étapes:"
echo "  1. pm2 start npm --name bbyatchv2-preprod -- run start"
echo "  2. pm2 save"
echo "  3. pm2 logs bbyatchv2-preprod  # Vérifier les logs"
