#!/bin/bash

# Script pour faire un git pull en sécurité en sauvegardant les changements locaux
# Usage: bash deploy/git-pull-safe.sh

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}📥 Mise à jour du code depuis Git...${NC}"

# Vérifier s'il y a des changements non commités
if [ -n "$(git status --porcelain)" ]; then
    echo -e "${YELLOW}⚠ Changements locaux détectés${NC}"
    echo "Sauvegarde des changements locaux..."
    
    # Créer un stash avec un message
    STASH_NAME="backup-$(date +%Y%m%d-%H%M%S)"
    git stash push -m "$STASH_NAME"
    echo -e "${GREEN}✓ Changements sauvegardés dans stash: $STASH_NAME${NC}"
fi

# Faire le pull
echo "Récupération des mises à jour..."
if git pull; then
    echo -e "${GREEN}✓ Code mis à jour${NC}"
    
    # Vérifier s'il y a un stash récent à réappliquer
    if git stash list | head -1 | grep -q "$STASH_NAME"; then
        echo ""
        echo -e "${YELLOW}⚠ Vous aviez des changements locaux sauvegardés${NC}"
        echo "Pour les réappliquer:"
        echo "  git stash list                    # Voir les stashes"
        echo "  git stash pop stash@{0}            # Réappliquer le dernier stash"
        echo "  git stash show stash@{0}           # Voir ce qui était changé"
    fi
else
    echo -e "${RED}✗ Erreur lors du pull${NC}"
    exit 1
fi

