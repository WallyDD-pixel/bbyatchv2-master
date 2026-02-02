#!/bin/bash

echo "🔧 Correction rapide des problèmes de site"
echo "=========================================="
echo ""

# Couleurs
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# 1. Redémarrer PM2
echo "1️⃣ Redémarrage de l'application PM2..."
pm2 restart bbyatch
sleep 3
pm2 list
echo ""

# 2. Vérifier et redémarrer nginx
echo "2️⃣ Vérification de nginx..."
if ! systemctl is-active nginx &>/dev/null; then
    echo "   Démarrage de nginx..."
    sudo systemctl start nginx
    sudo systemctl enable nginx
fi

# Redémarrer nginx
sudo systemctl restart nginx
sleep 2

if systemctl is-active nginx &>/dev/null; then
    echo -e "   ${GREEN}✅ Nginx est actif${NC}"
else
    echo -e "   ${RED}❌ Problème avec nginx${NC}"
    echo "   Vérifiez la configuration: sudo nginx -t"
fi
echo ""

# 3. Vérifier les ports
echo "3️⃣ Vérification des ports..."
echo "   Port 3000 (Next.js):"
if sudo netstat -tlnp 2>/dev/null | grep -q ":3000" || sudo ss -tlnp 2>/dev/null | grep -q ":3000"; then
    echo -e "   ${GREEN}✅ Port 3000 en écoute${NC}"
else
    echo -e "   ${RED}❌ Port 3000 non accessible${NC}"
    echo "   L'application Next.js ne semble pas écouter"
fi

echo "   Port 80 (nginx):"
if sudo netstat -tlnp 2>/dev/null | grep -q ":80" || sudo ss -tlnp 2>/dev/null | grep -q ":80"; then
    echo -e "   ${GREEN}✅ Port 80 en écoute${NC}"
else
    echo -e "   ${RED}❌ Port 80 non accessible${NC}"
fi
echo ""

# 4. Vérifier le pare-feu local
echo "4️⃣ Vérification du pare-feu iptables..."
HTTP_RULE=$(sudo iptables -L -n -v | grep "dpt:80" | grep ACCEPT || true)
HTTPS_RULE=$(sudo iptables -L -n -v | grep "dpt:443" | grep ACCEPT || true)

if [ -z "$HTTP_RULE" ]; then
    echo "   Ajout de la règle pour HTTP (port 80)..."
    sudo iptables -I INPUT -p tcp --dport 80 -j ACCEPT
    echo -e "   ${GREEN}✅ Règle HTTP ajoutée${NC}"
fi

if [ -z "$HTTPS_RULE" ]; then
    echo "   Ajout de la règle pour HTTPS (port 443)..."
    sudo iptables -I INPUT -p tcp --dport 443 -j ACCEPT
    echo -e "   ${GREEN}✅ Règle HTTPS ajoutée${NC}"
fi

# Sauvegarder les règles
sudo service iptables save 2>/dev/null || sudo iptables-save > /etc/sysconfig/iptables 2>/dev/null || true
echo ""

# 5. Test local
echo "5️⃣ Test de connexion locale..."
echo "   Test Next.js (port 3000):"
curl -s -o /dev/null -w "   Status: %{http_code}\n" http://localhost:3000 || echo "   ❌ Échec"
echo ""

echo "   Test nginx (port 80):"
curl -s -o /dev/null -w "   Status: %{http_code}\n" http://localhost:80 || echo "   ❌ Échec"
echo ""

# 6. Résumé
echo "========================================"
echo -e "${GREEN}✅ Corrections appliquées${NC}"
echo ""
echo "📋 Vérifications supplémentaires:"
echo "   1. Vérifiez les logs PM2: pm2 logs bbyatch --lines 50"
echo "   2. Vérifiez les logs nginx: sudo tail -20 /var/log/nginx/error.log"
echo "   3. Vérifiez les Security Groups AWS (ports 80 et 443 doivent être ouverts)"
echo "   4. Testez depuis l'extérieur: curl http://VOTRE_DOMAINE"
echo ""
