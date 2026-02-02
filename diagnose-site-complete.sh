#!/bin/bash

echo "🔍 Diagnostic complet du site"
echo "============================="
echo ""

# Couleurs
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 1. Vérifier PM2
echo "1️⃣ Application Next.js:"
pm2 list
echo ""

# 2. Vérifier que Next.js répond
echo "2️⃣ Test Next.js (port 3003):"
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3003 | grep -q "200\|301\|302"; then
    echo -e "   ${GREEN}✅ Next.js répond${NC}"
else
    echo -e "   ${RED}❌ Next.js ne répond pas${NC}"
fi
echo ""

# 3. Vérifier nginx
echo "3️⃣ Nginx:"
if systemctl is-active nginx &>/dev/null; then
    echo -e "   ${GREEN}✅ Nginx actif${NC}"
else
    echo -e "   ${RED}❌ Nginx inactif${NC}"
fi

echo "   Test nginx (port 80):"
if curl -s -o /dev/null -w "%{http_code}" http://localhost:80 | grep -q "200\|301\|302"; then
    echo -e "   ${GREEN}✅ Nginx répond${NC}"
else
    echo -e "   ${RED}❌ Nginx ne répond pas${NC}"
fi
echo ""

# 4. Vérifier les ports
echo "4️⃣ Ports en écoute:"
echo "   Port 3003 (Next.js):"
sudo netstat -tlnp 2>/dev/null | grep :3003 || echo "   ❌ Port 3003 non ouvert"
echo "   Port 80 (nginx):"
sudo netstat -tlnp 2>/dev/null | grep :80 || echo "   ❌ Port 80 non ouvert"
echo ""

# 5. Vérifier iptables
echo "5️⃣ Pare-feu iptables:"
HTTP_RULE=$(sudo iptables -L -n -v | grep "dpt:80" | grep ACCEPT || echo "")
if [ -n "$HTTP_RULE" ]; then
    echo -e "   ${GREEN}✅ Règle HTTP (80) présente${NC}"
else
    echo -e "   ${RED}❌ Règle HTTP (80) manquante${NC}"
    echo "   Ajout de la règle..."
    sudo iptables -I INPUT -p tcp --dport 80 -j ACCEPT
    sudo iptables -I INPUT -p tcp --dport 443 -j ACCEPT
    sudo service iptables save 2>/dev/null || sudo iptables-save | sudo tee /etc/sysconfig/iptables
    echo -e "   ${GREEN}✅ Règles ajoutées${NC}"
fi
echo ""

# 6. Obtenir l'IP publique
echo "6️⃣ IP publique de l'instance:"
PUBLIC_IP=$(curl -s http://checkip.amazonaws.com 2>/dev/null || curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo "Non disponible")
echo "   IP: $PUBLIC_IP"
echo ""

# 7. Vérifier le DNS
echo "7️⃣ DNS:"
DNS_IP=$(nslookup preprod.bbservicescharter.com 2>/dev/null | grep "Address:" | tail -1 | awk '{print $2}' || echo "")
echo "   DNS pointe vers: $DNS_IP"
if [ "$PUBLIC_IP" != "Non disponible" ] && [ "$DNS_IP" = "$PUBLIC_IP" ]; then
    echo -e "   ${GREEN}✅ DNS correct${NC}"
elif [ "$PUBLIC_IP" != "Non disponible" ] && [ "$DNS_IP" != "$PUBLIC_IP" ]; then
    echo -e "   ${YELLOW}⚠️  DNS pointe vers une autre IP ($DNS_IP au lieu de $PUBLIC_IP)${NC}"
else
    echo -e "   ${YELLOW}⚠️  Impossible de vérifier${NC}"
fi
echo ""

# 8. Test de connectivité
echo "8️⃣ Test de connectivité depuis le serveur:"
echo "   Test avec l'IP publique:"
if [ "$PUBLIC_IP" != "Non disponible" ]; then
    curl -s -o /dev/null -w "   Status: %{http_code}\n" --max-time 5 http://$PUBLIC_IP || echo "   ❌ Timeout ou erreur"
else
    echo "   ⚠️  IP publique non disponible"
fi
echo ""

# 9. Résumé et actions
echo "============================="
echo -e "${YELLOW}📋 Actions à vérifier dans AWS:${NC}"
echo ""
echo "1. Security Groups:"
echo "   - HTTP (80) depuis 0.0.0.0/0 ✅"
echo "   - HTTPS (443) depuis 0.0.0.0/0 ✅"
echo ""
echo "2. Network ACLs (VPC > Network ACLs):"
echo "   - Vérifiez que HTTP (80) est ALLOW depuis 0.0.0.0/0"
echo "   - C'est souvent la cause du problème !"
echo ""
echo "3. Sous-réseau:"
echo "   - Auto-assign public IPv4 doit être activé"
echo ""
echo "4. Test depuis votre machine:"
echo "   http://$PUBLIC_IP"
echo "   http://preprod.bbservicescharter.com"
echo ""
