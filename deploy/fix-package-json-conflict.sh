#!/bin/bash

# Script pour résoudre le conflit de merge dans package.json
# Usage: bash deploy/fix-package-json-conflict.sh

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}🔧 Résolution du conflit dans package.json...${NC}"

cd ~/bbyatchv2-master || exit 1

# Sauvegarder le fichier actuel
if [ -f package.json ]; then
    cp package.json package.json.backup
    echo -e "${GREEN}✓ Sauvegarde créée: package.json.backup${NC}"
fi

# Vérifier s'il y a des marqueurs de conflit
if grep -q "<<<<<<<" package.json; then
    echo -e "${YELLOW}⚠ Marqueurs de conflit détectés${NC}"
    
    # Utiliser la version distante (celle du repo)
    echo "Récupération de la version depuis le repo..."
    git checkout --theirs package.json
    
    # Vérifier que le JSON est valide
    if node -e "JSON.parse(require('fs').readFileSync('package.json', 'utf8'))" 2>/dev/null; then
        echo -e "${GREEN}✓ package.json est maintenant valide${NC}"
    else
        echo -e "${RED}✗ Erreur: package.json n'est toujours pas valide${NC}"
        echo "Restauration de la sauvegarde..."
        cp package.json.backup package.json
        exit 1
    fi
    
    # Marquer comme résolu
    git add package.json
    echo -e "${GREEN}✓ Conflit résolu et fichier ajouté à l'index${NC}"
    
    # Faire la même chose pour package-lock.json si nécessaire
    if [ -f package-lock.json ] && grep -q "<<<<<<<" package-lock.json 2>/dev/null; then
        echo -e "${YELLOW}⚠ Conflit détecté dans package-lock.json${NC}"
        git checkout --theirs package-lock.json
        git add package-lock.json
        echo -e "${GREEN}✓ Conflit dans package-lock.json résolu${NC}"
    fi
    
    echo ""
    echo -e "${GREEN}✅ Conflits résolus !${NC}"
    echo ""
    echo "Prochaines étapes:"
    echo "  1. npm ci                    # Réinstaller les dépendances"
    echo "  2. npm run build             # Rebuild l'application"
    echo "  3. pm2 restart bbyatchv2-preprod  # Redémarrer l'application"
    
else
    echo -e "${GREEN}✓ Aucun marqueur de conflit détecté${NC}"
    
    # Vérifier quand même que le JSON est valide
    if node -e "JSON.parse(require('fs').readFileSync('package.json', 'utf8'))" 2>/dev/null; then
        echo -e "${GREEN}✓ package.json est valide${NC}"
    else
        echo -e "${RED}✗ Erreur: package.json n'est pas un JSON valide${NC}"
        echo "Vérifiez le fichier manuellement:"
        echo "  cat package.json | grep -A 5 -B 5 '<<<<<<<'"
        exit 1
    fi
fi
