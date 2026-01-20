#!/bin/bash

# Script pour mettre à jour la configuration Nginx avec le bon port
# Usage: bash deploy/update-nginx-config.sh

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "🔧 Mise à jour de la configuration Nginx..."

# Vérifier que nous sommes dans le bon répertoire
if [ ! -f "deploy/nginx-preprod.conf" ]; then
    echo -e "${RED}✗ Fichier deploy/nginx-preprod.conf non trouvé${NC}"
    echo "Assurez-vous d'être dans le répertoire du projet"
    exit 1
fi

# Fichiers de configuration
SOURCE_FILE="deploy/nginx-preprod.conf"
TARGET_FILE="/etc/nginx/sites-available/bbyatchv2-preprod"

# Sauvegarder la configuration actuelle
echo -e "${YELLOW}[1/4] Sauvegarde de la configuration actuelle...${NC}"
if [ -f "$TARGET_FILE" ]; then
    sudo cp "$TARGET_FILE" "${TARGET_FILE}.backup.$(date +%Y%m%d_%H%M%S)"
    echo -e "${GREEN}✓ Sauvegarde créée${NC}"
fi

# Copier la nouvelle configuration
echo -e "${YELLOW}[2/4] Copie de la nouvelle configuration...${NC}"
sudo cp "$SOURCE_FILE" "$TARGET_FILE"
echo -e "${GREEN}✓ Configuration copiée${NC}"

# Vérifier que le fichier est bien lié
if [ ! -L "/etc/nginx/sites-enabled/bbyatchv2-preprod" ]; then
    echo -e "${YELLOW}[2.5/4] Création du lien symbolique...${NC}"
    sudo ln -s "$TARGET_FILE" /etc/nginx/sites-enabled/bbyatchv2-preprod
    echo -e "${GREEN}✓ Lien créé${NC}"
fi

# Tester la configuration
echo -e "${YELLOW}[3/4] Test de la configuration Nginx...${NC}"
if sudo nginx -t; then
    echo -e "${GREEN}✓ Configuration valide${NC}"
else
    echo -e "${RED}✗ Erreur dans la configuration${NC}"
    echo "Restauration de la sauvegarde..."
    sudo cp "${TARGET_FILE}.backup."* "$TARGET_FILE" 2>/dev/null || true
    exit 1
fi

# Vérifier que le port est correct
if grep -q "127.0.0.1:3010" "$TARGET_FILE"; then
    echo -e "${GREEN}✓ Port configuré: 3010${NC}"
else
    echo -e "${RED}✗ Le port n'est pas correctement configuré${NC}"
    exit 1
fi

# Recharger Nginx
echo -e "${YELLOW}[4/4] Rechargement de Nginx...${NC}"
if sudo systemctl reload nginx; then
    echo -e "${GREEN}✓ Nginx rechargé avec succès${NC}"
else
    echo -e "${RED}✗ Erreur lors du rechargement${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}✅ Configuration Nginx mise à jour !${NC}"
echo ""
echo "Vérification:"
echo "  - Port configuré: 3010"
echo "  - Application écoute sur: 3010"
echo ""
echo "Testez maintenant: https://preprod.bbservicescharter.com"
