#!/bin/bash

# Script pour installer esbuild séparément avec moins de mémoire
# Usage: bash deploy/install-esbuild-separately.sh

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

APP_DIR="$HOME/bbyatchv2-master"

echo -e "${YELLOW}🔧 Installation d'esbuild séparément...${NC}"

cd "$APP_DIR" || exit 1

# Vérifier la mémoire
AVAIL_MEM=$(free -m | awk '/^Mem:/{print $7}')
echo "Mémoire disponible: ${AVAIL_MEM}MB"

if [ "$AVAIL_MEM" -lt 512 ]; then
    echo -e "${YELLOW}⚠ Mémoire faible, libération...${NC}"
    sync
    echo 3 | sudo tee /proc/sys/vm/drop_caches > /dev/null 2>&1 || true
fi

# Installer esbuild avec la version spécifique depuis package.json
echo -e "${YELLOW}Installation d'esbuild...${NC}"
export NODE_OPTIONS="--max-old-space-size=512"

# Essayer d'installer esbuild directement
if npm install esbuild --legacy-peer-deps --no-save 2>&1; then
    echo -e "${GREEN}✓ esbuild installé${NC}"
else
    echo -e "${RED}✗ Échec de l'installation d'esbuild${NC}"
    echo ""
    echo "Essayez de créer un swap file d'abord:"
    echo "  bash deploy/create-swap.sh"
    exit 1
fi

# Maintenant installer les autres dépendances
echo -e "${YELLOW}Installation des autres dépendances...${NC}"
if npm install --legacy-peer-deps --no-audit --ignore-scripts 2>&1; then
    echo -e "${GREEN}✓ Dépendances installées${NC}"
    echo ""
    echo "Maintenant exécutez les scripts post-install:"
    echo "  npm rebuild"
else
    echo -e "${YELLOW}⚠ Certaines dépendances ont échoué, mais esbuild est installé${NC}"
    echo "Essayez de continuer avec: npm install --legacy-peer-deps"
fi

