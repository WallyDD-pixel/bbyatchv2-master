#!/bin/bash

# Script pour corriger l'erreur 502 Bad Gateway
# Usage: bash deploy/fix-502-error.sh

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "🔧 Correction de l'erreur 502 Bad Gateway..."
echo ""

# 1. Vérifier le statut PM2
echo -e "${YELLOW}[1/6] Vérification du statut PM2...${NC}"
pm2 status
echo ""

# 2. Vérifier les logs d'erreur récents
echo -e "${YELLOW}[2/6] Dernières erreurs PM2...${NC}"
pm2 logs bbyatchv2-preprod --lines 50 --err --nostream | tail -30
echo ""

# 3. Arrêter l'application
echo -e "${YELLOW}[3/6] Arrêt de l'application...${NC}"
pm2 stop bbyatchv2-preprod || true
pm2 delete bbyatchv2-preprod || true
echo -e "${GREEN}✓ Application arrêtée${NC}"
echo ""

# 4. Vérifier que le build existe
echo -e "${YELLOW}[4/6] Vérification du build...${NC}"
if [ ! -d ".next" ]; then
    echo -e "${RED}✗ Dossier .next non trouvé, reconstruction nécessaire${NC}"
    echo -e "${YELLOW}   Lancement du build...${NC}"
    npm run build
    if [ $? -ne 0 ]; then
        echo -e "${RED}✗ Erreur lors du build${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✓ Dossier .next trouvé${NC}"
fi
echo ""

# 5. Vérifier Prisma Client
echo -e "${YELLOW}[5/6] Génération de Prisma Client...${NC}"
npx prisma generate
echo -e "${GREEN}✓ Prisma Client généré${NC}"
echo ""

# 6. Redémarrer l'application
echo -e "${YELLOW}[6/6] Redémarrage de l'application...${NC}"
pm2 start ecosystem.config.cjs
pm2 save
echo -e "${GREEN}✓ Application redémarrée${NC}"
echo ""

# 7. Attendre quelques secondes et vérifier
echo -e "${YELLOW}Attente de 5 secondes...${NC}"
sleep 5

echo -e "${YELLOW}Vérification du statut...${NC}"
pm2 status

echo ""
echo -e "${YELLOW}Test de l'application locale...${NC}"
if curl -f -s http://localhost:3010 > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Application répond sur localhost:3010${NC}"
else
    echo -e "${RED}✗ Application ne répond pas${NC}"
    echo ""
    echo "Vérifiez les logs:"
    echo "  pm2 logs bbyatchv2-preprod --lines 100"
fi

echo ""
echo "📋 Commandes utiles:"
echo "  - Voir les logs: pm2 logs bbyatchv2-preprod"
echo "  - Redémarrer: pm2 restart bbyatchv2-preprod"
echo "  - Tester: curl http://localhost:3010"
