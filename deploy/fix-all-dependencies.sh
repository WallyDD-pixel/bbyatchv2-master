#!/bin/bash

# Script pour installer toutes les dépendances manquantes et rebuild
# Usage: bash deploy/fix-all-dependencies.sh

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}🔧 Installation de toutes les dépendances manquantes...${NC}"

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

# 3. Installer toutes les dépendances manquantes
echo -e "${YELLOW}[3/6] Installation de toutes les dépendances...${NC}"
echo "Installation de @fullcalendar..."
npm install @fullcalendar/core@^6.1.20 @fullcalendar/daygrid@^6.1.20 @fullcalendar/interaction@^6.1.20 @fullcalendar/react@^6.1.20 @fullcalendar/timegrid@^6.1.20

echo "Installation de nodemailer..."
npm install nodemailer@^7.0.12

echo "Réinstallation complète de toutes les dépendances..."
npm install

echo -e "${GREEN}✓ Dépendances installées${NC}"

# 4. Vérifier que les packages critiques sont installés
echo -e "${YELLOW}[4/6] Vérification des packages critiques...${NC}"
MISSING=0

if [ ! -d "node_modules/@fullcalendar" ]; then
    echo -e "${RED}✗ @fullcalendar manquant${NC}"
    MISSING=1
else
    echo -e "${GREEN}✓ @fullcalendar installé${NC}"
fi

if [ ! -d "node_modules/nodemailer" ]; then
    echo -e "${RED}✗ nodemailer manquant${NC}"
    MISSING=1
else
    echo -e "${GREEN}✓ nodemailer installé${NC}"
fi

if [ ! -d "node_modules/next" ]; then
    echo -e "${RED}✗ next manquant${NC}"
    MISSING=1
else
    echo -e "${GREEN}✓ next installé${NC}"
fi

if [ $MISSING -eq 1 ]; then
    echo -e "${RED}✗ Certains packages sont manquants, réinstallation forcée...${NC}"
    rm -rf node_modules package-lock.json
    npm install --force
fi

# 5. Nettoyer et rebuild
echo -e "${YELLOW}[5/6] Nettoyage et rebuild...${NC}"
rm -rf .next
echo "Build en cours (cela peut prendre plusieurs minutes)..."
if npm run build; then
    echo -e "${GREEN}✓ Build réussi${NC}"
    
    # Vérifier que .next contient un build-id
    if [ -f ".next/BUILD_ID" ] || [ -d ".next/server" ]; then
        echo -e "${GREEN}✓ Build complet créé${NC}"
    else
        echo -e "${RED}✗ Erreur: Build incomplet${NC}"
        exit 1
    fi
else
    echo -e "${RED}✗ Erreur: Build échoué${NC}"
    echo "Vérifiez les erreurs ci-dessus"
    exit 1
fi

# 6. Démarrer PM2
echo -e "${YELLOW}[6/6] Démarrage de PM2...${NC}"
pm2 start npm --name bbyatchv2-preprod -- run start
sleep 3
pm2 save

# Vérifier le statut
if pm2 list | grep -q "bbyatchv2-preprod.*online"; then
    echo -e "${GREEN}✓ PM2 démarré avec succès${NC}"
else
    echo -e "${YELLOW}⚠ PM2 démarré mais statut incertain, vérifiez les logs${NC}"
fi

echo ""
echo -e "${GREEN}✅ Tout est terminé !${NC}"
echo ""
echo "Vérification:"
echo "  pm2 status                    # Vérifier le statut"
echo "  pm2 logs bbyatchv2-preprod    # Voir les logs"
echo "  curl http://localhost:3010   # Tester l'application"
