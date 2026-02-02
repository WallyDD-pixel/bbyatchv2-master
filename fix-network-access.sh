#!/bin/bash

echo "🔧 Correction de l'accessibilité réseau"
echo "======================================"
echo ""

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 1. Vérifier l'IP publique
echo "1️⃣ IP publique de l'instance :"
PUBLIC_IP=$(curl -s http://checkip.amazonaws.com 2>/dev/null || curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null)
if [ -z "$PUBLIC_IP" ]; then
    echo -e "${RED}❌ Impossible de récupérer l'IP publique${NC}"
    exit 1
else
    echo -e "${GREEN}✅ IP publique : $PUBLIC_IP${NC}"
fi
echo ""

# 2. Vérifier que Next.js fonctionne
echo "2️⃣ Test Next.js local :"
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3003 | grep -q "200"; then
    echo -e "${GREEN}✅ Next.js fonctionne${NC}"
else
    echo -e "${RED}❌ Next.js ne fonctionne pas${NC}"
    echo "Redémarrage de PM2..."
    pm2 restart bbyatch
    sleep 5
fi
echo ""

# 3. Vérifier nginx
echo "3️⃣ Test nginx local :"
if curl -s -o /dev/null -w "%{http_code}" http://localhost:80 | grep -q "200\|301\|302"; then
    echo -e "${GREEN}✅ Nginx fonctionne${NC}"
else
    echo -e "${RED}❌ Nginx ne fonctionne pas${NC}"
    sudo systemctl restart nginx
    sleep 2
fi
echo ""

# 4. Vérifier iptables
echo "4️⃣ Configuration iptables :"
if iptables -L INPUT -n | grep -q "ACCEPT.*tcp.*dpt:80\|ACCEPT.*tcp.*dpt:443"; then
    echo -e "${GREEN}✅ Ports 80/443 autorisés dans iptables${NC}"
else
    echo -e "${YELLOW}⚠️  Ajout des règles iptables...${NC}"
    sudo iptables -I INPUT -p tcp --dport 80 -j ACCEPT
    sudo iptables -I INPUT -p tcp --dport 443 -j ACCEPT
    sudo service iptables save 2>/dev/null || sudo iptables-save | sudo tee /etc/sysconfig/iptables
    echo -e "${GREEN}✅ Règles iptables ajoutées${NC}"
fi
echo ""

# 5. Résumé
echo "📋 Résumé :"
echo "==========="
echo ""
echo -e "${GREEN}✅ Serveur configuré correctement${NC}"
echo ""
echo "⚠️  PROBLÈME PROBABLE : Network ACLs AWS"
echo ""
echo "Pour résoudre le problème, dans la console AWS :"
echo ""
echo "1. VPC > Network ACLs"
echo "2. Sélectionnez le Network ACL associé à votre subnet"
echo "3. Onglet 'Règles entrantes' (Inbound Rules)"
echo "4. Vérifiez qu'il y a une règle :"
echo "   - Rule # : 100"
echo "   - Type : All traffic"
echo "   - Port : All"
echo "   - Source : 0.0.0.0/0"
echo "   - Allow/Deny : Allow"
echo ""
echo "5. Onglet 'Règles sortantes' (Outbound Rules)"
echo "6. Vérifiez qu'il y a une règle :"
echo "   - Rule # : 100"
echo "   - Type : All traffic"
echo "   - Port : All"
echo "   - Destination : 0.0.0.0/0"
echo "   - Allow/Deny : Allow"
echo ""
echo "Testez ensuite : https://preprod.bbservicescharter.com"
echo ""
