#!/bin/bash

# Script pour corriger la DATABASE_URL Supabase
# Usage: bash deploy/fix-database-url.sh

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}🔧 Correction de la DATABASE_URL...${NC}"

cd ~/bbyatchv2-master || exit 1

# Vérifier que le .env existe
if [ ! -f ".env" ]; then
    echo -e "${RED}✗ Fichier .env introuvable${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}📋 DATABASE_URL actuelle:${NC}"
grep "^DATABASE_URL=" .env || echo "DATABASE_URL non trouvée"

echo ""
echo -e "${YELLOW}⚠️  Pour corriger:${NC}"
echo ""
echo "1. Allez sur https://supabase.com"
echo "2. Ouvrez votre projet (nbovypcvctbtwxflbkmh)"
echo "3. Settings > Database"
echo "4. Dans 'Connection string', choisissez 'URI'"
echo "5. Copiez l'URL qui ressemble à:"
echo "   postgresql://postgres.nbovypcvctbtwxflbkmh:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres"
echo ""
echo "6. Ajoutez ?schema=public à la fin"
echo ""
echo -e "${GREEN}Format attendu:${NC}"
echo "DATABASE_URL=\"postgresql://postgres.nbovypcvctbtwxflbkmh:[PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?schema=public\""
echo ""
echo "OU (connexion directe):"
echo "DATABASE_URL=\"postgresql://postgres:[PASSWORD]@db.nbovypcvctbtwxflbkmh.supabase.co:5432/postgres?schema=public\""
echo ""
echo -e "${YELLOW}Pour éditer le .env:${NC}"
echo "nano .env"
echo ""
echo -e "${YELLOW}Après modification, redémarrer PM2:${NC}"
echo "pm2 restart bbyatchv2-preprod --update-env"
echo "pm2 logs bbyatchv2-preprod --lines 20"








