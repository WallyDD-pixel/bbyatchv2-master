#!/bin/bash

# Script pour créer un fichier swap
# Usage: bash deploy/create-swap.sh [taille en GB, défaut: 2]

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

SWAP_SIZE=${1:-2}  # Taille par défaut: 2GB

echo -e "${YELLOW}💾 Création d'un fichier swap de ${SWAP_SIZE}GB...${NC}"

# Vérifier si un swap existe déjà
if [ -f /swapfile ]; then
    echo -e "${YELLOW}⚠ Un fichier swap existe déjà: /swapfile${NC}"
    read -p "Voulez-vous le remplacer? (oui/non): " -n 3 -r
    echo
    if [[ ! $REPLY =~ ^[Oo][Uu][Ii]$ ]]; then
        echo "Annulé."
        exit 0
    fi
    # Désactiver l'ancien swap
    sudo swapoff /swapfile 2>/dev/null || true
    sudo rm -f /swapfile
fi

# Vérifier l'espace disque disponible
AVAIL_SPACE=$(df -BG / | awk 'NR==2 {print $4}' | sed 's/G//')
if [ "$AVAIL_SPACE" -lt "$SWAP_SIZE" ]; then
    echo -e "${RED}✗ Pas assez d'espace disque disponible (${AVAIL_SPACE}GB disponible, ${SWAP_SIZE}GB requis)${NC}"
    exit 1
fi

# Créer le fichier swap
echo -e "${YELLOW}[1/4] Création du fichier swap de ${SWAP_SIZE}GB...${NC}"
if command -v fallocate &> /dev/null; then
    sudo fallocate -l ${SWAP_SIZE}G /swapfile
else
    echo "fallocate non disponible, utilisation de dd (plus lent)..."
    sudo dd if=/dev/zero of=/swapfile bs=1M count=$((SWAP_SIZE * 1024)) status=progress
fi
echo -e "${GREEN}✓ Fichier créé${NC}"

# Définir les permissions
echo -e "${YELLOW}[2/4] Configuration des permissions...${NC}"
sudo chmod 600 /swapfile
echo -e "${GREEN}✓ Permissions configurées${NC}"

# Formater en swap
echo -e "${YELLOW}[3/4] Formatage en swap...${NC}"
sudo mkswap /swapfile
echo -e "${GREEN}✓ Swap formaté${NC}"

# Activer le swap
echo -e "${YELLOW}[4/4] Activation du swap...${NC}"
sudo swapon /swapfile
echo -e "${GREEN}✓ Swap activé${NC}"

# Rendre le swap permanent
if ! grep -q "/swapfile" /etc/fstab; then
    echo -e "${YELLOW}Configuration pour démarrage automatique...${NC}"
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
    echo -e "${GREEN}✓ Configuration ajoutée à /etc/fstab${NC}"
fi

# Afficher le résultat
echo ""
echo -e "${GREEN}✅ Swap créé avec succès!${NC}"
echo ""
free -h
echo ""
echo "Vous pouvez maintenant relancer l'installation:"
echo "  cd ~/bbyatchv2-master"
echo "  npm install --legacy-peer-deps --no-audit"

