#!/bin/bash

# Script de diagnostic complet pour identifier pourquoi le site n'est pas accessible
# Usage: bash deploy/diagnostic-complet.sh

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "=========================================="
echo "🔍 DIAGNOSTIC COMPLET DU SERVEUR"
echo "=========================================="
echo ""

# 1. Vérifier PM2
echo -e "${YELLOW}[1/10] Statut PM2...${NC}"
pm2 status
echo ""

# 2. Vérifier que l'app écoute sur le port 3010
echo -e "${YELLOW}[2/10] Ports en écoute...${NC}"
sudo netstat -tlnp | grep -E ':(80|443|3010)' || echo "Aucun port trouvé"
echo ""

# 3. Test local de l'application
echo -e "${YELLOW}[3/10] Test localhost:3010...${NC}"
if curl -f -s -m 5 http://localhost:3010 > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Application répond sur localhost:3010${NC}"
    curl -s http://localhost:3010 | head -20
else
    echo -e "${RED}✗ Application ne répond PAS sur localhost:3010${NC}"
fi
echo ""

# 4. Vérifier Nginx
echo -e "${YELLOW}[4/10] Statut Nginx...${NC}"
sudo systemctl status nginx --no-pager | head -15
echo ""

# 5. Tester la configuration Nginx
echo -e "${YELLOW}[5/10] Test configuration Nginx...${NC}"
sudo nginx -t
echo ""

# 6. Vérifier les logs Nginx récents
echo -e "${YELLOW}[6/10] Dernières erreurs Nginx...${NC}"
sudo tail -20 /var/log/nginx/error.log
echo ""

# 7. Vérifier les logs PM2
echo -e "${YELLOW}[7/10] Derniers logs PM2 (erreurs)...${NC}"
pm2 logs bbyatchv2-preprod --lines 30 --err --nostream
echo ""

# 8. Vérifier le firewall
echo -e "${YELLOW}[8/10] Statut firewall (UFW)...${NC}"
sudo ufw status verbose
echo ""

# 9. Vérifier les règles de sécurité AWS (EC2)
echo -e "${YELLOW}[9/10] Vérification des groupes de sécurité EC2...${NC}"
echo "⚠️  Vérifiez manuellement dans AWS Console que les ports 80 et 443 sont ouverts"
echo ""

# 10. Test depuis l'extérieur
echo -e "${YELLOW}[10/10] Test depuis l'extérieur...${NC}"
PUBLIC_IP=$(curl -s ifconfig.me || curl -s ipinfo.io/ip)
echo "IP publique: $PUBLIC_IP"
echo "Test HTTP:"
curl -I -m 5 http://$PUBLIC_IP 2>&1 | head -5
echo ""
echo "Test HTTPS:"
curl -I -m 5 https://preprod.bbservicescharter.com 2>&1 | head -5
echo ""

# 11. Vérifier la configuration Nginx
echo -e "${YELLOW}[11/10] Configuration Nginx active...${NC}"
if [ -f /etc/nginx/sites-enabled/bbyatchv2-preprod ]; then
    echo "✓ Fichier de configuration trouvé"
    echo "Contenu (premières lignes):"
    head -20 /etc/nginx/sites-enabled/bbyatchv2-preprod
else
    echo -e "${RED}✗ Fichier de configuration Nginx non trouvé${NC}"
fi
echo ""

# 12. Vérifier les certificats SSL
echo -e "${YELLOW}[12/10] Certificats SSL...${NC}"
if [ -f /etc/letsencrypt/live/preprod.bbservicescharter.com/fullchain.pem ]; then
    echo -e "${GREEN}✓ Certificat SSL trouvé${NC}"
    sudo openssl x509 -in /etc/letsencrypt/live/preprod.bbservicescharter.com/fullchain.pem -noout -dates
else
    echo -e "${RED}✗ Certificat SSL non trouvé${NC}"
fi
echo ""

echo "=========================================="
echo "📋 RÉSUMÉ"
echo "=========================================="
echo ""
echo "Commandes utiles:"
echo "  - Voir les logs PM2: pm2 logs bbyatchv2-preprod"
echo "  - Redémarrer PM2: pm2 restart bbyatchv2-preprod"
echo "  - Redémarrer Nginx: sudo systemctl restart nginx"
echo "  - Voir les logs Nginx: sudo tail -f /var/log/nginx/error.log"
echo "  - Tester localement: curl http://localhost:3010"
echo ""
