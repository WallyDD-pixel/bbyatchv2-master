#!/bin/bash

# Script pour vérifier que le déploiement fonctionne
# Usage: bash deploy/verifier-deploiement.sh

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "🔍 Vérification du déploiement..."

# 1. Vérifier PM2
echo -e "${YELLOW}[1/4] Vérification PM2...${NC}"
pm2 status
echo ""

# 2. Vérifier les logs récents
echo -e "${YELLOW}[2/4] Derniers logs PM2...${NC}"
pm2 logs bbyatchv2-preprod --lines 20 --nostream
echo ""

# 3. Vérifier que l'app répond localement
echo -e "${YELLOW}[3/4] Test de connexion locale...${NC}"
if curl -f -s http://localhost:3010 > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Application répond sur localhost:3010${NC}"
else
    echo -e "${RED}✗ Application ne répond pas sur localhost:3010${NC}"
    echo "Vérifiez les logs: pm2 logs bbyatchv2-preprod"
fi
echo ""

# 4. Vérifier Nginx
echo -e "${YELLOW}[4/4] Vérification Nginx...${NC}"
if sudo systemctl is-active --quiet nginx; then
    echo -e "${GREEN}✓ Nginx est actif${NC}"
else
    echo -e "${RED}✗ Nginx n'est pas actif${NC}"
fi

# 5. Vérifier la connexion à Supabase
echo ""
echo -e "${YELLOW}[5/4] Vérification connexion Supabase...${NC}"
if grep -q "supabase.co" .env 2>/dev/null; then
    echo -e "${GREEN}✓ DATABASE_URL Supabase configurée${NC}"
    echo "⚠️  Assurez-vous que les migrations ont été appliquées dans Supabase Dashboard"
else
    echo -e "${YELLOW}⚠ DATABASE_URL Supabase non trouvée${NC}"
fi

echo ""
echo "📋 Commandes utiles:"
echo "  - Voir les logs: pm2 logs bbyatchv2-preprod"
echo "  - Redémarrer: pm2 restart bbyatchv2-preprod"
echo "  - Vérifier l'URL: https://preprod.bbservicescharter.com"












