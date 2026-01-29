#!/bin/bash
# Correction rapide 502 Bad Gateway

cd ~/bbyatch/bbyatchv2-master

echo "=== DIAGNOSTIC 502 ==="

# 1. Vérifier si l'app tourne
echo "1. État PM2:"
pm2 list

# 2. Vérifier le port
echo ""
echo "2. Port 3003:"
ss -tlnp | grep :3003 || echo "❌ Port 3003 non utilisé"

# 3. Test local
echo ""
echo "3. Test localhost:3003:"
curl -I http://localhost:3003 2>&1 | head -5 || echo "❌ Ne répond pas"

# 4. Vérifier Nginx
echo ""
echo "4. Configuration Nginx:"
sudo grep "proxy_pass" /etc/nginx/sites-enabled/default | grep -v "#" | head -2

# 5. CORRECTION RAPIDE
echo ""
echo "=== CORRECTION ==="
pm2 stop bbyatchv2-preprod 2>/dev/null || true
pkill -9 -f "next-server" 2>/dev/null || true
sleep 2

# Vérifier le port dans package.json
PORT_CHECK=$(grep -o "3003\|3010" package.json | head -1)
echo "Port dans package.json: $PORT_CHECK"

# Redémarrer
export NODE_OPTIONS="--max-old-space-size=2048"
pm2 restart bbyatchv2-preprod || pm2 start ecosystem.config.cjs

sleep 5

# Vérifier
echo ""
echo "=== VÉRIFICATION ==="
pm2 list
ss -tlnp | grep :3003 && echo "✅ Port 3003 OK" || echo "❌ Port 3003 KO"
curl -I http://localhost:3003 2>&1 | head -3

echo ""
echo "Si ça ne fonctionne pas, vérifie:"
echo "  pm2 logs bbyatchv2-preprod --lines 30"
