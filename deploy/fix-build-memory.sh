#!/bin/bash

# Script pour résoudre les problèmes de mémoire lors du build Next.js
# Augmente le swap et configure Node.js pour utiliser moins de mémoire

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}🔧 Configuration pour résoudre les problèmes de mémoire...${NC}"

# 1. Augmenter le swap à 2GB si nécessaire
CURRENT_SWAP=$(free -m | grep Swap | awk '{print $2}')
if [ "$CURRENT_SWAP" -lt 2048 ]; then
    echo -e "${YELLOW}[1/3] Augmentation du swap à 2GB...${NC}"
    bash deploy/create-swap.sh 2
else
    echo -e "${GREEN}✓ Swap suffisant (${CURRENT_SWAP}MB)${NC}"
fi

# 2. Modifier package.json pour limiter la mémoire Node.js
echo -e "${YELLOW}[2/3] Configuration de la limite mémoire pour Node.js...${NC}"
cd ~/bbyatchv2-master

# Créer un script de build avec limite mémoire
cat > build-with-limit.sh << 'EOF'
#!/bin/bash
# Build avec limite mémoire pour éviter OOM
export NODE_OPTIONS="--max-old-space-size=1024"
npm run build
EOF

chmod +x build-with-limit.sh
echo -e "${GREEN}✓ Script de build créé${NC}"

# 3. Vérifier l'espace disque
echo -e "${YELLOW}[3/3] Vérification de l'espace disque...${NC}"
df -h / | tail -1
echo ""

echo -e "${GREEN}✅ Configuration terminée!${NC}"
echo ""
echo "Pour lancer le build avec limite mémoire:"
echo "  cd ~/bbyatchv2-master"
echo "  ./build-with-limit.sh"
echo ""
echo "Ou directement:"
echo "  NODE_OPTIONS='--max-old-space-size=1024' npm run build"
