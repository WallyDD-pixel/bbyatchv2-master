#!/bin/bash

# Script pour mettre à jour la DATABASE_URL Supabase
# Usage: bash deploy/update-database-url.sh

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}🔧 Mise à jour de la DATABASE_URL...${NC}"

cd ~/bbyatchv2-master || exit 1

# Mot de passe encodé (&& devient %26%26)
PASSWORD="Escalop08%26%26"

# Option 1: Pooler (recommandé)
DATABASE_URL_POOLER="postgresql://postgres.nbovypcvctbtwxflbkmh:${PASSWORD}@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?schema=public"

# Option 2: Connexion directe
DATABASE_URL_DIRECT="postgresql://postgres:${PASSWORD}@db.nbovypcvctbtwxflbkmh.supabase.co:5432/postgres?schema=public"

echo ""
echo -e "${YELLOW}Choisissez le type de connexion:${NC}"
echo "1. Pooler (recommandé pour les applications)"
echo "2. Connexion directe"
echo ""
read -p "Votre choix (1 ou 2): " choice

if [ "$choice" = "1" ]; then
    DATABASE_URL="$DATABASE_URL_POOLER"
    echo -e "${GREEN}✓ Utilisation du pooler${NC}"
elif [ "$choice" = "2" ]; then
    DATABASE_URL="$DATABASE_URL_DIRECT"
    echo -e "${GREEN}✓ Utilisation de la connexion directe${NC}"
else
    echo -e "${RED}✗ Choix invalide${NC}"
    exit 1
fi

# Sauvegarder l'ancien .env
if [ -f ".env" ]; then
    cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
    echo -e "${GREEN}✓ Backup créé${NC}"
fi

# Mettre à jour ou ajouter DATABASE_URL
if grep -q "^DATABASE_URL=" .env; then
    # Remplacer la ligne existante
    sed -i "s|^DATABASE_URL=.*|DATABASE_URL=\"${DATABASE_URL}\"|" .env
    echo -e "${GREEN}✓ DATABASE_URL mise à jour${NC}"
else
    # Ajouter la ligne
    echo "DATABASE_URL=\"${DATABASE_URL}\"" >> .env
    echo -e "${GREEN}✓ DATABASE_URL ajoutée${NC}"
fi

echo ""
echo -e "${GREEN}✅ DATABASE_URL configurée!${NC}"
echo ""
echo "Redémarrage de PM2..."
pm2 restart bbyatchv2-preprod --update-env

echo ""
echo -e "${YELLOW}Vérification des logs (attendez 5 secondes)...${NC}"
sleep 5
pm2 logs bbyatchv2-preprod --lines 10 --nostream








