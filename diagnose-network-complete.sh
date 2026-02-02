#!/bin/bash

echo "🔍 Diagnostic réseau complet"
echo "============================"
echo ""

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Vérifier l'IP publique
echo "1️⃣ IP publique de l'instance :"
PUBLIC_IP=$(curl -s http://checkip.amazonaws.com 2>/dev/null || curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null)
if [ -z "$PUBLIC_IP" ]; then
    echo -e "${RED}❌ Impossible de récupérer l'IP publique${NC}"
else
    echo -e "${GREEN}✅ IP publique : $PUBLIC_IP${NC}"
fi
echo ""

# 2. Vérifier nginx
echo "2️⃣ État de nginx :"
if systemctl is-active --quiet nginx; then
    echo -e "${GREEN}✅ Nginx est actif${NC}"
else
    echo -e "${RED}❌ Nginx n'est pas actif${NC}"
fi
echo ""

# 3. Vérifier que nginx écoute sur le port 80
echo "3️⃣ Ports en écoute :"
if ss -tlnp | grep -q ":80 "; then
    echo -e "${GREEN}✅ Nginx écoute sur le port 80${NC}"
    ss -tlnp | grep ":80 "
else
    echo -e "${RED}❌ Nginx n'écoute pas sur le port 80${NC}"
fi
echo ""

# 4. Vérifier PM2
echo "4️⃣ État de PM2 :"
if pm2 list | grep -q "online"; then
    echo -e "${GREEN}✅ PM2 fonctionne${NC}"
    pm2 list
else
    echo -e "${RED}❌ PM2 ne fonctionne pas${NC}"
fi
echo ""

# 5. Test local Next.js
echo "5️⃣ Test local Next.js (port 3003) :"
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3003 | grep -q "200"; then
    echo -e "${GREEN}✅ Next.js répond sur le port 3003${NC}"
else
    echo -e "${RED}❌ Next.js ne répond pas sur le port 3003${NC}"
fi
echo ""

# 6. Test local nginx
echo "6️⃣ Test local nginx (port 80) :"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:80)
if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✅ Nginx répond sur le port 80${NC}"
else
    echo -e "${RED}❌ Nginx ne répond pas correctement (code: $HTTP_CODE)${NC}"
fi
echo ""

# 7. Test avec l'IP publique
echo "7️⃣ Test avec l'IP publique ($PUBLIC_IP) :"
if [ ! -z "$PUBLIC_IP" ]; then
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 http://$PUBLIC_IP)
    if [ "$HTTP_CODE" = "200" ]; then
        echo -e "${GREEN}✅ Le site est accessible via l'IP publique${NC}"
    else
        echo -e "${RED}❌ Le site n'est PAS accessible via l'IP publique (code: $HTTP_CODE)${NC}"
        echo -e "${YELLOW}⚠️  Cela indique un problème réseau AWS (Security Groups, Network ACLs, Route Tables)${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Impossible de tester avec l'IP publique${NC}"
fi
echo ""

# 8. Vérifier iptables
echo "8️⃣ Règles iptables INPUT :"
if iptables -L INPUT -n | grep -q "ACCEPT.*tcp.*dpt:80"; then
    echo -e "${GREEN}✅ Port 80 autorisé dans iptables${NC}"
else
    echo -e "${YELLOW}⚠️  Port 80 non trouvé dans iptables (peut être normal si policy ACCEPT)${NC}"
fi
iptables -L INPUT -n -v | head -10
echo ""

# 9. Vérifier le DNS
echo "9️⃣ Résolution DNS :"
DOMAIN="preprod.bbservicescharter.com"
DNS_IP=$(nslookup $DOMAIN 2>/dev/null | grep -A 1 "Name:" | tail -1 | awk '{print $2}')
if [ ! -z "$DNS_IP" ]; then
    echo -e "${GREEN}✅ DNS résolu : $DOMAIN -> $DNS_IP${NC}"
    if [ "$DNS_IP" = "$PUBLIC_IP" ]; then
        echo -e "${GREEN}✅ DNS pointe vers la bonne IP${NC}"
    else
        echo -e "${YELLOW}⚠️  DNS pointe vers $DNS_IP mais l'IP publique est $PUBLIC_IP${NC}"
    fi
else
    echo -e "${RED}❌ Impossible de résoudre le DNS${NC}"
fi
echo ""

# 10. Vérifier la configuration nginx
echo "🔟 Configuration nginx :"
if [ -f /etc/nginx/conf.d/bbyatchv2.conf ]; then
    echo -e "${GREEN}✅ Configuration nginx trouvée${NC}"
    echo "Contenu :"
    cat /etc/nginx/conf.d/bbyatchv2.conf
else
    echo -e "${RED}❌ Configuration nginx non trouvée${NC}"
fi
echo ""

# 11. Résumé et recommandations
echo "📋 Résumé et recommandations :"
echo "=============================="
echo ""
echo "Si le test local fonctionne mais pas depuis l'extérieur :"
echo "1. Vérifiez les Security Groups AWS (règles entrantes pour le port 80)"
echo "2. Vérifiez les Network ACLs AWS (règles entrantes pour le port 80)"
echo "3. Vérifiez les Route Tables (doit avoir une route vers Internet Gateway)"
echo "4. Vérifiez que l'Internet Gateway est attaché au VPC"
echo "5. Vérifiez que le subnet est associé à la route table avec Internet Gateway"
echo ""
echo "Commandes AWS CLI (si installé) :"
echo "  aws ec2 describe-instances --instance-ids <instance-id>"
echo "  aws ec2 describe-security-groups --group-ids <sg-id>"
echo "  aws ec2 describe-network-acls"
echo ""
