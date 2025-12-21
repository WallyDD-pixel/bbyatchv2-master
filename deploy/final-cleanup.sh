#!/bin/bash

# Script de nettoyage final - supprime le dossier de l'ancien site
# Usage: bash final-cleanup.sh [CHEMIN_DOSSIER]

set -e

APP_DIR=${1:-"~/bbyatchv2"}

echo "🧹 Nettoyage final du dossier de l'ancien site..."

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Résoudre le chemin (gérer ~)
if [[ "$APP_DIR" == ~* ]]; then
    APP_DIR="${APP_DIR/#\~/$HOME}"
fi

if [ -d "$APP_DIR" ]; then
    echo -e "${YELLOW}Suppression du dossier: $APP_DIR${NC}"
    echo -e "${RED}⚠ ATTENTION: Tous les fichiers seront supprimés définitivement!${NC}"
    
    # Lister la taille du dossier avant suppression
    SIZE=$(du -sh "$APP_DIR" 2>/dev/null | cut -f1)
    echo -e "${YELLOW}Taille du dossier: $SIZE${NC}"
    
    read -p "Confirmez la suppression (tapez 'OUI' en majuscules): " CONFIRM
    
    if [ "$CONFIRM" = "OUI" ]; then
        rm -rf "$APP_DIR"
        echo -e "${GREEN}✓ Dossier supprimé avec succès${NC}"
    else
        echo -e "${YELLOW}✗ Suppression annulée${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}⚠ Le dossier $APP_DIR n'existe pas${NC}"
fi

# Nettoyer aussi les autres dossiers potentiels
for dir in ~/bbyatchv2-master ~/bbyatchv2; do
    if [ -d "$dir" ]; then
        echo -e "${YELLOW}Dossier trouvé: $dir${NC}"
        read -p "Supprimer ce dossier aussi? (oui/non): " -n 3 -r
        echo
        if [[ $REPLY =~ ^[Oo][Uu][Ii]$ ]]; then
            rm -rf "$dir"
            echo -e "${GREEN}✓ $dir supprimé${NC}"
        fi
    fi
done

# Vérifier s'il reste des fichiers/dossiers liés
echo ""
echo -e "${YELLOW}Recherche de dossiers/fichiers restants...${NC}"
find ~ -maxdepth 2 -type d -name "*bbyatch*" 2>/dev/null | grep -v ".git" || echo "Aucun autre dossier trouvé"

echo ""
echo -e "${GREEN}✅ Nettoyage final terminé!${NC}"

