#!/bin/bash

# Script de diagnostic pour vérifier pourquoi le site n'est pas accessible
# Usage: bash deploy/diagnostic-site.sh

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}🔍 Diagnostic du site...${NC}"

cd ~/bbyatchv2-master || exit 1

# 1. Vérifier PM2
echo -e "${YELLOW}[1/6] Vérification de PM2...${NC}"
pm2 status
if pm2 list | grep -q "bbyatchv2-preprod.*online"; then
    echo -e "${GREEN}✓ PM2 est en ligne${NC}"
else
    echo -e "${RED}✗ PM2 n'est pas en ligne${NC}"
    echo "Logs PM2:"
    pm2 logs bbyatchv2-preprod --lines 20 --nostream
fi

# 2. Vérifier les logs PM2
echo -e "${YELLOW}[2/6] Derniers logs PM2...${NC}"
pm2 logs bbyatchv2-preprod --lines 30 --nostream

# 3. Vérifier si l'application écoute sur le port 3010
echo -e "${YELLOW}[3/6] Vérification du port 3010...${NC}"
if lsof -ti:3010 &> /dev/null; then
    echo -e "${GREEN}✓ Port 3010 est utilisé${NC}"
    lsof -i:3010
else
    echo -e "${RED}✗ Port 3010 n'est pas utilisé${NC}"
fi

# 4. Tester l'application localement
echo -e "${YELLOW}[4/6] Test de l'application sur localhost:3010...${NC}"
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3010 | grep -q "200\|301\|302"; then
    echo -e "${GREEN}✓ Application répond sur localhost:3010${NC}"
    curl -I http://localhost:3010 2>/dev/null | head -5
else
    echo -e "${RED}✗ Application ne répond pas sur localhost:3010${NC}"
    echo "Tentative de curl:"
    curl -v http://localhost:3010 2>&1 | head -10
fi

# 5. Vérifier Nginx
echo -e "${YELLOW}[5/6] Vérification de Nginx...${NC}"
if systemctl is-active --quiet nginx; then
    echo -e "${GREEN}✓ Nginx est actif${NC}"
    sudo nginx -t 2>&1
    echo ""
    echo "Configuration Nginx pour bbyatchv2:"
    if [ -L /etc/nginx/sites-enabled/bbyatchv2-preprod ] || [ -L /etc/nginx/sites-enabled/bbyatchv2 ]; then
        echo -e "${GREEN}✓ Configuration Nginx trouvée${NC}"
        ls -la /etc/nginx/sites-enabled/ | grep bbyatch
    else
        echo -e "${RED}✗ Configuration Nginx non trouvée${NC}"
    fi
else
    echo -e "${RED}✗ Nginx n'est pas actif${NC}"
fi

# 6. Vérifier depuis l'extérieur
echo -e "${YELLOW}[6/6] Test depuis l'extérieur...${NC}"
PUBLIC_IP=$(curl -s ifconfig.me || curl -s ipinfo.io/ip)
echo "IP publique: $PUBLIC_IP"
if curl -s -o /dev/null -w "%{http_code}" https://preprod.bbservicescharter.com | grep -q "200\|301\|302"; then
    echo -e "${GREEN}✓ Site accessible depuis l'extérieur${NC}"
    curl -I https://preprod.bbservicescharter.com 2>/dev/null | head -5
else
    echo -e "${YELLOW}⚠ Site non accessible depuis l'extérieur${NC}"
    echo "Vérification HTTP:"
    curl -I http://preprod.bbservicescharter.com 2>/dev/null | head -5 || echo "HTTP non accessible"
    echo "Vérification HTTPS:"
    curl -I https://preprod.bbservicescharter.com 2>/dev/null | head -5 || echo "HTTPS non accessible"
fi

echo ""
echo -e "${GREEN}✅ Diagnostic terminé${NC}"
echo ""
echo "Actions recommandées:"
echo "  1. Si PM2 n'est pas en ligne: pm2 restart bbyatchv2-preprod"
echo "  2. Si le port 3010 n'est pas utilisé: vérifier les logs PM2"
echo "  3. Si Nginx n'est pas configuré: configurer Nginx"
echo "  4. Si l'application ne répond pas: vérifier les variables d'environnement (.env)"
