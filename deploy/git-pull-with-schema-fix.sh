#!/bin/bash

# Script pour faire git pull en préservant le changement sqlite -> postgresql
# Usage: bash deploy/git-pull-with-schema-fix.sh

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}📥 Mise à jour du code depuis Git...${NC}"

cd ~/bbyatchv2-master || exit 1

# Vérifier si schema.prisma a été modifié
if git diff prisma/schema.prisma | grep -q 'provider = "sqlite"'; then
    echo -e "${YELLOW}⚠ Changement sqlite -> postgresql détecté dans schema.prisma${NC}"
    
    # Sauvegarder le changement
    echo "Sauvegarde du changement..."
    git stash push -m "changement-postgresql-$(date +%Y%m%d)" prisma/schema.prisma
    
    # Faire le pull
    echo "Récupération des mises à jour..."
    if git pull; then
        echo -e "${GREEN}✓ Code mis à jour${NC}"
        
        # Vérifier si le repo a déjà le changement postgresql
        if grep -q 'provider = "postgresql"' prisma/schema.prisma; then
            echo -e "${GREEN}✓ Le repo a déjà postgresql, pas besoin de réappliquer${NC}"
        else
            echo -e "${YELLOW}⚠ Réapplication du changement postgresql...${NC}"
            git stash pop || true
            
            # S'assurer que c'est bien postgresql
            sed -i 's/provider = "sqlite"/provider = "postgresql"/' prisma/schema.prisma
            
            # Vérifier
            if grep -q 'provider = "postgresql"' prisma/schema.prisma; then
                echo -e "${GREEN}✓ schema.prisma configuré pour PostgreSQL${NC}"
            else
                echo -e "${RED}✗ Erreur lors de la configuration de schema.prisma${NC}"
                exit 1
            fi
        fi
    else
        echo -e "${RED}✗ Erreur lors du pull${NC}"
        exit 1
    fi
else
    # Pas de changement local, pull normal
    if git pull; then
        echo -e "${GREEN}✓ Code mis à jour${NC}"
        
        # Vérifier que schema.prisma utilise postgresql
        if grep -q 'provider = "postgresql"' prisma/schema.prisma; then
            echo -e "${GREEN}✓ schema.prisma utilise déjà PostgreSQL${NC}"
        else
            echo -e "${YELLOW}⚠ Configuration de schema.prisma pour PostgreSQL...${NC}"
            sed -i 's/provider = "sqlite"/provider = "postgresql"/' prisma/schema.prisma
            echo -e "${GREEN}✓ schema.prisma configuré pour PostgreSQL${NC}"
        fi
    else
        echo -e "${RED}✗ Erreur lors du pull${NC}"
        exit 1
    fi
fi

echo ""
echo -e "${GREEN}✅ Mise à jour terminée!${NC}"
echo ""
echo "Vérification:"
grep "provider" prisma/schema.prisma | head -2







