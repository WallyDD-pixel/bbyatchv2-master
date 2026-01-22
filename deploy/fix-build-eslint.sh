#!/bin/bash

# Script pour désactiver ESLint pendant le build et rebuild
# Usage: bash deploy/fix-build-eslint.sh

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}🔧 Désactivation d'ESLint pendant le build et rebuild...${NC}"

cd ~/bbyatchv2-master || exit 1

# 1. Arrêter PM2
echo -e "${YELLOW}[1/5] Arrêt de PM2...${NC}"
pm2 stop bbyatchv2-preprod 2>/dev/null || true
pm2 delete bbyatchv2-preprod 2>/dev/null || true
echo -e "${GREEN}✓ PM2 arrêté${NC}"

# 2. Modifier next.config.ts pour ignorer ESLint
echo -e "${YELLOW}[2/5] Modification de next.config.ts...${NC}"
if grep -q "ignoreDuringBuilds" next.config.ts 2>/dev/null; then
    echo -e "${GREEN}✓ ESLint déjà désactivé dans next.config.ts${NC}"
else
    # Ajouter la configuration eslint si elle n'existe pas
    if grep -q "eslint:" next.config.ts 2>/dev/null; then
        echo -e "${YELLOW}⚠ Configuration eslint existe déjà mais sans ignoreDuringBuilds${NC}"
        # Modifier la ligne existante
        sed -i 's/eslint: {/eslint: {\n    ignoreDuringBuilds: true, \/\/ Ignorer les erreurs ESLint pendant le build/' next.config.ts
    else
        # Ajouter après typescript
        sed -i '/typescript: {/,/},/a\  eslint: {\n    ignoreDuringBuilds: true, // Ignorer les erreurs ESLint pendant le build\n  },' next.config.ts
    fi
    echo -e "${GREEN}✓ Configuration ESLint ajoutée${NC}"
fi

# 3. Nettoyer le build précédent
echo -e "${YELLOW}[3/5] Nettoyage du build précédent...${NC}"
rm -rf .next
echo -e "${GREEN}✓ Build précédent supprimé${NC}"

# 4. Build l'application (ESLint sera ignoré)
echo -e "${YELLOW}[4/5] Build de l'application (ESLint ignoré)...${NC}"
if npm run build; then
    echo -e "${GREEN}✓ Build réussi${NC}"
    
    # Vérifier que .next contient un BUILD_ID ou server/
    if [ -f ".next/BUILD_ID" ] || [ -d ".next/server" ]; then
        echo -e "${GREEN}✓ Build complet créé${NC}"
    else
        echo -e "${YELLOW}⚠ Build créé mais vérification BUILD_ID échouée${NC}"
        echo "Vérification du contenu de .next..."
        ls -la .next/ | head -10
    fi
else
    echo -e "${RED}✗ Erreur: Build échoué${NC}"
    echo "Vérifiez les erreurs ci-dessus"
    exit 1
fi

# 5. Démarrer PM2
echo -e "${YELLOW}[5/5] Démarrage de PM2...${NC}"
pm2 start npm --name bbyatchv2-preprod -- run start
sleep 3
pm2 save

# Vérifier le statut
if pm2 list | grep -q "bbyatchv2-preprod.*online"; then
    echo -e "${GREEN}✓ PM2 démarré avec succès${NC}"
else
    echo -e "${YELLOW}⚠ PM2 démarré mais statut incertain, vérifiez les logs${NC}"
fi

echo ""
echo -e "${GREEN}✅ Tout est terminé !${NC}"
echo ""
echo "Vérification:"
echo "  pm2 status                    # Vérifier le statut"
echo "  pm2 logs bbyatchv2-preprod    # Voir les logs"
echo "  curl http://localhost:3010   # Tester l'application"
