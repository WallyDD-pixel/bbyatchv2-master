#!/bin/bash

# Solution simple : installer avec binaire précompilé d'esbuild
# Usage: bash deploy/install-simple.sh

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

APP_DIR="$HOME/bbyatchv2-master"

echo -e "${YELLOW}🚀 Installation simple avec binaire précompilé...${NC}"

cd "$APP_DIR" || exit 1

# Arrêter PM2 si nécessaire
pm2 stop bbyatchv2-preprod 2>/dev/null || true

# Nettoyer
echo -e "${YELLOW}[1/4] Nettoyage...${NC}"
npm cache clean --force
rm -rf node_modules package-lock.json
echo -e "${GREEN}✓ Nettoyé${NC}"

# Installer esbuild d'abord avec binaire précompilé (évite la compilation)
echo -e "${YELLOW}[2/4] Installation d'esbuild avec binaire précompilé...${NC}"
# Forcer l'utilisation d'un binaire précompilé en installant esbuild explicitement
npm install esbuild@latest --save-dev --legacy-peer-deps --no-audit --prefer-offline 2>&1 | grep -v "npm warn" || true
echo -e "${GREEN}✓ esbuild installé${NC}"

# Installer le reste avec --ignore-scripts pour éviter les scripts post-install problématiques
echo -e "${YELLOW}[3/4] Installation des autres dépendances...${NC}"
export NODE_OPTIONS="--max-old-space-size=512"
npm install --legacy-peer-deps --no-audit --ignore-scripts 2>&1 | grep -v "npm warn" || true
echo -e "${GREEN}✓ Dépendances installées${NC}"

# Exécuter les scripts post-install seulement pour les packages nécessaires
echo -e "${YELLOW}[4/4] Exécution des scripts post-install essentiels...${NC}"
npm rebuild 2>&1 | grep -v "npm warn" || true
echo -e "${GREEN}✓ Scripts exécutés${NC}"

echo ""
echo -e "${GREEN}✅ Installation terminée!${NC}"
echo ""
echo "Vous pouvez maintenant relancer le déploiement:"
echo "  bash deploy/deploy.sh"

