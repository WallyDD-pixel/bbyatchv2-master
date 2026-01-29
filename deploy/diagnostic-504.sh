#!/bin/bash
# Script de diagnostic pour erreur 504 Gateway Time-out

echo "=== DIAGNOSTIC 504 GATEWAY TIMEOUT ==="
echo ""

echo "1. État PM2:"
pm2 list
echo ""

echo "2. Logs PM2 (dernières 30 lignes):"
pm2 logs bbyatch --lines 30 --nostream
echo ""

echo "3. Vérification du port 3003:"
ss -tlnp | grep :3003 || echo "❌ Aucun processus n'écoute sur le port 3003"
echo ""

echo "4. Test de connexion locale:"
curl -I http://localhost:3003 2>&1 | head -10 || echo "❌ Impossible de se connecter à localhost:3003"
echo ""

echo "5. Vérification des processus Node:"
ps aux | grep -E "node|next" | grep -v grep
echo ""

echo "6. Vérification de la mémoire:"
free -h
echo ""

echo "7. Logs Nginx (dernières 20 lignes):"
sudo tail -20 /var/log/nginx/error.log 2>/dev/null || echo "❌ Impossible de lire les logs Nginx"
echo ""

echo "8. Configuration Nginx (proxy_pass):"
sudo grep -A 5 "proxy_pass" /etc/nginx/sites-enabled/* 2>/dev/null | head -20 || echo "❌ Configuration Nginx non trouvée"
echo ""

echo "9. Vérification du timeout Nginx:"
sudo grep -E "proxy_read_timeout|proxy_connect_timeout|proxy_send_timeout" /etc/nginx/sites-enabled/* 2>/dev/null || echo "⚠️ Timeouts non configurés"
echo ""

echo "10. Vérification des erreurs récentes dans .next:"
ls -lah .next/server 2>/dev/null | head -5 || echo "⚠️ Répertoire .next/server non trouvé"
echo ""

echo "=== FIN DU DIAGNOSTIC ==="
