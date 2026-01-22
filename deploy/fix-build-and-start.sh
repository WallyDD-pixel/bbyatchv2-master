#!/bin/bash

# Script complet pour corriger le build et démarrer l'application
# Usage: bash deploy/fix-build-and-start.sh

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}🔧 Correction complète du build et démarrage...${NC}"

cd ~/bbyatchv2-master || exit 1

# 1. Arrêter complètement PM2
echo -e "${YELLOW}[1/7] Arrêt complet de PM2...${NC}"
pm2 stop all 2>/dev/null || true
pm2 delete all 2>/dev/null || true
pkill -f "node.*bbyatchv2" 2>/dev/null || true
pkill -f "npm.*start" 2>/dev/null || true
sleep 2
echo -e "${GREEN}✓ Tous les processus arrêtés${NC}"

# 2. Vérifier que package.json est valide
echo -e "${YELLOW}[2/7] Vérification de package.json...${NC}"
if node -e "JSON.parse(require('fs').readFileSync('package.json', 'utf8'))" 2>/dev/null; then
    echo -e "${GREEN}✓ package.json est valide${NC}"
else
    echo -e "${RED}✗ Erreur: package.json n'est pas valide${NC}"
    exit 1
fi

# 3. Installer explicitement les packages @fullcalendar
echo -e "${YELLOW}[3/7] Installation des packages @fullcalendar...${NC}"
npm install @fullcalendar/core@^6.1.20 @fullcalendar/daygrid@^6.1.20 @fullcalendar/interaction@^6.1.20 @fullcalendar/react@^6.1.20 @fullcalendar/timegrid@^6.1.20

# 4. Vérifier que @fullcalendar est installé
echo -e "${YELLOW}[4/7] Vérification de l'installation de @fullcalendar...${NC}"
if [ -d "node_modules/@fullcalendar" ]; then
    echo -e "${GREEN}✓ @fullcalendar installé${NC}"
    ls -la node_modules/@fullcalendar/ | head -10
else
    echo -e "${RED}✗ Erreur: @fullcalendar toujours non trouvé${NC}"
    echo "Tentative de réinstallation complète..."
    rm -rf node_modules/@fullcalendar
    npm install --force
fi

# 5. Nettoyer le build précédent
echo -e "${YELLOW}[5/7] Nettoyage du build précédent...${NC}"
rm -rf .next
echo -e "${GREEN}✓ Build précédent supprimé${NC}"

# 6. Build l'application
echo -e "${YELLOW}[6/7] Build de l'application (cela peut prendre plusieurs minutes)...${NC}"
if npm run build; then
    echo -e "${GREEN}✓ Build réussi${NC}"
    
    # Vérifier que .next existe
    if [ -d ".next" ]; then
        echo -e "${GREEN}✓ Dossier .next créé${NC}"
    else
        echo -e "${RED}✗ Erreur: Dossier .next non créé${NC}"
        exit 1
    fi
else
    echo -e "${RED}✗ Erreur: Build échoué${NC}"
    echo "Vérifiez les erreurs ci-dessus"
    exit 1
fi

# 7. Démarrer PM2
echo -e "${YELLOW}[7/7] Démarrage de PM2...${NC}"
pm2 start npm --name bbyatchv2-preprod -- run start
pm2 save
echo -e "${GREEN}✓ PM2 démarré${NC}"

echo ""
echo -e "${GREEN}✅ Tout est terminé !${NC}"
echo ""
echo "Vérification:"
echo "  pm2 status                    # Vérifier le statut"
echo "  pm2 logs bbyatchv2-preprod    # Voir les logs"
echo "  curl http://localhost:3010   # Tester l'application"
