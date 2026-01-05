#!/bin/bash

# Script pour configurer le domaine preprod.bbservicescharter.com sur le nouveau VPS
# Usage: bash deploy/configurer-domaine.sh [NOUVELLE_IP]

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

DOMAIN="preprod.bbservicescharter.com"
NGINX_CONFIG="/etc/nginx/sites-available/bbyatchv2-preprod"

# Obtenir l'IP publique du serveur
if [ -n "$1" ]; then
    NEW_IP="$1"
else
    echo -e "${YELLOW}Récupération de l'IP publique du serveur...${NC}"
    NEW_IP=$(curl -s ifconfig.me || curl -s ipinfo.io/ip || echo "")
    if [ -z "$NEW_IP" ]; then
        echo -e "${RED}✗ Impossible de récupérer l'IP publique automatiquement${NC}"
        read -p "Entrez l'IP publique du VPS: " NEW_IP
    fi
fi

echo -e "${GREEN}✓ IP publique détectée: $NEW_IP${NC}"
echo ""

# 1. Mettre à jour la configuration Nginx
echo -e "${YELLOW}[1/4] Mise à jour de la configuration Nginx...${NC}"

if [ ! -f "deploy/nginx-preprod.conf" ]; then
    echo -e "${RED}✗ Fichier deploy/nginx-preprod.conf introuvable${NC}"
    exit 1
fi

# Créer une copie temporaire avec la nouvelle IP (remplace toutes les anciennes IPs possibles)
sed -e "s/51.83.134.141/$NEW_IP/g" -e "s/16.171.173.63/$NEW_IP/g" -e "s/51.21.190.241/$NEW_IP/g" -e "s/13.53.121.224/$NEW_IP/g" deploy/nginx-preprod.conf > /tmp/nginx-preprod-new.conf

# Copier la configuration
sudo cp /tmp/nginx-preprod-new.conf "$NGINX_CONFIG"
sudo ln -sf "$NGINX_CONFIG" /etc/nginx/sites-enabled/bbyatchv2-preprod

echo -e "${GREEN}✓ Configuration Nginx mise à jour${NC}"

# 2. Vérifier la configuration Nginx
echo -e "${YELLOW}[2/4] Vérification de la configuration Nginx...${NC}"
if sudo nginx -t; then
    echo -e "${GREEN}✓ Configuration Nginx valide${NC}"
else
    echo -e "${RED}✗ Erreur dans la configuration Nginx${NC}"
    exit 1
fi

# 3. Configurer le certificat SSL avec Let's Encrypt
echo -e "${YELLOW}[3/4] Configuration du certificat SSL...${NC}"

# Vérifier si certbot est installé
if ! command -v certbot &> /dev/null; then
    echo -e "${YELLOW}⚠ Certbot n'est pas installé, installation...${NC}"
    sudo apt update
    sudo apt install -y certbot python3-certbot-nginx
fi

# Vérifier si le certificat existe déjà
if [ -d "/etc/letsencrypt/live/$DOMAIN" ]; then
    echo -e "${YELLOW}⚠ Certificat existant trouvé pour $DOMAIN${NC}"
    read -p "Voulez-vous renouveler le certificat? (oui/non): " -n 3 -r
    echo
    if [[ $REPLY =~ ^[Oo][Uu][Ii]$ ]]; then
        echo "Renouvellement du certificat..."
        sudo certbot renew --cert-name "$DOMAIN" --nginx --non-interactive --agree-tos || \
        sudo certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --redirect
    else
        echo -e "${GREEN}✓ Utilisation du certificat existant${NC}"
    fi
else
    echo "Création d'un nouveau certificat SSL..."
    read -p "Entrez votre email pour Let's Encrypt: " EMAIL
    sudo certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --email "$EMAIL" --redirect
fi

echo -e "${GREEN}✓ Certificat SSL configuré${NC}"

# 4. Recharger Nginx
echo -e "${YELLOW}[4/4] Rechargement de Nginx...${NC}"
sudo systemctl reload nginx
echo -e "${GREEN}✓ Nginx rechargé${NC}"

# Résumé
echo ""
echo -e "${GREEN}✅ Configuration terminée avec succès!${NC}"
echo ""
echo "Résumé:"
echo "  ✓ Configuration Nginx mise à jour avec l'IP: $NEW_IP"
echo "  ✓ Certificat SSL configuré pour: $DOMAIN"
echo "  ✓ Nginx rechargé"
echo ""
echo "⚠️  IMPORTANT: Assurez-vous que l'enregistrement DNS A pointe vers: $NEW_IP"
echo ""
echo "Pour vérifier:"
echo "  - DNS: dig +short $DOMAIN"
echo "  - HTTPS: curl -I https://$DOMAIN"
echo "  - Logs Nginx: sudo tail -f /var/log/nginx/error.log"
echo ""
echo "Si le DNS n'est pas encore propagé, attendez quelques minutes et réessayez."

