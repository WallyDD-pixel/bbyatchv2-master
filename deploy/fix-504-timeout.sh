#!/bin/bash
# Script pour corriger l'erreur 504 Gateway Time-out

set -e

echo "=== CORRECTION 504 GATEWAY TIMEOUT ==="
echo ""

cd ~/bbyatch/bbyatchv2-master

# 1. Arrêter PM2 proprement
echo "1. Arrêt de l'application..."
pm2 stop bbyatch || true
sleep 2

# 2. Vérifier et tuer les processus Node qui traînent
echo "2. Nettoyage des processus Node..."
pkill -9 -f "next-server" || true
pkill -9 -f "node.*3003" || true
sleep 1

# 3. Vérifier que le port 3003 est libre
echo "3. Vérification du port 3003..."
if ss -tlnp | grep -q ":3003"; then
    echo "⚠️ Le port 3003 est encore utilisé, on force la libération..."
    fuser -k 3003/tcp 2>/dev/null || true
    sleep 2
fi

# 4. Augmenter les timeouts Nginx
echo "4. Configuration des timeouts Nginx..."
NGINX_CONFIG="/etc/nginx/sites-enabled/default"
if [ -f "$NGINX_CONFIG" ]; then
    # Backup
    sudo cp "$NGINX_CONFIG" "${NGINX_CONFIG}.backup.$(date +%Y%m%d_%H%M%S)"
    
    # Ajouter ou modifier les timeouts dans la section location /
    if sudo grep -q "proxy_read_timeout" "$NGINX_CONFIG"; then
        echo "⚠️ Timeouts déjà configurés, on les augmente..."
        sudo sed -i 's/proxy_read_timeout [0-9]*s/proxy_read_timeout 300s/g' "$NGINX_CONFIG"
        sudo sed -i 's/proxy_connect_timeout [0-9]*s/proxy_connect_timeout 60s/g' "$NGINX_CONFIG"
        sudo sed -i 's/proxy_send_timeout [0-9]*s/proxy_send_timeout 300s/g' "$NGINX_CONFIG"
    else
        echo "➕ Ajout des timeouts dans la configuration Nginx..."
        # Trouver la section location / et ajouter les timeouts
        sudo sed -i '/location \//a\        proxy_read_timeout 300s;\n        proxy_connect_timeout 60s;\n        proxy_send_timeout 300s;\n        proxy_buffering off;' "$NGINX_CONFIG"
    fi
    
    # Test de la configuration Nginx
    echo "5. Test de la configuration Nginx..."
    if sudo nginx -t; then
        echo "✅ Configuration Nginx valide"
        sudo systemctl reload nginx
        echo "✅ Nginx rechargé"
    else
        echo "❌ Erreur dans la configuration Nginx, restauration du backup..."
        sudo cp "${NGINX_CONFIG}.backup.$(date +%Y%m%d_%H%M%S)" "$NGINX_CONFIG"
        exit 1
    fi
else
    echo "⚠️ Configuration Nginx non trouvée dans $NGINX_CONFIG"
    echo "   Cherche dans /etc/nginx/sites-enabled/..."
    ls -la /etc/nginx/sites-enabled/ 2>/dev/null || echo "❌ Répertoire non trouvé"
fi

# 6. Nettoyer les caches
echo "6. Nettoyage des caches..."
rm -rf .next/cache 2>/dev/null || true
rm -rf node_modules/.cache 2>/dev/null || true

# 7. Vérifier la mémoire disponible
echo "7. Vérification de la mémoire..."
free -h
AVAILABLE_MEM=$(free -m | awk 'NR==2{printf "%.0f", $7}')
if [ "$AVAILABLE_MEM" -lt 200 ]; then
    echo "⚠️ Mémoire disponible faible: ${AVAILABLE_MEM}MB"
    echo "   Nettoyage du swap..."
    sudo swapoff -a 2>/dev/null || true
    sudo swapon -a 2>/dev/null || true
fi

# 8. Redémarrer l'application avec plus de mémoire
echo "8. Redémarrage de l'application..."
export NODE_OPTIONS="--max-old-space-size=2048"
pm2 delete bbyatch 2>/dev/null || true
sleep 2

# 9. Démarrer avec PM2
pm2 start ecosystem.config.cjs
sleep 3

# 10. Vérifier l'état
echo "9. Vérification de l'état..."
pm2 list
sleep 2

# 11. Tester la connexion locale
echo "10. Test de connexion locale..."
for i in {1..5}; do
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:3003 | grep -q "200\|404\|500"; then
        echo "✅ Application répond sur localhost:3003"
        break
    else
        echo "⏳ Tentative $i/5..."
        sleep 2
    fi
done

# 12. Afficher les logs récents
echo ""
echo "=== LOGS RÉCENTS ==="
pm2 logs bbyatch --lines 10 --nostream

echo ""
echo "=== FIN DE LA CORRECTION ==="
echo "Vérifie maintenant si le site fonctionne: https://preprod.bbservicescharter.com"
