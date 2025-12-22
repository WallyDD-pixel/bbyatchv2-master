#!/bin/bash

# Script pour configurer Nginx correctement
# Usage: bash deploy/fix-nginx-config.sh

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}🔧 Configuration de Nginx...${NC}"

cd ~/bbyatchv2-master || exit 1

# Vérifier que le fichier de configuration existe
if [ ! -f "deploy/nginx-preprod.conf" ]; then
    echo -e "${RED}✗ Fichier deploy/nginx-preprod.conf introuvable${NC}"
    exit 1
fi

# Copier la configuration
NGINX_CONFIG="/etc/nginx/sites-available/bbyatchv2-preprod"
echo "Copie de la configuration Nginx..."
sudo cp deploy/nginx-preprod.conf "$NGINX_CONFIG"
echo -e "${GREEN}✓ Configuration copiée${NC}"

# Créer le lien symbolique
echo "Activation du site..."
sudo ln -sf "$NGINX_CONFIG" /etc/nginx/sites-enabled/bbyatchv2-preprod
echo -e "${GREEN}✓ Site activé${NC}"

# Supprimer la configuration par défaut si elle existe
if [ -f /etc/nginx/sites-enabled/default ]; then
    echo "Suppression de la configuration par défaut..."
    sudo rm /etc/nginx/sites-enabled/default
fi

# Tester la configuration
echo "Test de la configuration Nginx..."
if sudo nginx -t; then
    echo -e "${GREEN}✓ Configuration valide${NC}"
else
    echo -e "${RED}✗ Erreur dans la configuration Nginx${NC}"
    exit 1
fi

# Recharger Nginx
echo "Rechargement de Nginx..."
sudo systemctl reload nginx

# Vérifier que Nginx est actif
if sudo systemctl is-active --quiet nginx; then
    echo -e "${GREEN}✓ Nginx est actif${NC}"
else
    echo -e "${YELLOW}⚠ Démarrage de Nginx...${NC}"
    sudo systemctl start nginx
fi

echo ""
echo -e "${GREEN}✅ Nginx configuré!${NC}"
echo ""
echo "Vérifications:"
echo "  - Configuration: $NGINX_CONFIG"
echo "  - Site activé: /etc/nginx/sites-enabled/bbyatchv2-preprod"
echo ""
echo "Testez maintenant:"
echo "  curl http://localhost"
echo "  curl https://preprod.bbservicescharter.com"



