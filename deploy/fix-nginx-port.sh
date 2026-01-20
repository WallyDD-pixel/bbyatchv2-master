#!/bin/bash

# Script pour corriger le port Nginx (3000 -> 3010)
# Usage: bash deploy/fix-nginx-port.sh

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "🔧 Correction de la configuration Nginx..."

# Vérifier que le fichier de configuration existe
CONFIG_FILE="/etc/nginx/sites-available/bbyatchv2-preprod"

if [ ! -f "$CONFIG_FILE" ]; then
    echo -e "${RED}✗ Fichier de configuration non trouvé: $CONFIG_FILE${NC}"
    exit 1
fi

# Sauvegarder la configuration actuelle
echo -e "${YELLOW}[1/4] Sauvegarde de la configuration actuelle...${NC}"
sudo cp "$CONFIG_FILE" "${CONFIG_FILE}.backup.$(date +%Y%m%d_%H%M%S)"
echo -e "${GREEN}✓ Sauvegarde créée${NC}"

# Remplacer le port 3000 par 3010 dans la configuration
echo -e "${YELLOW}[2/4] Remplacement du port 3000 par 3010...${NC}"
sudo sed -i 's|proxy_pass http://127.0.0.1:3000|proxy_pass http://127.0.0.1:3010|g' "$CONFIG_FILE"
sudo sed -i 's|proxy_pass http://localhost:3000|proxy_pass http://127.0.0.1:3010|g' "$CONFIG_FILE"

# Vérifier les changements
if grep -q "127.0.0.1:3010" "$CONFIG_FILE"; then
    echo -e "${GREEN}✓ Port corrigé à 3010${NC}"
else
    echo -e "${RED}✗ Erreur lors du remplacement${NC}"
    exit 1
fi

# Vérifier qu'il n'y a plus de référence au port 3000
if grep -q "127.0.0.1:3000" "$CONFIG_FILE"; then
    echo -e "${YELLOW}⚠ Il reste des références au port 3000${NC}"
    grep "127.0.0.1:3000" "$CONFIG_FILE"
fi

# Tester la configuration
echo -e "${YELLOW}[3/4] Test de la configuration Nginx...${NC}"
if sudo nginx -t; then
    echo -e "${GREEN}✓ Configuration valide${NC}"
else
    echo -e "${RED}✗ Erreur dans la configuration${NC}"
    echo "Restauration de la sauvegarde..."
    sudo cp "${CONFIG_FILE}.backup."* "$CONFIG_FILE" 2>/dev/null || true
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
echo -e "${GREEN}✅ Configuration Nginx corrigée !${NC}"
echo ""
echo "Vérification:"
echo "  - Port configuré: 3010"
echo "  - Application écoute sur: 3010"
echo ""
echo "Testez maintenant: https://preprod.bbservicescharter.com"
