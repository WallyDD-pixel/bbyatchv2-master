#!/bin/bash

echo "🔍 Vérification du statut du site..."
echo ""

# 1. Vérifier PM2
echo "📊 Statut PM2:"
pm2 list
echo ""

# 2. Vérifier les logs récents
echo "📋 Derniers logs (20 lignes):"
pm2 logs bbyatch --lines 20 --nostream
echo ""

# 3. Vérifier le port 3003
echo "🔌 Vérification du port 3003:"
if netstat -tuln 2>/dev/null | grep -q ":3003"; then
    echo "✅ Le port 3003 est ouvert"
    netstat -tuln | grep ":3003"
else
    echo "❌ Le port 3003 n'est pas ouvert"
fi
echo ""

# 4. Tester l'endpoint local
echo "🌐 Test de l'endpoint local (http://localhost:3003):"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 http://localhost:3003 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "301" ] || [ "$HTTP_CODE" = "302" ]; then
    echo "✅ Le site répond (HTTP $HTTP_CODE)"
    echo "   Test de la page d'accueil:"
    curl -s -I http://localhost:3003 | head -5
else
    echo "❌ Le site ne répond pas (HTTP $HTTP_CODE)"
    echo "   Vérifiez les logs d'erreur:"
    echo "   pm2 logs bbyatch --err --lines 30"
fi
echo ""

# 5. Vérifier la mémoire
echo "💾 Utilisation mémoire:"
free -h
echo ""

# 6. Vérifier les processus Node
echo "🔄 Processus Node.js:"
ps aux | grep -E "node|next" | grep -v grep | head -5
echo ""

echo "✅ Vérification terminée"
