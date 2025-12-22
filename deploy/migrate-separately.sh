#!/bin/bash

# Script pour appliquer les migrations Prisma séparément (avec plus de mémoire)
# Usage: bash deploy/migrate-separately.sh

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}🔄 Application des migrations Prisma sur Supabase...${NC}"

cd ~/bbyatchv2-master || exit 1

# Libérer la mémoire
echo "Libération de la mémoire..."
sync
echo 3 | sudo tee /proc/sys/vm/drop_caches > /dev/null 2>&1 || true
sleep 2

# Vérifier le .env
if [ ! -f .env ]; then
    echo -e "${RED}✗ Fichier .env introuvable${NC}"
    exit 1
fi

# Charger les variables d'environnement
set -a
source .env
set +a

# Vérifier la connexion
echo -e "${YELLOW}[1/3] Vérification de la connexion à Supabase...${NC}"
export NODE_OPTIONS="--max-old-space-size=512"

if npx prisma db pull --force 2>&1 | head -10; then
    echo -e "${GREEN}✓ Connexion réussie${NC}"
else
    echo -e "${YELLOW}⚠ Connexion peut avoir des problèmes, mais on continue...${NC}"
fi

# Générer le client Prisma
echo -e "${YELLOW}[2/3] Génération du client Prisma...${NC}"
npx prisma generate
echo -e "${GREEN}✓ Client Prisma généré${NC}"

# Appliquer les migrations
echo -e "${YELLOW}[3/3] Application des migrations...${NC}"
echo "Cela peut prendre quelques minutes..."

# Essayer avec timeout plus long
if timeout 300 npx prisma migrate deploy; then
    echo -e "${GREEN}✓ Migrations appliquées avec succès${NC}"
else
    EXIT_CODE=$?
    echo ""
    if [ $EXIT_CODE -eq 124 ]; then
        echo -e "${YELLOW}⚠ Timeout après 5 minutes${NC}"
    elif [ $EXIT_CODE -eq 130 ] || [ $EXIT_CODE -eq 137 ]; then
        echo -e "${RED}✗ Processus tué (SIGKILL) - Manque de mémoire${NC}"
        echo ""
        echo "Solutions:"
        echo "  1. Créer un swap: bash deploy/create-swap.sh 2"
        echo "  2. Appliquer les migrations depuis votre machine locale:"
        echo "     npx prisma migrate deploy"
        echo "  3. Utiliser Supabase Dashboard > SQL Editor"
    else
        echo -e "${RED}✗ Erreur lors des migrations (code: $EXIT_CODE)${NC}"
    fi
    exit 1
fi

echo ""
echo -e "${GREEN}✅ Migrations terminées!${NC}"



