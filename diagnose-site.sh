#!/bin/bash

echo "🔍 Diagnostic de l'accessibilité du site"
echo "========================================"
echo ""

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 1. Vérifier PM2
echo -e "${BLUE}1️⃣ État de PM2...${NC}"
pm2 list
echo ""

# 2. Vérifier les logs PM2
echo -e "${BLUE}2️⃣ Dernières erreurs dans les logs PM2...${NC}"
pm2 logs --lines 20 --nostream --err 2>/dev/null | tail -10 || echo "   Aucun log d'erreur récent"
echo ""

# 3. Vérifier si Next.js écoute sur le port
echo -e "${BLUE}3️⃣ Vérification des ports en écoute...${NC}"
echo "   Ports ouverts:"
sudo netstat -tlnp 2>/dev/null | grep -E ":(3000|80|443)" || sudo ss -tlnp | grep -E ":(3000|80|443)"
echo ""

# 4. Vérifier nginx
echo -e "${BLUE}4️⃣ État de nginx...${NC}"
if systemctl is-active nginx &>/dev/null; then
    echo -e "   ${GREEN}✅ Nginx est actif${NC}"
    systemctl status nginx --no-pager -l | head -10
else
    echo -e "   ${RED}❌ Nginx n'est pas actif${NC}"
    echo "   Tentative de démarrage..."
    sudo systemctl start nginx 2>/dev/null && echo -e "   ${GREEN}✅ Nginx démarré${NC}" || echo -e "   ${RED}❌ Impossible de démarrer nginx${NC}"
fi
echo ""

# 5. Vérifier la configuration nginx
echo -e "${BLUE}5️⃣ Vérification de la configuration nginx...${NC}"
NGINX_CONFIG="/etc/nginx/sites-enabled/bbyatchv2"
if [ ! -f "$NGINX_CONFIG" ]; then
    NGINX_CONFIG="/etc/nginx/sites-available/bbyatchv2"
fi

if [ -f "$NGINX_CONFIG" ]; then
    echo "   Fichier de configuration: $NGINX_CONFIG"
    echo "   Configuration:"
    grep -E "(server_name|listen|proxy_pass|location)" "$NGINX_CONFIG" | sed 's/^/      /'
    
    # Vérifier la syntaxe
    echo ""
    echo "   Vérification de la syntaxe:"
    sudo nginx -t 2>&1 | sed 's/^/      /'
else
    echo -e "   ${RED}❌ Fichier de configuration nginx non trouvé${NC}"
    echo "   Fichiers disponibles:"
    ls -la /etc/nginx/sites-enabled/ 2>/dev/null | sed 's/^/      /' || echo "      Aucun fichier dans sites-enabled"
fi
echo ""

# 6. Vérifier les logs nginx
echo -e "${BLUE}6️⃣ Dernières erreurs dans les logs nginx...${NC}"
if [ -f /var/log/nginx/error.log ]; then
    echo "   Dernières 10 lignes d'erreur:"
    sudo tail -10 /var/log/nginx/error.log | sed 's/^/      /'
else
    echo "   Fichier de log d'erreur non trouvé"
fi
echo ""

# 7. Tester la connexion locale
echo -e "${BLUE}7️⃣ Test de connexion locale...${NC}"
echo "   Test sur localhost:3000 (Next.js):"
curl -s -o /dev/null -w "   Status: %{http_code}\n" http://localhost:3000 || echo "   ❌ Impossible de se connecter au port 3000"
echo ""

echo "   Test sur localhost:80 (nginx):"
curl -s -o /dev/null -w "   Status: %{http_code}\n" http://localhost:80 || echo "   ❌ Impossible de se connecter au port 80"
echo ""

# 8. Vérifier le pare-feu
echo -e "${BLUE}8️⃣ Vérification du pare-feu...${NC}"
echo "   Règles pour HTTP (port 80):"
sudo iptables -L -n -v | grep "dpt:80" | sed 's/^/      /' || echo "      Aucune règle trouvée"
echo ""
echo "   Règles pour HTTPS (port 443):"
sudo iptables -L -n -v | grep "dpt:443" | sed 's/^/      /' || echo "      Aucune règle trouvée"
echo ""

# 9. Vérifier les Security Groups AWS (via métadonnées)
echo -e "${BLUE}9️⃣ Rappel sur les Security Groups AWS...${NC}"
echo "   ⚠️  Vérifiez dans la console AWS que les ports 80 et 443 sont ouverts"
echo "   EC2 > Security Groups > Votre groupe > Inbound rules"
echo "   Doit avoir:"
echo "      - HTTP (80) depuis 0.0.0.0/0 (pour tout le monde)"
echo "      - HTTPS (443) depuis 0.0.0.0/0 (pour tout le monde)"
echo "      - SSH (22) uniquement depuis votre IP (90.90.82.243)"
echo ""

# 10. Résumé et recommandations
echo "========================================"
echo -e "${YELLOW}📋 Actions à vérifier:${NC}"
echo ""
echo "   1. Vérifiez que Next.js fonctionne: pm2 logs bbyatch"
echo "   2. Vérifiez que nginx est actif: sudo systemctl status nginx"
echo "   3. Vérifiez les Security Groups AWS (ports 80 et 443 ouverts)"
echo "   4. Testez depuis l'extérieur: curl http://VOTRE_DOMAINE"
echo ""
