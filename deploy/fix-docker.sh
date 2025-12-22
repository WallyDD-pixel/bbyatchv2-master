#!/bin/bash

# Script pour diagnostiquer et réparer Docker
# Usage: bash deploy/fix-docker.sh

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}🔧 Diagnostic et réparation de Docker...${NC}"

# Vérifier si Docker est installé
if ! command -v docker &> /dev/null; then
    echo -e "${RED}✗ Docker n'est pas installé${NC}"
    echo "Installation de Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    echo -e "${GREEN}✓ Docker installé${NC}"
    echo -e "${YELLOW}⚠ Vous devrez vous déconnecter/reconnecter pour que les permissions prennent effet${NC}"
    exit 0
fi

# Vérifier les permissions
if ! groups | grep -q docker; then
    echo -e "${YELLOW}⚠ L'utilisateur n'est pas dans le groupe docker${NC}"
    echo "Ajout de l'utilisateur au groupe docker..."
    sudo usermod -aG docker $USER
    echo -e "${GREEN}✓ Utilisateur ajouté au groupe docker${NC}"
    echo -e "${YELLOW}⚠ Vous devrez vous déconnecter/reconnecter pour que les permissions prennent effet${NC}"
    echo "Ou utilisez: newgrp docker"
fi

# Vérifier le statut de Docker
echo -e "${YELLOW}[1/4] Vérification du statut Docker...${NC}"
if sudo systemctl status docker > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Docker service existe${NC}"
else
    echo -e "${RED}✗ Docker service n'existe pas${NC}"
    exit 1
fi

# Voir les erreurs Docker
echo -e "${YELLOW}[2/4] Vérification des erreurs Docker...${NC}"
sudo systemctl status docker --no-pager -l || true
echo ""

# Voir les logs Docker
echo -e "${YELLOW}[3/4] Dernières erreurs Docker...${NC}"
sudo journalctl -xeu docker.service --no-pager -n 20 || true
echo ""

# Essayer de démarrer Docker
echo -e "${YELLOW}[4/4] Tentative de démarrage de Docker...${NC}"
if sudo systemctl start docker; then
    sleep 2
    if docker info > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Docker démarré avec succès${NC}"
    else
        echo -e "${RED}✗ Docker ne répond toujours pas${NC}"
        echo ""
        echo "Solutions possibles:"
        echo "  1. Vérifier les logs: sudo journalctl -xeu docker.service"
        echo "  2. Réinstaller Docker: curl -fsSL https://get.docker.com | sudo sh"
        echo "  3. Vérifier l'espace disque: df -h"
        exit 1
    fi
else
    echo -e "${RED}✗ Impossible de démarrer Docker${NC}"
    echo ""
    echo "Vérifiez les erreurs ci-dessus et essayez:"
    echo "  sudo journalctl -xeu docker.service"
    exit 1
fi

# Vérifier docker-compose
echo ""
echo -e "${YELLOW}Vérification de docker-compose...${NC}"
if docker compose version > /dev/null 2>&1; then
    echo -e "${GREEN}✓ docker compose (nouvelle syntaxe) disponible${NC}"
    docker compose version
elif command -v docker-compose &> /dev/null; then
    echo -e "${GREEN}✓ docker-compose (ancienne syntaxe) disponible${NC}"
    docker-compose --version
else
    echo -e "${YELLOW}⚠ docker-compose n'est pas disponible${NC}"
    echo "Installation de docker-compose..."
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    echo -e "${GREEN}✓ docker-compose installé${NC}"
fi

echo ""
echo -e "${GREEN}✅ Docker est prêt!${NC}"
echo ""
echo "Test:"
echo "  docker ps"
echo "  docker info"

